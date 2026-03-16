import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import { renderServerRack } from './renderServerRack';
import { renderCard } from './renderCard';
import { renderPlatform } from './renderPlatform';
import { renderBrowser } from './renderBrowser';
import { renderStack } from './renderStack';
import { renderDashboard } from './renderDashboard';
import { renderGauge } from './renderGauge';
import { renderChartPanel } from './renderChartPanel';
import { renderAnalyticsPanel } from './renderAnalyticsPanel';
import { renderBrowser2 } from './renderBrowser2';
import { renderStandingNode } from './renderStandingNode';
import type { CameraState, NodeEntity } from '@/types/document';

export function renderNode(
  ctx: CanvasRenderingContext2D,
  node: NodeEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  // Dispatch to shape-specific renderer
  switch (node.shape) {
    case 'serverRack':
      return renderServerRack(ctx, node, selected, camera, viewport, time, theme);
    case 'card':
      return renderCard(ctx, node, selected, camera, viewport, time, theme);
    case 'standingNode':
      return renderStandingNode(ctx, node, selected, camera, viewport, time, theme);
    case 'platform':
      return renderPlatform(ctx, node, selected, camera, viewport, time, theme);
    case 'browser':
      return renderBrowser(ctx, node, selected, camera, viewport, time, theme);
    case 'browser2':
      return renderBrowser2(ctx, node, selected, camera, viewport, time, theme);
    case 'stack':
      return renderStack(ctx, node, selected, camera, viewport, time, theme);
    case 'dashboard':
      return renderDashboard(ctx, node, selected, camera, viewport, time, theme);
    case 'gauge':
      return renderGauge(ctx, node, selected, camera, viewport, time, theme);
    case 'chartPanel':
      return renderChartPanel(ctx, node, selected, camera, viewport, time, theme);
    case 'analyticsPanel':
        return renderAnalyticsPanel(ctx, node, selected, camera, viewport, time, theme);
    default:
      break; // fall through to box rendering
  }

  // ── Default box rendering ──
  const light = theme === 'light';
  const points = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
  const leftTop = points[0];
  const rightTop = points[1];
  const rightBottom = points[2];
  const leftBottom = points[3];
  const depth = NODE_DEPTH * camera.zoom;
  const leftTopDepth = { x: leftTop.x, y: leftTop.y + depth };
  const frontLeftBottom = { x: leftBottom.x, y: leftBottom.y + depth };
  const frontRightBottom = { x: rightBottom.x, y: rightBottom.y + depth };
  const rightTopDepth = { x: rightTop.x, y: rightTop.y + depth };
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;
  const topEdgeLength = Math.hypot(rightTop.x - leftTop.x, rightTop.y - leftTop.y) || 1;
  const leftEdgeLength = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y) || 1;

  // Scale border widths relative to the node's screen-space size so that
  // small nodes don't appear drowned in thick borders.
  const avgEdge = (topEdgeLength + leftEdgeLength) * 0.5;
  const bScale = Math.min(1, Math.max(0.35, avgEdge / 120));
  const cornerR = Math.min(10, avgEdge * 0.08);

  const topFaceBasisX = {
    x: (rightTop.x - leftTop.x) / topEdgeLength,
    y: (rightTop.y - leftTop.y) / topEdgeLength,
  };
  const topFaceBasisY = {
    x: (leftBottom.x - leftTop.x) / leftEdgeLength,
    y: (leftBottom.y - leftTop.y) / leftEdgeLength,
  };
  const textDirection = node.textRotated ? topFaceBasisX : topFaceBasisY;
  const textStackDirection = node.textRotated
    ? { x: topFaceBasisY.x, y: topFaceBasisY.y }
    : { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  // In light mode, use Tailwind 800-tier colors for solid, rich fills.
  const faceFill = light ? node.glowColor : node.fill;

  // Light-mode palette: 800-level tones with subtle lift for 3D gradients
  const deepTone    = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';  // slightly lifted for highlights
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';  // mid highlight

  if (light) {
    // Drop-shadow behind the entire node for depth
    drawPolygon(ctx, [leftBottom, rightBottom, frontRightBottom, frontLeftBottom]);
    
    
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    
    
    ctx.shadowOffsetY = 0;
  }

  // ── Left side face ── (medium tone)
  drawPolygon(ctx, [leftTop, leftBottom, frontLeftBottom, leftTopDepth]);
  if (light) {
    const gLeft = ctx.createLinearGradient(leftTop.x, leftTop.y, frontLeftBottom.x, frontLeftBottom.y);
    gLeft.addColorStop(0, deepToneMid);
    gLeft.addColorStop(1, deepTone);
    ctx.fillStyle = gLeft;
  } else {
    const gLeft = ctx.createLinearGradient(leftTop.x, leftTop.y, frontLeftBottom.x, frontLeftBottom.y);
    gLeft.addColorStop(0, hexToRgba(node.glowColor, 0.50));
    gLeft.addColorStop(0.5, darkenHex(node.glowColor, 0.40));
    gLeft.addColorStop(1, darkenHex(node.glowColor, 0.60));
    ctx.fillStyle = gLeft;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.35 : 0.20) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Specular highlight on left face
  ctx.beginPath();
  const lfMid1 = { x: leftTop.x * 0.7 + leftBottom.x * 0.3, y: leftTop.y * 0.7 + leftBottom.y * 0.3 };
  const lfMid2 = { x: leftTopDepth.x * 0.3 + frontLeftBottom.x * 0.7, y: leftTopDepth.y * 0.3 + frontLeftBottom.y * 0.7 };
  ctx.moveTo(lfMid1.x, lfMid1.y);
  ctx.lineTo(lfMid2.x, lfMid2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2.5 * bScale;
  ctx.stroke();

  // ── Front face ── (darkest face)
  drawPolygon(ctx, [leftBottom, rightBottom, frontRightBottom, frontLeftBottom]);
  if (light) {
    const gFront = ctx.createLinearGradient(leftBottom.x, leftBottom.y, frontRightBottom.x, frontRightBottom.y);
    gFront.addColorStop(0, deepTone);
    gFront.addColorStop(1, darkenHex(deepTone, 0.8));
    ctx.fillStyle = gFront;
  } else {
    const gFront = ctx.createLinearGradient(leftBottom.x, leftBottom.y, frontRightBottom.x, frontRightBottom.y);
    gFront.addColorStop(0, darkenHex(node.glowColor, 0.45));
    gFront.addColorStop(0.5, darkenHex(node.glowColor, 0.55));
    gFront.addColorStop(1, darkenHex(node.glowColor, 0.70));
    ctx.fillStyle = gFront;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.35 : 0.18) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Specular highlight on front face
  ctx.beginPath();
  const ffMid1 = { x: leftBottom.x * 0.65 + rightBottom.x * 0.35, y: leftBottom.y * 0.65 + rightBottom.y * 0.35 };
  const ffMid2 = { x: frontLeftBottom.x * 0.35 + frontRightBottom.x * 0.65, y: frontLeftBottom.y * 0.35 + frontRightBottom.y * 0.65 };
  ctx.moveTo(ffMid1.x, ffMid1.y);
  ctx.lineTo(ffMid2.x, ffMid2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 3 * bScale;
  ctx.stroke();

  // ── Right side face ── (darker side)
  drawPolygon(ctx, [rightTop, rightBottom, frontRightBottom, rightTopDepth]);
  if (light) {
    const gRight = ctx.createLinearGradient(rightTop.x, rightTop.y, frontRightBottom.x, frontRightBottom.y);
    gRight.addColorStop(0, deepToneMid);
    gRight.addColorStop(1, darkenHex(deepTone, 0.85));
    ctx.fillStyle = gRight;
  } else {
    const gRight = ctx.createLinearGradient(rightTop.x, rightTop.y, frontRightBottom.x, frontRightBottom.y);
    gRight.addColorStop(0, hexToRgba(node.glowColor, 0.35));
    gRight.addColorStop(0.5, darkenHex(node.glowColor, 0.50));
    gRight.addColorStop(1, darkenHex(node.glowColor, 0.65));
    ctx.fillStyle = gRight;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.30 : 0.12) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Top face (main visible face) ── (solid rich gradient — brightest)
  drawPolygon(ctx, points);
  const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
  if (light) {
    gradient.addColorStop(0, deepToneLit);
    gradient.addColorStop(0.5, deepToneMid);
    gradient.addColorStop(1, deepTone);
  } else {
    gradient.addColorStop(0, hexToRgba(node.glowColor, 0.90));
    gradient.addColorStop(0.3, hexToRgba(node.glowColor, 0.60));
    gradient.addColorStop(0.7, darkenHex(node.glowColor, 0.30));
    gradient.addColorStop(1, darkenHex(node.glowColor, 0.50));
  }
  ctx.fillStyle = gradient;
  
  
  ctx.fill();
  

  // Glass specular highlight diagonal on top face
  ctx.beginPath();
  const specStart = {
    x: leftTop.x * 0.6 + rightTop.x * 0.4,
    y: leftTop.y * 0.6 + rightTop.y * 0.4,
  };
  const specEnd = {
    x: leftBottom.x * 0.4 + rightBottom.x * 0.6,
    y: leftBottom.y * 0.4 + rightBottom.y * 0.6,
  };
  ctx.moveTo(specStart.x, specStart.y);
  ctx.lineTo(specEnd.x, specEnd.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4 * bScale;
  ctx.stroke();

  // Second thinner specular line
  ctx.beginPath();
  const spec2Start = {
    x: leftTop.x * 0.45 + rightTop.x * 0.55,
    y: leftTop.y * 0.45 + rightTop.y * 0.55,
  };
  const spec2End = {
    x: leftBottom.x * 0.55 + rightBottom.x * 0.45,
    y: leftBottom.y * 0.55 + rightBottom.y * 0.45,
  };
  ctx.moveTo(spec2Start.x, spec2Start.y);
  ctx.lineTo(spec2End.x, spec2End.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 2 * bScale;
  ctx.stroke();

  // Inner edge glow line near top-left edge of top face
  ctx.beginPath();
  const iegStart = {
    x: leftTop.x + (rightTop.x - leftTop.x) * 0.02 + (leftBottom.x - leftTop.x) * 0.04,
    y: leftTop.y + (rightTop.y - leftTop.y) * 0.02 + (leftBottom.y - leftTop.y) * 0.04,
  };
  const iegEnd = {
    x: leftTop.x + (rightTop.x - leftTop.x) * 0.02 + (leftBottom.x - leftTop.x) * 0.85,
    y: leftTop.y + (rightTop.y - leftTop.y) * 0.02 + (leftBottom.y - leftTop.y) * 0.85,
  };
  ctx.moveTo(iegStart.x, iegStart.y);
  ctx.lineTo(iegEnd.x, iegEnd.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.12);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  drawPolygon(ctx, [leftTop, leftBottom, frontLeftBottom, leftTopDepth]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.48 : 0.34);
  ctx.lineWidth = 1.6 * bScale;
  ctx.stroke();

  drawPolygon(ctx, [leftBottom, rightBottom, frontRightBottom, frontLeftBottom]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.48 : 0.34);
  ctx.lineWidth = 1.6 * bScale;
  ctx.stroke();

  drawPolygon(ctx, [rightTop, rightBottom, frontRightBottom, rightTopDepth]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.42 : 0.3);
  ctx.lineWidth = 1.4 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(rightTop.x, rightTop.y);
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(leftBottom.x, leftBottom.y);
  ctx.moveTo(rightTop.x, rightTop.y);
  ctx.lineTo(rightBottom.x, rightBottom.y);
  ctx.moveTo(leftBottom.x, leftBottom.y);
  ctx.lineTo(frontLeftBottom.x, frontLeftBottom.y);
  ctx.moveTo(frontLeftBottom.x, frontLeftBottom.y);
  ctx.lineTo(frontRightBottom.x, frontRightBottom.y);
  ctx.moveTo(rightBottom.x, rightBottom.y);
  ctx.lineTo(frontRightBottom.x, frontRightBottom.y);
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(rightTop.x, rightTop.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.72);
  ctx.lineWidth = 2.2 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(rightTop.x, rightTop.y);
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(leftBottom.x, leftBottom.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.8 * bScale;
  
  
  ctx.stroke();
  

  ctx.beginPath();
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(leftBottom.x, leftBottom.y);
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftBottom.x, leftBottom.y);
  ctx.lineTo(frontLeftBottom.x, frontLeftBottom.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.72);
  ctx.lineWidth = 2.2 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftBottom.x, leftBottom.y);
  ctx.lineTo(frontLeftBottom.x, frontLeftBottom.y);
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  const textRatios = getTextRatios(node, 0.46);
  const titlePoint = worldToScreen({ x: node.x + node.width * textRatios.x, y: node.y + node.height * textRatios.y }, camera, viewport);
  const hasIcon = node.icon && nodeIconCatalog[node.icon];
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;

  // Draw icon on the top face (rotated 90° to match v7 flow direction)
  if (hasIcon && showDetail) {
    const iconDef = nodeIconCatalog[node.icon!];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera,
      viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    // Perpendicular orientation: swap basis vectors with 90° rotation
    ctx.transform(
      topFaceBasisY.x, topFaceBasisY.y,
      -topFaceBasisX.x, -topFaceBasisX.y,
      0, 0,
    );
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) {
      const p2d = new Path2D(d);
      ctx.fill(p2d);
    }
    ctx.restore();
  }

  const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
  const nodeSubtitleSize = Math.round(nodeTitleSize * 0.8125);
  const subtitlePoint = {
    x: titlePoint.x + textStackDirection.x * 18,
    y: titlePoint.y + textStackDirection.y * 18,
  };

  if (showDetail) {
  // Clamp font size so text stays within the node's screen-space top face.
  // Text runs along textDirection, so measure against the matching edge length.
  const textEdgeLength = node.textRotated ? topEdgeLength : leftEdgeLength;
  const nodeTopEdge = textEdgeLength * 0.85;
  const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
  const titleFont = `600 ${scaledTitleSize}px Inter, sans-serif`;
  ctx.font = titleFont;
  // measureText returns width in the untransformed coordinate system.
  // The isometric transform compresses text by ~cos(30°) ≈ 0.87, so the
  // effective on-screen width is smaller than what measureText reports.
  const titleTextWidth = ctx.measureText(node.title).width * 0.87;
  const clampedScaledSize = titleTextWidth > nodeTopEdge
    ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / titleTextWidth)))
    : scaledTitleSize;
  const clampedSubtitleSize = Math.round(clampedScaledSize * 0.8125);

  drawTransformedText(
    ctx,
    node.title,
    titlePoint,
    textDirection,
    textStackDirection,
    light ? 'rgba(255,255,255,0.95)' : '#ffffff',
    `${light ? 700 : 600} ${clampedScaledSize}px Inter, sans-serif`,
  );

  if (node.subtitle) {
    drawTransformedText(
      ctx,
      node.subtitle,
      subtitlePoint,
      textDirection,
      textStackDirection,
      light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
      `${light ? 600 : 500} ${clampedSubtitleSize}px Inter, sans-serif`,
    );
  }
  } // end showDetail

  const leftFaceMid = {
    x: (leftTop.x + leftBottom.x) * 0.5,
    y: (leftTop.y + leftBottom.y) * 0.5 + depth * 0.34,
  };
}

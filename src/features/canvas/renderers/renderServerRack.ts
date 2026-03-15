import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/**
 * Renders an isometric server rack — stacked horizontal slats with LED indicators.
 */
export function renderServerRack(
  ctx: CanvasRenderingContext2D,
  node: NodeEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const points = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
  const [leftTop, rightTop, rightBottom, leftBottom] = points;
  const depth = NODE_DEPTH * 1.2 * camera.zoom; // taller rack
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLength = Math.hypot(rightTop.x - leftTop.x, rightTop.y - leftTop.y) || 1;
  const leftEdgeLength = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y) || 1;
  const avgEdge = (topEdgeLength + leftEdgeLength) * 0.5;
  const bScale = Math.min(1, Math.max(0.35, avgEdge / 120));

  const topFaceBasisX = {
    x: (rightTop.x - leftTop.x) / topEdgeLength,
    y: (rightTop.y - leftTop.y) / topEdgeLength,
  };
  const topFaceBasisY = {
    x: (leftBottom.x - leftTop.x) / leftEdgeLength,
    y: (leftBottom.y - leftTop.y) / leftEdgeLength,
  };

  const leftTopDepth = { x: leftTop.x, y: leftTop.y + depth };
  const frontLeftBottom = { x: leftBottom.x, y: leftBottom.y + depth };
  const frontRightBottom = { x: rightBottom.x, y: rightBottom.y + depth };
  const rightTopDepth = { x: rightTop.x, y: rightTop.y + depth };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // ── Drop shadow (light mode) ──
  if (light) {
    drawPolygon(ctx, [leftBottom, rightBottom, frontRightBottom, frontLeftBottom]);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left side face ──
  drawPolygon(ctx, [leftTop, leftBottom, frontLeftBottom, leftTopDepth]);
  if (light) {
    const g = ctx.createLinearGradient(leftTop.x, leftTop.y, frontLeftBottom.x, frontLeftBottom.y);
    g.addColorStop(0, deepToneMid);
    g.addColorStop(1, deepTone);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.22);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.35 : 0.14) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Front face (main rack face with slats) ──
  const frontFace = [leftBottom, rightBottom, frontRightBottom, frontLeftBottom];
  drawPolygon(ctx, frontFace);
  if (light) {
    const gFront = ctx.createLinearGradient(leftBottom.x, leftBottom.y, frontRightBottom.x, frontRightBottom.y);
    gFront.addColorStop(0, deepTone);
    gFront.addColorStop(1, darkenHex(deepTone, 0.8));
    ctx.fillStyle = gFront;
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.42);
  }
  ctx.fill();

  // ── Front face slats (horizontal dividers) ──
  const slatCount = 4;
  for (let i = 1; i < slatCount; i++) {
    const t = i / slatCount;
    const lx = leftBottom.x + (frontLeftBottom.x - leftBottom.x) * t;
    const ly = leftBottom.y + (frontLeftBottom.y - leftBottom.y) * t;
    const rx = rightBottom.x + (frontRightBottom.x - rightBottom.x) * t;
    const ry = rightBottom.y + (frontRightBottom.y - rightBottom.y) * t;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1.2 * bScale;
    ctx.stroke();

    // Thin dark gap line
    ctx.beginPath();
    ctx.moveTo(lx, ly + 1);
    ctx.lineTo(rx, ry + 1);
    ctx.strokeStyle = light ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();
  }

  // ── LED indicators on front face ──
  const ledColors = ['#00ff88', '#00e5ff', node.glowColor, '#ffab00'];
  for (let i = 0; i < slatCount; i++) {
    const t = (i + 0.5) / slatCount;
    const cx = leftBottom.x + (frontLeftBottom.x - leftBottom.x) * t;
    const cy = leftBottom.y + (frontLeftBottom.y - leftBottom.y) * t;
    // Offset inward from left edge
    const ledX = cx + (rightBottom.x - leftBottom.x) * 0.08;
    const ledY = cy + (rightBottom.y - leftBottom.y) * 0.08;

    const blinkPhase = Math.sin(time * 0.003 + i * 1.7);
    const ledOn = blinkPhase > -0.3;

    ctx.beginPath();
    ctx.arc(ledX, ledY, 2 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = ledOn ? hexToRgba(ledColors[i % ledColors.length], 0.9) : 'rgba(60,60,60,0.4)';
    if (ledOn) {
      ctx.shadowColor = ledColors[i % ledColors.length];
      ctx.shadowBlur = 5;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Front face border ──
  drawPolygon(ctx, frontFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.45 : 0.3) * pulse);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  // ── Right side face ──
  drawPolygon(ctx, [rightTop, rightBottom, frontRightBottom, rightTopDepth]);
  if (light) {
    const gRight = ctx.createLinearGradient(rightTop.x, rightTop.y, frontRightBottom.x, frontRightBottom.y);
    gRight.addColorStop(0, deepToneMid);
    gRight.addColorStop(1, darkenHex(deepTone, 0.85));
    ctx.fillStyle = gRight;
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.28);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.30 : 0.1) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Top face ──
  drawPolygon(ctx, points);
  const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
  if (light) {
    gradient.addColorStop(0, deepToneLit);
    gradient.addColorStop(0.5, deepToneMid);
    gradient.addColorStop(1, deepTone);
  } else {
    gradient.addColorStop(0, hexToRgba(faceFill, 0.84));
    gradient.addColorStop(0.5, hexToRgba(faceFill, 0.46));
    gradient.addColorStop(1, hexToRgba(faceFill, 0.24));
  }
  ctx.fillStyle = gradient;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.4) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 14) : (selected ? 26 : 18);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Top face border ──
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  // ── Top face outer glow ──
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Ventilation slots on top face ──
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const slotStart: Point = {
      x: leftTop.x + (rightTop.x - leftTop.x) * 0.2 + (leftBottom.x - leftTop.x) * t,
      y: leftTop.y + (rightTop.y - leftTop.y) * 0.2 + (leftBottom.y - leftTop.y) * t,
    };
    const slotEnd: Point = {
      x: leftTop.x + (rightTop.x - leftTop.x) * 0.8 + (leftBottom.x - leftTop.x) * t,
      y: leftTop.y + (rightTop.y - leftTop.y) * 0.8 + (leftBottom.y - leftTop.y) * t,
    };
    ctx.beginPath();
    ctx.moveTo(slotStart.x, slotStart.y);
    ctx.lineTo(slotEnd.x, slotEnd.y);
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1 * bScale;
    ctx.stroke();
  }

  // ── Edge highlights ──
  ctx.beginPath();
  ctx.moveTo(leftTop.x, leftTop.y);
  ctx.lineTo(leftBottom.x, leftBottom.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.8 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.45);
  ctx.shadowBlur = (light ? 3 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? topFaceBasisX : topFaceBasisY;
  const textStackDirection = node.textRotated
    ? { x: topFaceBasisY.x, y: topFaceBasisY.y }
    : { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(topFaceBasisY.x, topFaceBasisY.y, -topFaceBasisX.x, -topFaceBasisX.y, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePoint = worldToScreen({ x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 }, camera, viewport);
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLength = node.textRotated ? topEdgeLength : leftEdgeLength;
    const nodeTopEdge = textEdgeLength * 0.85;
    ctx.font = `600 ${scaledTitleSize}px Inter, sans-serif`;
    const titleTextWidth = ctx.measureText(node.title).width * 0.87;
    const clampedSize = titleTextWidth > nodeTopEdge
      ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / titleTextWidth)))
      : scaledTitleSize;

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${clampedSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subtitlePoint = {
        x: titlePoint.x + textStackDirection.x * 18,
        y: titlePoint.y + textStackDirection.y * 18,
      };
      drawTransformedText(ctx, node.subtitle, subtitlePoint, textDirection, textStackDirection,
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `${light ? 600 : 500} ${Math.round(clampedSize * 0.8125)}px Inter, sans-serif`);
    }
  }
}

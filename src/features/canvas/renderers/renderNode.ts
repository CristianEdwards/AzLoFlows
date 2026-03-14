import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba } from '@/lib/rendering/tokens';
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

  // In light mode, paint white bases on all 3D faces so colours pop
  if (light) {
    for (const face of [
      [leftTop, leftBottom, frontLeftBottom, leftTopDepth],
      [leftBottom, rightBottom, frontRightBottom, frontLeftBottom],
      [rightTop, rightBottom, frontRightBottom, rightTopDepth],
      points,
    ]) {
      drawPolygon(ctx, face);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fill();
    }
  }

  drawPolygon(ctx, [leftTop, leftBottom, frontLeftBottom, leftTopDepth]);
  ctx.fillStyle = hexToRgba(node.fill, light ? 0.92 : 0.22);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.22 : 0.14) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  drawPolygon(ctx, [leftBottom, rightBottom, frontRightBottom, frontLeftBottom]);
  ctx.fillStyle = hexToRgba(node.fill, light ? 0.98 : 0.42);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.22 : 0.14) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  drawPolygon(ctx, [rightTop, rightBottom, frontRightBottom, rightTopDepth]);
  ctx.fillStyle = hexToRgba(node.fill, light ? 0.95 : 0.28);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.18 : 0.1) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  drawPolygon(ctx, points);
  const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
  gradient.addColorStop(0, hexToRgba(node.fill, light ? 0.98 : 0.84));
  gradient.addColorStop(0.5, hexToRgba(node.fill, light ? 0.88 : 0.46));
  gradient.addColorStop(1, hexToRgba(node.fill, light ? 0.72 : 0.24));
  ctx.fillStyle = gradient;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.12 : 0.4) * pulse);
  ctx.shadowBlur = light ? (selected ? 8 : 4) : (selected ? 26 : 18);
  ctx.fill();
  ctx.shadowBlur = 0;

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
  ctx.strokeStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
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
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.45);
  ctx.shadowBlur = (light ? 3 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

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

  const titlePoint = worldToScreen({ x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 }, camera, viewport);
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
    ctx.globalAlpha = light ? 1.0 : 0.7;
    ctx.fillStyle = light ? hexToRgba(node.glowColor, 0.5) : hexToRgba(node.glowColor, 1.0);
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
    light ? '#ffffff' : '#ffffff',
    `${light ? 700 : 600} ${clampedScaledSize}px Inter, sans-serif`,
  );

  if (node.subtitle) {
    drawTransformedText(
      ctx,
      node.subtitle,
      subtitlePoint,
      textDirection,
      textStackDirection,
      light ? 'rgba(255,255,255,0.9)' : hexToRgba(node.glowColor, 0.95),
      `${light ? 600 : 500} ${clampedSubtitleSize}px Inter, sans-serif`,
    );
  }
  } // end showDetail

  const leftFaceMid = {
    x: (leftTop.x + leftBottom.x) * 0.5,
    y: (leftTop.y + leftBottom.y) * 0.5 + depth * 0.34,
  };
}
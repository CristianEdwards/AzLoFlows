import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/** Draw an isometric ellipse inscribed in the given quad. */
function isoEllipsePath(
  ctx: CanvasRenderingContext2D,
  center: Point,
  halfX: Point,
  halfY: Point,
  segments = 48,
) {
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const px = center.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
    const py = center.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Draw the visible lower half of the bottom ellipse + vertical sides. */
function cylinderBodyPath(
  ctx: CanvasRenderingContext2D,
  topCenter: Point,
  botCenter: Point,
  halfX: Point,
  halfY: Point,
  segments = 48,
) {
  // rightmost point of top ellipse
  const topRight = { x: topCenter.x + halfX.x, y: topCenter.y + halfX.y };
  const botRight = { x: botCenter.x + halfX.x, y: botCenter.y + halfX.y };
  const topLeft = { x: topCenter.x - halfX.x, y: topCenter.y - halfX.y };
  const botLeft = { x: botCenter.x - halfX.x, y: botCenter.y - halfX.y };

  ctx.beginPath();
  // Right side down
  ctx.moveTo(topRight.x, topRight.y);
  ctx.lineTo(botRight.x, botRight.y);

  // Bottom ellipse (front-visible half: from right around the front to left)
  for (let i = 0; i <= segments / 2; i++) {
    const t = (i / segments) * Math.PI * 2; // 0 to π
    const px = botCenter.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
    const py = botCenter.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
    ctx.lineTo(px, py);
  }

  // Left side up
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
}

export function renderCylinder(
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
  const depth = NODE_DEPTH * camera.zoom;
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLength = Math.hypot(rightTop.x - leftTop.x, rightTop.y - leftTop.y) || 1;
  const leftEdgeLength = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y) || 1;
  const avgEdge = (topEdgeLength + leftEdgeLength) * 0.5;
  const bScale = Math.min(1, Math.max(0.35, avgEdge / 120));

  // Basis vectors
  const topFaceBasisX = {
    x: (rightTop.x - leftTop.x) / topEdgeLength,
    y: (rightTop.y - leftTop.y) / topEdgeLength,
  };
  const topFaceBasisY = {
    x: (leftBottom.x - leftTop.x) / leftEdgeLength,
    y: (leftBottom.y - leftTop.y) / leftEdgeLength,
  };

  // Isometric ellipse parameters
  const center: Point = {
    x: (leftTop.x + rightTop.x + rightBottom.x + leftBottom.x) / 4,
    y: (leftTop.y + rightTop.y + rightBottom.y + leftBottom.y) / 4,
  };
  const halfX: Point = { x: (rightTop.x - leftTop.x) / 2, y: (rightTop.y - leftTop.y) / 2 };
  const halfY: Point = { x: (leftBottom.x - leftTop.x) / 2, y: (leftBottom.y - leftTop.y) / 2 };
  const botCenter: Point = { x: center.x, y: center.y + depth };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // ── Drop shadow (light mode) ──
  if (light) {
    isoEllipsePath(ctx, botCenter, halfX, halfY);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Cylinder body (front-visible portion) ──
  cylinderBodyPath(ctx, center, botCenter, halfX, halfY);
  if (light) {
    const gBody = ctx.createLinearGradient(
      center.x - halfX.x, center.y - halfX.y,
      center.x + halfX.x, center.y + halfX.y,
    );
    gBody.addColorStop(0, deepToneLit);
    gBody.addColorStop(0.5, deepTone);
    gBody.addColorStop(1, darkenHex(deepTone, 0.8));
    ctx.fillStyle = gBody;
  } else {
    const gBody = ctx.createLinearGradient(
      center.x - halfX.x, center.y - halfX.y,
      center.x + halfX.x, center.y + halfX.y,
    );
    gBody.addColorStop(0, hexToRgba(faceFill, 0.38));
    gBody.addColorStop(0.5, hexToRgba(faceFill, 0.22));
    gBody.addColorStop(1, hexToRgba(faceFill, 0.12));
    ctx.fillStyle = gBody;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.45 : 0.3) * pulse);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  // ── Bottom ellipse edge (visible front half only) ──
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = (i / 48) * Math.PI * 2;
    const px = botCenter.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
    const py = botCenter.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.5 : 0.35);
  ctx.lineWidth = 1.6 * bScale;
  ctx.stroke();

  // ── Top ellipse fill ──
  isoEllipsePath(ctx, center, halfX, halfY);
  const gTop = ctx.createLinearGradient(
    center.x + halfY.x, center.y + halfY.y,
    center.x - halfY.x, center.y - halfY.y,
  );
  if (light) {
    gTop.addColorStop(0, deepToneLit);
    gTop.addColorStop(0.5, deepToneMid);
    gTop.addColorStop(1, deepTone);
  } else {
    gTop.addColorStop(0, hexToRgba(faceFill, 0.82));
    gTop.addColorStop(0.5, hexToRgba(faceFill, 0.48));
    gTop.addColorStop(1, hexToRgba(faceFill, 0.22));
  }
  ctx.fillStyle = gTop;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.4) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 14) : (selected ? 26 : 18);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Top ellipse stroke ──
  isoEllipsePath(ctx, center, halfX, halfY);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  // ── Outer glow stroke ──
  isoEllipsePath(ctx, center, halfX, halfY);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Glossy highlight on body ──
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const t = (Math.PI * 0.75) + (i / 12) * (Math.PI * 0.5);
    const px = center.x + Math.cos(t) * halfX.x * 0.92 + Math.sin(t) * halfY.x * 0.92;
    const py = center.y + Math.cos(t) * halfX.y * 0.92 + Math.sin(t) * halfY.y * 0.92;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2.5 * bScale;
  ctx.stroke();

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

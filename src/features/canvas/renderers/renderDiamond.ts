import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an isometric diamond (rotated cube) — a rhombus/gem shape.
 * The top face is a sharp diamond (the quad corners become the points).
 */
export function renderDiamond(
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
  const depth = NODE_DEPTH * 0.8 * camera.zoom;
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

  // Diamond shape: use the midpoints of the quad edges as the diamond points
  // This creates a rotated square (45° rhombus) inscribed in the isometric quad
  const center = {
    x: (leftTop.x + rightTop.x + rightBottom.x + leftBottom.x) / 4,
    y: (leftTop.y + rightTop.y + rightBottom.y + leftBottom.y) / 4,
  };
  const dTop = { x: (leftTop.x + rightTop.x) / 2, y: (leftTop.y + rightTop.y) / 2 };
  const dRight = { x: (rightTop.x + rightBottom.x) / 2, y: (rightTop.y + rightBottom.y) / 2 };
  const dBottom = { x: (rightBottom.x + leftBottom.x) / 2, y: (rightBottom.y + leftBottom.y) / 2 };
  const dLeft = { x: (leftBottom.x + leftTop.x) / 2, y: (leftBottom.y + leftTop.y) / 2 };

  // Depth-shifted points
  const dTopD = { x: dTop.x, y: dTop.y + depth };
  const dRightD = { x: dRight.x, y: dRight.y + depth };
  const dBottomD = { x: dBottom.x, y: dBottom.y + depth };
  const dLeftD = { x: dLeft.x, y: dLeft.y + depth };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.25) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.15) : '';

  // ── Drop shadow (light mode) ──
  if (light) {
    drawPolygon(ctx, [dLeft, dBottom, dBottomD, dLeftD]);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left facet ──
  drawPolygon(ctx, [dTop, dLeft, dLeftD, dTopD]);
  if (light) {
    const g = ctx.createLinearGradient(dTop.x, dTop.y, dLeftD.x, dLeftD.y);
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

  // ── Front-left facet ──
  drawPolygon(ctx, [dLeft, dBottom, dBottomD, dLeftD]);
  if (light) {
    const g = ctx.createLinearGradient(dLeft.x, dLeft.y, dBottomD.x, dBottomD.y);
    g.addColorStop(0, deepTone);
    g.addColorStop(1, darkenHex(deepTone, 0.8));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.38);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.35 : 0.14) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Front-right facet ──
  drawPolygon(ctx, [dBottom, dRight, dRightD, dBottomD]);
  if (light) {
    const g = ctx.createLinearGradient(dBottom.x, dBottom.y, dRightD.x, dRightD.y);
    g.addColorStop(0, darkenHex(deepTone, 0.85));
    g.addColorStop(1, darkenHex(deepTone, 0.7));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.32);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.30 : 0.1) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Right facet ──
  drawPolygon(ctx, [dRight, dTop, dTopD, dRightD]);
  if (light) {
    const g = ctx.createLinearGradient(dRight.x, dRight.y, dTopD.x, dTopD.y);
    g.addColorStop(0, deepToneMid);
    g.addColorStop(1, darkenHex(deepTone, 0.85));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.25);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.25 : 0.1) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Top diamond face ──
  drawPolygon(ctx, [dTop, dRight, dBottom, dLeft]);
  const gradient = ctx.createLinearGradient(dTop.x, dTop.y, dBottom.x, dBottom.y);
  if (light) {
    gradient.addColorStop(0, deepToneLit);
    gradient.addColorStop(0.5, deepToneMid);
    gradient.addColorStop(1, deepTone);
  } else {
    gradient.addColorStop(0, hexToRgba(faceFill, 0.84));
    gradient.addColorStop(0.5, hexToRgba(faceFill, 0.48));
    gradient.addColorStop(1, hexToRgba(faceFill, 0.24));
  }
  ctx.fillStyle = gradient;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.4) * pulse);
  ctx.shadowBlur = light ? (selected ? 22 : 16) : (selected ? 28 : 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Top face border ──
  drawPolygon(ctx, [dTop, dRight, dBottom, dLeft]);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  // ── Top face outer glow ──
  drawPolygon(ctx, [dTop, dRight, dBottom, dLeft]);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Center cross highlight ──
  ctx.beginPath();
  ctx.moveTo(dTop.x, dTop.y);
  ctx.lineTo(dBottom.x, dBottom.y);
  ctx.moveTo(dLeft.x, dLeft.y);
  ctx.lineTo(dRight.x, dRight.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // ── Leading edge glow ──
  ctx.beginPath();
  ctx.moveTo(dTop.x, dTop.y);
  ctx.lineTo(dLeft.x, dLeft.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.8 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.45);
  ctx.shadowBlur = (light ? 3 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = topFaceBasisY;
  const textStackDirection = { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * 0.9 * camera.zoom;
    ctx.save();
    ctx.translate(center.x, center.y - 4 * camera.zoom);
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
    const titlePoint = { x: center.x, y: center.y + 8 * camera.zoom };
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom * 0.85);
    const textEdgeLength = avgEdge * 0.7; // diamond is smaller
    ctx.font = `600 ${scaledTitleSize}px Inter, sans-serif`;
    const titleTextWidth = ctx.measureText(node.title).width * 0.87;
    const clampedSize = titleTextWidth > textEdgeLength
      ? Math.max(8, Math.floor(scaledTitleSize * (textEdgeLength / titleTextWidth)))
      : scaledTitleSize;

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${clampedSize}px Inter, sans-serif`);
  }
}

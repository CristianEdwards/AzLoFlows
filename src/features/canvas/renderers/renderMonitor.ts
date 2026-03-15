import { DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a standing monitor/screen in isometric.
 * The screen is a tall vertical panel with a slight stand base.
 */
export function renderMonitor(
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

  // Screen rises up from the top face (vertical height determined by node width)
  const screenHeight = node.width * 0.8 * camera.zoom;
  const screenDepth = 6 * camera.zoom; // thin

  // Screen panel corners: rise vertically from the "back edge" (leftTop → rightTop)
  const sbl = leftTop;  // screen bottom-left
  const sbr = rightTop; // screen bottom-right
  const stl = { x: leftTop.x, y: leftTop.y - screenHeight };
  const str = { x: rightTop.x, y: rightTop.y - screenHeight };

  // Screen panel has slight depth to the right (thin bezel)
  const sblD = { x: sbl.x + screenDepth * 0.5, y: sbl.y + screenDepth * 0.3 };
  const sbrD = { x: sbr.x + screenDepth * 0.5, y: sbr.y + screenDepth * 0.3 };
  const stlD = { x: stl.x + screenDepth * 0.5, y: stl.y + screenDepth * 0.3 };
  const strD = { x: str.x + screenDepth * 0.5, y: str.y + screenDepth * 0.3 };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [sbl, sbr, sbrD, sblD]);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Base/stand (the flat isometric quad) ──
  drawPolygon(ctx, points);
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.7);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.18);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.5 : 0.3);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  // ── Stand neck (thin vertical line from base center up to screen) ──
  const baseMid = {
    x: (leftTop.x + rightTop.x) * 0.5,
    y: (leftTop.y + rightTop.y) * 0.5,
  };
  const baseBottom = {
    x: (leftBottom.x + rightBottom.x) * 0.5,
    y: (leftBottom.y + rightBottom.y) * 0.5,
  };
  ctx.beginPath();
  ctx.moveTo(baseMid.x, baseMid.y);
  ctx.lineTo(baseBottom.x, baseBottom.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.6 : 0.4);
  ctx.lineWidth = 3 * bScale;
  ctx.stroke();

  // ── Screen right side face (depth) ──
  drawPolygon(ctx, [sbr, sbrD, strD, str]);
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.7);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.15);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.2);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Screen bottom face (depth) ──
  drawPolygon(ctx, [sbl, sbr, sbrD, sblD]);
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.6);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.12);
  }
  ctx.fill();

  // ── Screen main face (front) ──
  drawPolygon(ctx, [stl, str, sbr, sbl]);
  // Dark screen background with subtle gradient
  const screenGrad = ctx.createLinearGradient(stl.x, stl.y, sbl.x, sbl.y);
  if (light) {
    screenGrad.addColorStop(0, deepToneLit);
    screenGrad.addColorStop(0.4, deepToneMid);
    screenGrad.addColorStop(1, deepTone);
  } else {
    screenGrad.addColorStop(0, hexToRgba(faceFill, 0.72));
    screenGrad.addColorStop(0.4, hexToRgba(faceFill, 0.45));
    screenGrad.addColorStop(1, hexToRgba(faceFill, 0.2));
  }
  ctx.fillStyle = screenGrad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.5) * pulse);
  ctx.shadowBlur = light ? (selected ? 22 : 16) : (selected ? 30 : 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Screen border ──
  drawPolygon(ctx, [stl, str, sbr, sbl]);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  // ── Outer glow ──
  drawPolygon(ctx, [stl, str, sbr, sbl]);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Screen reflection line ──
  const reflectY = stl.y + (sbl.y - stl.y) * 0.15;
  ctx.beginPath();
  const rlx = stl.x + (str.x - stl.x) * 0.1;
  const rrx = stl.x + (str.x - stl.x) * 0.9;
  const rly = stl.y + (str.y - stl.y) * 0.1 + (sbl.y - stl.y) * 0.15;
  const rry = stl.y + (str.y - stl.y) * 0.9 + (sbl.y - stl.y) * 0.15;
  ctx.moveTo(rlx, rly);
  ctx.lineTo(rrx, rry);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // ── Power indicator dot ──
  const dotPos = {
    x: sbl.x + (sbr.x - sbl.x) * 0.5,
    y: sbl.y + (sbr.y - sbl.y) * 0.5 - 4 * camera.zoom,
  };
  ctx.beginPath();
  ctx.arc(dotPos.x, dotPos.y, 2.5 * bScale, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(node.glowColor, 0.9);
  ctx.shadowColor = hexToRgba(node.glowColor, 0.6);
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Icon + text (drawn on the screen face) ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const screenCenterX = (stl.x + str.x + sbl.x + sbr.x) / 4;
  const screenCenterY = (stl.y + str.y + sbl.y + sbr.y) / 4;

  // Screen basis vectors (vertical face, not isometric top)
  const screenBasisX = { x: (str.x - stl.x) / topEdgeLength, y: (str.y - stl.y) / topEdgeLength };
  const screenBasisY = { x: 0, y: 1 }; // vertical

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, screenHeight / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 1.4;
    ctx.save();
    ctx.translate(screenCenterX, screenCenterY - screenHeight * 0.12);
    ctx.transform(screenBasisX.x, screenBasisX.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.75;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titleY = screenCenterY + screenHeight * 0.22;
    const titlePoint = { x: screenCenterX, y: titleY };
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(nodeTitleSize * camera.zoom * 0.9);

    drawTransformedText(ctx, node.title, titlePoint, screenBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPoint = { x: titlePoint.x, y: titlePoint.y + scaledSize * 1.2 };
      drawTransformedText(ctx, node.subtitle, subPoint, screenBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.8)}px Inter, sans-serif`);
    }
  }
}

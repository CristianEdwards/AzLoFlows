import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an open laptop in isometric.
 * The isoQuad is the keyboard/base, and a tilted screen rises from the back
 * edge. Inspired by the Holowits & e-commerce reference images.
 */
export function renderLaptop(
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
  const [lt, rt, rb, lb] = points;
  const baseDepth = NODE_DEPTH * 0.12 * camera.zoom; // thin keyboard base
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // Base depth points
  const ltD = { x: lt.x, y: lt.y + baseDepth };
  const lbD = { x: lb.x, y: lb.y + baseDepth };
  const rbD = { x: rb.x, y: rb.y + baseDepth };
  const rtD = { x: rt.x, y: rt.y + baseDepth };

  // Screen: rises vertically from the back edge (lt→rt), tilted slightly
  const screenH = node.width * 0.55 * camera.zoom;
  const screenTilt = node.height * 0.08 * camera.zoom; // slight backward tilt
  const stl = { x: lt.x - by.x * screenTilt, y: lt.y - screenH - by.y * screenTilt };
  const str = { x: rt.x - by.x * screenTilt, y: rt.y - screenH - by.y * screenTilt };

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [lb, rb, rbD, lbD]);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Keyboard base: left face ──
  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.7) : hexToRgba(faceFill, 0.10);
  ctx.fill();

  // ── Keyboard base: front face ──
  drawPolygon(ctx, [lb, rb, rbD, lbD]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.65) : hexToRgba(faceFill, 0.14);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.12);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Keyboard base: top face (keyboard surface) ──
  drawPolygon(ctx, points);
  const kbGrad = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  if (light) {
    kbGrad.addColorStop(0, lightenHex(deepTone, 0.08));
    kbGrad.addColorStop(1, deepTone);
  } else {
    kbGrad.addColorStop(0, hexToRgba(faceFill, 0.25));
    kbGrad.addColorStop(1, hexToRgba(faceFill, 0.10));
  }
  ctx.fillStyle = kbGrad;
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.4 : 0.25);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // ── Keyboard key grid (subtle lines on base) ──
  const keyRows = 4;
  const keyCols = 6;
  for (let r = 1; r < keyRows; r++) {
    const t = r / keyRows;
    const startX = lt.x + (lb.x - lt.x) * t * 0.7 + (rt.x - lt.x) * 0.15;
    const startY = lt.y + (lb.y - lt.y) * t * 0.7 + (rt.y - lt.y) * 0.15;
    const endX = rt.x + (rb.x - rt.x) * t * 0.7 - (rt.x - lt.x) * 0.15;
    const endY = rt.y + (rb.y - rt.y) * t * 0.7 - (rt.y - lt.y) * 0.15;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.06 : 0.04);
    ctx.lineWidth = 0.6 * bScale;
    ctx.stroke();
  }
  for (let c = 1; c < keyCols; c++) {
    const t = c / keyCols;
    const startX = lt.x + (rt.x - lt.x) * (0.15 + t * 0.7);
    const startY = lt.y + (rt.y - lt.y) * (0.15 + t * 0.7);
    const endX = lb.x + (rb.x - lb.x) * (0.15 + t * 0.7);
    const endY = lb.y + (rb.y - lb.y) * (0.15 + t * 0.7);
    const endXc = startX + (endX - startX) * 0.7;
    const endYc = startY + (endY - startY) * 0.7;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endXc, endYc);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.06 : 0.04);
    ctx.lineWidth = 0.6 * bScale;
    ctx.stroke();
  }

  // ── Trackpad rectangle ──
  const tpCenter = {
    x: (lt.x + rt.x + lb.x + rb.x) / 4 + by.x * leftEdgeLen * 0.18,
    y: (lt.y + rt.y + lb.y + rb.y) / 4 + by.y * leftEdgeLen * 0.18,
  };
  const tpW = topEdgeLen * 0.2;
  const tpH = leftEdgeLen * 0.12;
  drawPolygon(ctx, [
    { x: tpCenter.x - bx.x * tpW - by.x * tpH, y: tpCenter.y - bx.y * tpW - by.y * tpH },
    { x: tpCenter.x + bx.x * tpW - by.x * tpH, y: tpCenter.y + bx.y * tpW - by.y * tpH },
    { x: tpCenter.x + bx.x * tpW + by.x * tpH, y: tpCenter.y + bx.y * tpW + by.y * tpH },
    { x: tpCenter.x - bx.x * tpW + by.x * tpH, y: tpCenter.y - bx.y * tpW + by.y * tpH },
  ]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.08);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Screen panel (rising from back edge lt→rt) ──
  const screenFace = [lt, rt, str, stl];
  drawPolygon(ctx, screenFace);
  const scrGrad = ctx.createLinearGradient(lt.x, lt.y, stl.x, stl.y);
  if (light) {
    scrGrad.addColorStop(0, deepTone);
    scrGrad.addColorStop(0.3, deepToneMid);
    scrGrad.addColorStop(1, deepToneLit);
  } else {
    scrGrad.addColorStop(0, hexToRgba(faceFill, 0.20));
    scrGrad.addColorStop(0.3, hexToRgba(faceFill, 0.48));
    scrGrad.addColorStop(1, hexToRgba(faceFill, 0.72));
  }
  ctx.fillStyle = scrGrad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.5) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 14) : (selected ? 28 : 18);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Screen border
  drawPolygon(ctx, screenFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.85 : 0.72));
  ctx.lineWidth = (selected ? 3 : 2.2) * bScale;
  ctx.stroke();

  // Outer glow
  drawPolygon(ctx, screenFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.15));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // Screen bezel line
  const bzFrac = 0.06;
  const bzTL = { x: stl.x + (str.x - stl.x) * bzFrac + (lt.x - stl.x) * bzFrac, y: stl.y + (str.y - stl.y) * bzFrac + (lt.y - stl.y) * bzFrac };
  const bzTR = { x: str.x - (str.x - stl.x) * bzFrac + (rt.x - str.x) * bzFrac, y: str.y - (str.y - stl.y) * bzFrac + (rt.y - str.y) * bzFrac };
  const bzBR = { x: rt.x - (rt.x - lt.x) * bzFrac + (str.x - rt.x) * bzFrac, y: rt.y - (rt.y - lt.y) * bzFrac + (str.y - rt.y) * bzFrac };
  const bzBL = { x: lt.x + (rt.x - lt.x) * bzFrac + (stl.x - lt.x) * bzFrac, y: lt.y + (rt.y - lt.y) * bzFrac + (stl.y - lt.y) * bzFrac };
  drawPolygon(ctx, [bzTL, bzTR, bzBR, bzBL]);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Hinge line (where screen meets base)
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(rt.x, rt.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.45 : 0.3);
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // ── Icon + text on screen ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const screenCX = (lt.x + rt.x + stl.x + str.x) / 4;
  const screenCY = (lt.y + rt.y + stl.y + str.y) / 4;
  const screenBasisX = bx;

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, screenH / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 1.2;
    ctx.save();
    ctx.translate(screenCX, screenCY - screenH * 0.05);
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
    const titlePt = { x: screenCX, y: screenCY + screenH * 0.18 };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.85);

    drawTransformedText(ctx, node.title, titlePt, screenBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = { x: titlePt.x, y: titlePt.y + scaledSize * 1.2 };
      drawTransformedText(ctx, node.subtitle, subPt, screenBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.8)}px Inter, sans-serif`);
    }
  }
}

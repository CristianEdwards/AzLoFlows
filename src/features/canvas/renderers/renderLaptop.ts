import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an open laptop in isometric.
 * The isoQuad is the keyboard/base, and the screen rises vertically from the
 * **right edge** (rt→rb) — same orientation as ChartPanel, Dashboard, Browser.
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

  // ── Screen rises from right edge (rt→rb) ──
  const screenH = node.width * 0.55 * camera.zoom;
  const tiltBack = node.height * 0.05 * camera.zoom;

  // Bottom corners of screen = right edge of base
  const wbl = rt;
  const wbr = rb;
  // Top corners rise upward (with slight tilt along -bx)
  const wtl = { x: rt.x - bx.x * tiltBack, y: rt.y - screenH - bx.y * tiltBack };
  const wtr = { x: rb.x - bx.x * tiltBack, y: rb.y - screenH - bx.y * tiltBack };

  // Side-edge thickness (glass depth)
  const sideDepth = 18 * camera.zoom;
  const wblT = { x: wbl.x - by.x * sideDepth, y: wbl.y - by.y * sideDepth };
  const wtlT = { x: wtl.x - by.x * sideDepth, y: wtl.y - by.y * sideDepth };
  const wtrT = { x: wtr.x - by.x * sideDepth, y: wtr.y - by.y * sideDepth };
  const wbrT = { x: wbr.x - by.x * sideDepth, y: wbr.y - by.y * sideDepth };

  // Bottom edge thickness
  const bottomDepth = 10 * camera.zoom;
  const wblB = { x: wbl.x, y: wbl.y + bottomDepth };
  const wbrB = { x: wbr.x, y: wbr.y + bottomDepth };
  const wblTB = { x: wblT.x, y: wblT.y + bottomDepth };

  // Bilinear helper on screen face
  const pp = (u: number, v: number) => ({
    x: wtl.x + (wtr.x - wtl.x) * u + (wbl.x - wtl.x) * v,
    y: wtl.y + (wtr.y - wtl.y) * u + (wbl.y - wtl.y) * v,
  });

  // ── Behind-panel reflection (ghost copy offset behind) ──
  const reflOff = 18 * camera.zoom;
  const rwtl = { x: wtl.x + by.x * reflOff, y: wtl.y + by.y * reflOff };
  const rwtr = { x: wtr.x + by.x * reflOff, y: wtr.y + by.y * reflOff };
  const rwbr = { x: wbr.x + by.x * reflOff, y: wbr.y + by.y * reflOff };
  const rwbl = { x: wbl.x + by.x * reflOff, y: wbl.y + by.y * reflOff };
  drawPolygon(ctx, [rwtl, rwtr, rwbr, rwbl]);
  const reflGrad = ctx.createLinearGradient(rwtl.x, rwtl.y, rwbl.x, rwbl.y);
  if (light) {
    reflGrad.addColorStop(0, hexToRgba(deepTone, 0.22));
    reflGrad.addColorStop(0.7, hexToRgba(deepTone, 0.10));
    reflGrad.addColorStop(1, hexToRgba(deepTone, 0.04));
  } else {
    reflGrad.addColorStop(0, hexToRgba(faceFill, 0.28));
    reflGrad.addColorStop(0.7, hexToRgba(faceFill, 0.12));
    reflGrad.addColorStop(1, hexToRgba(faceFill, 0.04));
  }
  ctx.fillStyle = reflGrad;
  ctx.fill();
  drawPolygon(ctx, [rwtl, rwtr, rwbr, rwbl]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.18 : 0.22);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

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

  // ── Screen top edge face (slab top — lightest face, catches light) ──
  drawPolygon(ctx, [wtlT, wtl, wtr, wtrT]);
  if (light) {
    const gTop = ctx.createLinearGradient(wtlT.x, wtlT.y, wtr.x, wtr.y);
    gTop.addColorStop(0, lightenHex(deepTone, 0.18));
    gTop.addColorStop(1, deepTone);
    ctx.fillStyle = gTop;
  } else {
    const gTop = ctx.createLinearGradient(wtlT.x, wtlT.y, wtr.x, wtr.y);
    gTop.addColorStop(0, hexToRgba(node.glowColor, 0.55));
    gTop.addColorStop(0.5, hexToRgba(node.glowColor, 0.35));
    gTop.addColorStop(1, hexToRgba(node.glowColor, 0.20));
    ctx.fillStyle = gTop;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.30 : 0.25);
  ctx.lineWidth = 0.7 * bScale;
  ctx.stroke();

  // ── Screen bottom edge (3D base — darkest face) ──
  drawPolygon(ctx, [wbl, wbr, wbrB, wblB]);
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.78);
  } else {
    const gBot = ctx.createLinearGradient(wbl.x, wbl.y, wblB.x, wblB.y);
    gBot.addColorStop(0, darkenHex(node.glowColor, 0.55));
    gBot.addColorStop(1, darkenHex(node.glowColor, 0.75));
    ctx.fillStyle = gBot;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.16 : 0.12);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // Bottom-right edge strip
  drawPolygon(ctx, [wbr, wbrT, { x: wbrT.x, y: wbrT.y + bottomDepth }, wbrB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.82) : darkenHex(node.glowColor, 0.70);
  ctx.fill();

  // Bottom-left corner strip
  drawPolygon(ctx, [wblT, wbl, wblB, wblTB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.82) : darkenHex(node.glowColor, 0.65);
  ctx.fill();

  // ── Screen left-edge thickness ── (side face — medium tone)
  drawPolygon(ctx, [wtl, wbl, wblT, wtlT]);
  if (light) {
    const gSide = ctx.createLinearGradient(wtlT.x, wtlT.y, wtl.x, wtl.y);
    gSide.addColorStop(0, lightenHex(deepTone, 0.10));
    gSide.addColorStop(1, darkenHex(deepTone, 0.50));
    ctx.fillStyle = gSide;
  } else {
    const gSide = ctx.createLinearGradient(wtlT.x, wtlT.y, wtl.x, wtl.y);
    gSide.addColorStop(0, hexToRgba(node.glowColor, 0.50));
    gSide.addColorStop(0.5, darkenHex(node.glowColor, 0.40));
    gSide.addColorStop(1, darkenHex(node.glowColor, 0.60));
    ctx.fillStyle = gSide;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.28 : 0.22);
  ctx.lineWidth = 0.7 * bScale;
  ctx.stroke();

  // Specular highlight on left edge
  ctx.beginPath();
  const lpLMid1 = { x: wtl.x * 0.5 + wtlT.x * 0.5, y: wtl.y * 0.5 + wtlT.y * 0.5 };
  const lpLMid2 = { x: wbl.x * 0.5 + wblT.x * 0.5, y: wbl.y * 0.5 + wblT.y * 0.5 };
  ctx.moveTo(lpLMid1.x, lpLMid1.y);
  ctx.lineTo(lpLMid2.x, lpLMid2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2.5 * bScale;
  ctx.stroke();

  // ── Screen panel (rising from right edge rt→rb) — rich solid gradient ──
  const screenFace = [wtl, wtr, wbr, wbl];
  drawPolygon(ctx, screenFace);
  const scrGrad = ctx.createLinearGradient(wbl.x, wbl.y, wtl.x, wtl.y);
  if (light) {
    scrGrad.addColorStop(0, deepTone);
    scrGrad.addColorStop(0.3, deepToneMid);
    scrGrad.addColorStop(1, deepToneLit);
  } else {
    scrGrad.addColorStop(0, darkenHex(node.glowColor, 0.55));
    scrGrad.addColorStop(0.3, darkenHex(node.glowColor, 0.35));
    scrGrad.addColorStop(0.7, hexToRgba(node.glowColor, 0.55));
    scrGrad.addColorStop(1, hexToRgba(node.glowColor, 0.85));
  }
  ctx.fillStyle = scrGrad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.40 : 0.55) * pulse);
  ctx.shadowBlur = light ? (selected ? 24 : 16) : (selected ? 34 : 22);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Specular highlight diagonal on screen face
  ctx.beginPath();
  const lpSpec1 = pp(0.3, 0.15);
  const lpSpec2 = pp(0.7, 0.85);
  ctx.moveTo(lpSpec1.x, lpSpec1.y);
  ctx.lineTo(lpSpec2.x, lpSpec2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 3.5 * bScale;
  ctx.stroke();

  // Screen border
  drawPolygon(ctx, screenFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3 : 2.4) * bScale;
  ctx.stroke();

  // Outer glow
  drawPolygon(ctx, screenFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // Screen bezel line
  const bzFrac = 0.06;
  const bzTL = { x: wtl.x + (wtr.x - wtl.x) * bzFrac + (wbl.x - wtl.x) * bzFrac, y: wtl.y + (wtr.y - wtl.y) * bzFrac + (wbl.y - wtl.y) * bzFrac };
  const bzTR = { x: wtr.x - (wtr.x - wtl.x) * bzFrac + (wbr.x - wtr.x) * bzFrac, y: wtr.y - (wtr.y - wtl.y) * bzFrac + (wbr.y - wtr.y) * bzFrac };
  const bzBR = { x: wbr.x - (wbr.x - wbl.x) * bzFrac + (wtr.x - wbr.x) * bzFrac, y: wbr.y - (wbr.y - wbl.y) * bzFrac + (wtr.y - wbr.y) * bzFrac };
  const bzBL = { x: wbl.x + (wbr.x - wbl.x) * bzFrac + (wtl.x - wbl.x) * bzFrac, y: wbl.y + (wbr.y - wbl.y) * bzFrac + (wtl.y - wbl.y) * bzFrac };
  drawPolygon(ctx, [bzTL, bzTR, bzBR, bzBL]);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Hinge line (where screen meets base, along right edge)
  ctx.beginPath();
  ctx.moveTo(rt.x, rt.y);
  ctx.lineTo(rb.x, rb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.45 : 0.3);
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // ── Icon + text on screen ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const screenCX = (wtl.x + wtr.x + wbl.x + wbr.x) / 4;
  const screenCY = (wtl.y + wtr.y + wbl.y + wbr.y) / 4;
  const rightEdgeLen = Math.hypot(rb.x - rt.x, rb.y - rt.y) || 1;
  const screenBasisX = { x: (rb.x - rt.x) / rightEdgeLen, y: (rb.y - rt.y) / rightEdgeLen };

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

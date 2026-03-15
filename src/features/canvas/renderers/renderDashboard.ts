import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a large glass dashboard wall panel in isometric.
 *
 * The panel **rises vertically from the right edge** (rt→rb) of the isoQuad,
 * matching the Chart Panel orientation so all wall-panels face the same way.
 * A translucent floor reflection mirrors the front face onto the iso plane.
 */
export function renderDashboard(
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

  // ── Panel rises from right edge (rt→rb) — same as ChartPanel ──
  const panelH = node.height * 0.82 * camera.zoom;
  const tiltBack = node.width * 0.04 * camera.zoom;

  const wbl = rt;
  const wbr = rb;
  const wtl = { x: rt.x - bx.x * tiltBack, y: rt.y - panelH - bx.y * tiltBack };
  const wtr = { x: rb.x - bx.x * tiltBack, y: rb.y - panelH - bx.y * tiltBack };

  // Side thickness
  const sideDepth = 5 * camera.zoom;
  const wblT = { x: wbl.x - by.x * sideDepth, y: wbl.y - by.y * sideDepth };
  const wtlT = { x: wtl.x - by.x * sideDepth, y: wtl.y - by.y * sideDepth };

  // Helper: bilinear on panel face
  const panelPt = (u: number, v: number) => ({
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
    reflGrad.addColorStop(0, hexToRgba(deepTone, 0.24));
    reflGrad.addColorStop(0.7, hexToRgba(deepTone, 0.12));
    reflGrad.addColorStop(1, hexToRgba(deepTone, 0.05));
  } else {
    reflGrad.addColorStop(0, hexToRgba(faceFill, 0.30));
    reflGrad.addColorStop(0.7, hexToRgba(faceFill, 0.14));
    reflGrad.addColorStop(1, hexToRgba(faceFill, 0.05));
  }
  ctx.fillStyle = reflGrad;
  ctx.fill();
  drawPolygon(ctx, [rwtl, rwtr, rwbr, rwbl]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.20 : 0.25);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [wbl, wbr, wtr, wtl]);
    ctx.shadowColor = 'rgba(0,0,0,0.30)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left edge thickness ──
  drawPolygon(ctx, [wtl, wbl, wblT, wtlT]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.65) : hexToRgba(faceFill, 0.10);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.06);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── Main panel face ──
  const panelFace = [wtl, wtr, wbr, wbl];
  drawPolygon(ctx, panelFace);
  const grad = ctx.createLinearGradient(wtl.x, wtl.y, wbl.x, wbl.y);
  if (light) {
    grad.addColorStop(0, deepToneLit);
    grad.addColorStop(0.35, deepToneMid);
    grad.addColorStop(1, deepTone);
  } else {
    grad.addColorStop(0, hexToRgba(faceFill, 0.65));
    grad.addColorStop(0.35, hexToRgba(faceFill, 0.38));
    grad.addColorStop(1, hexToRgba(faceFill, 0.14));
  }
  ctx.fillStyle = grad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.28 : 0.45) * pulse);
  ctx.shadowBlur = light ? (selected ? 22 : 16) : (selected ? 30 : 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Panel border
  drawPolygon(ctx, panelFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.78 : 0.62));
  ctx.lineWidth = (selected ? 3 : 2) * bScale;
  ctx.stroke();
  // Outer glow
  drawPolygon(ctx, panelFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.22 : (light ? 0.08 : 0.14));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Header toolbar (top ~7 %) ──
  const hdrFrac = 0.07;
  drawPolygon(ctx, [panelPt(0, 0), panelPt(1, 0), panelPt(1, hdrFrac), panelPt(0, hdrFrac)]);
  ctx.fillStyle = light ? hexToRgba(node.glowColor, 0.10) : hexToRgba(node.glowColor, 0.06);
  ctx.fill();
  ctx.beginPath();
  const hlL = panelPt(0, hdrFrac);
  const hlR = panelPt(1, hdrFrac);
  ctx.moveTo(hlL.x, hlL.y);
  ctx.lineTo(hlR.x, hlR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.15);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();
  // Header dots
  const dotColors = ['#ff5f57', '#ffbd2e', '#28c840'];
  for (let i = 0; i < 3; i++) {
    const d = panelPt(0.03 + i * 0.025, hdrFrac * 0.5);
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.6 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(dotColors[i], light ? 0.7 : 0.45);
    ctx.fill();
  }

  // ── Sidebar (left ~18 %) ──
  const sideW = 0.18;
  drawPolygon(ctx, [panelPt(0, hdrFrac), panelPt(sideW, hdrFrac), panelPt(sideW, 1), panelPt(0, 1)]);
  ctx.fillStyle = light ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.12)';
  ctx.fill();
  ctx.beginPath();
  const sT = panelPt(sideW, hdrFrac);
  const sB = panelPt(sideW, 1);
  ctx.moveTo(sT.x, sT.y);
  ctx.lineTo(sB.x, sB.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.12 : 0.08);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const y = hdrFrac + 0.06 + i * 0.07;
    const lp = panelPt(0.03, y);
    const rp = panelPt(sideW - 0.03, y);
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.lineTo(rp.x, rp.y);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.06);
    ctx.lineWidth = 1.8 * bScale;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ── Content cards (2×2 grid) ──
  const contentL = sideW + 0.03;
  const contentR = 0.97;
  const contentT = hdrFrac + 0.04;
  const contentMidY = 0.52;
  const gap = 0.02;
  const midX = (contentL + contentR) / 2;
  const cards: [number, number, number, number][] = [
    [contentL, contentT, midX - gap, contentMidY - gap],
    [midX + gap, contentT, contentR, contentMidY - gap],
    [contentL, contentMidY + gap, midX - gap, 0.96],
    [midX + gap, contentMidY + gap, contentR, 0.96],
  ];
  for (const [cl, ct, cr, cb] of cards) {
    const tl = panelPt(cl, ct);
    const tr = panelPt(cr, ct);
    const br = panelPt(cr, cb);
    const bl = panelPt(cl, cb);
    drawPolygon(ctx, [tl, tr, br, bl]);
    ctx.fillStyle = light ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
    ctx.fill();
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.05);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();
  }

  // ── Line chart squiggle in bottom-right card ──
  const chartPts = [0, 0.15, 0.30, 0.50, 0.65, 0.80, 1.0];
  const chartVals = [0.6, 0.42, 0.55, 0.30, 0.65, 0.48, 0.72];
  const cCL = midX + gap;
  const cCT = contentMidY + gap + 0.04;
  const cCR = contentR - 0.02;
  const cCB = 0.92;
  ctx.beginPath();
  for (let i = 0; i < chartPts.length; i++) {
    const u = cCL + (cCR - cCL) * chartPts[i];
    const v = cCB - (cCB - cCT) * chartVals[i];
    const p = panelPt(u, v);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.45 : 0.35);
  ctx.lineWidth = 1.5 * bScale;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // ── Donut gauge decoration in bottom-left card ──
  const gaugeU = (contentL + midX - gap) / 2;
  const gaugeV = (contentMidY + gap + 0.96) / 2;
  const gCenter = panelPt(gaugeU, gaugeV);
  const gRadius = Math.max(6, (midX - gap - contentL) * leftEdgeLen * 0.18);
  ctx.beginPath();
  ctx.arc(gCenter.x, gCenter.y, gRadius, 0, Math.PI * 2);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.08 : 0.05);
  ctx.lineWidth = 3 * bScale;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(gCenter.x, gCenter.y, gRadius, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 1.44);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.55 : 0.40);
  ctx.lineWidth = 3 * bScale;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ── Metric bars in top-left card ──
  for (let i = 0; i < 3; i++) {
    const barY = contentT + 0.06 + i * 0.10;
    const barL = contentL + 0.02;
    const barFill = [0.7, 0.45, 0.6][i];
    const barR = barL + (midX - gap - contentL - 0.04) * barFill;
    const bl2 = panelPt(barL, barY);
    const br2 = panelPt(barR, barY);
    ctx.beginPath();
    ctx.moveTo(bl2.x, bl2.y);
    ctx.lineTo(br2.x, br2.y);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.30 : 0.18);
    ctx.lineWidth = 2.5 * bScale;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ── Leading edge glow (left vertical) ──
  ctx.beginPath();
  ctx.moveTo(wtl.x, wtl.y);
  ctx.lineTo(wbl.x, wbl.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.92);
  ctx.lineWidth = 2.4 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.40);
  ctx.shadowBlur = (light ? 3 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Top edge glow ──
  ctx.beginPath();
  ctx.moveTo(wtl.x, wtl.y);
  ctx.lineTo(wtr.x, wtr.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.65);
  ctx.lineWidth = 1.8 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.10 : 0.25);
  ctx.shadowBlur = (light ? 2 : 6) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const panelCX = (wtl.x + wtr.x + wbl.x + wbr.x) / 4;
  const panelCY = (wtl.y + wtr.y + wbl.y + wbr.y) / 4;
  const panelBasisX = by;

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.height, panelH / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 0.9;
    ctx.save();
    ctx.translate(panelCX, panelCY - panelH * 0.08);
    ctx.transform(panelBasisX.x, panelBasisX.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.85 : 0.65;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePt = { x: (wbl.x + wbr.x) / 2, y: (wbl.y + wbr.y) / 2 + 14 * camera.zoom };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.9);
    drawTransformedText(ctx, node.title, titlePt, panelBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = { x: titlePt.x, y: titlePt.y + scaledSize * 1.3 };
      drawTransformedText(ctx, node.subtitle, subPt, panelBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.78)}px Inter, sans-serif`);
    }
  }
}

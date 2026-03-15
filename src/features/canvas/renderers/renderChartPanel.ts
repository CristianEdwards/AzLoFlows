import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a small floating glass chart panel in isometric.
 *
 * The panel rises vertically from the **right edge** (rt→rb) of the isoQuad,
 * so it faces left / forward — useful as a secondary "pop-out" panel next to
 * a dashboard or monitor.
 *
 * Content: a faint line-chart with an animated glow, axis lines, and
 * optional data-point dots.
 */
export function renderChartPanel(
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

  // ── Panel rises from right edge (rt→rb) ──
  const panelH = node.width * 0.70 * camera.zoom;  // height proportional to width
  const tiltBack = node.height * 0.05 * camera.zoom;

  // Bottom corners = rt → rb
  const wbl = rt;
  const wbr = rb;
  // Top corners rise vertically upward (plus tiny lean along -bx)
  const wtl = { x: rt.x - bx.x * tiltBack, y: rt.y - panelH - bx.y * tiltBack };
  const wtr = { x: rb.x - bx.x * tiltBack, y: rb.y - panelH - bx.y * tiltBack };

  // Left-edge thickness (glass depth)
  const sideDepth = 20 * camera.zoom;
  const wblT = { x: wbl.x - by.x * sideDepth, y: wbl.y - by.y * sideDepth };
  const wtlT = { x: wtl.x - by.x * sideDepth, y: wtl.y - by.y * sideDepth };
  const wtrT = { x: wtr.x - by.x * sideDepth, y: wtr.y - by.y * sideDepth };
  const wbrT = { x: wbr.x - by.x * sideDepth, y: wbr.y - by.y * sideDepth };

  // Bottom edge thickness
  const bottomDepth = 12 * camera.zoom;
  const wblB = { x: wbl.x, y: wbl.y + bottomDepth };
  const wbrB = { x: wbr.x, y: wbr.y + bottomDepth };
  const wblTB = { x: wblT.x, y: wblT.y + bottomDepth };

  // Helper: bilinear on panel face
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
    drawPolygon(ctx, [wbl, wbr, wtr, wtl]);
    ctx.shadowColor = 'rgba(0,0,0,0.26)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Top edge face (slab top — lightest face, catches light) ──
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
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.40 : 0.30);
  ctx.lineWidth = 0.7 * bScale;
  ctx.stroke();

  // ── Bottom edge thickness (3D base — darkest face) ──
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
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.18 : 0.15);
  ctx.lineWidth = 0.7 * bScale;
  ctx.stroke();

  // Bottom-right edge strip
  drawPolygon(ctx, [wbr, wbrT, { x: wbrT.x, y: wbrT.y + bottomDepth }, wbrB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.82) : darkenHex(node.glowColor, 0.70);
  ctx.fill();

  // Bottom-left corner strip
  drawPolygon(ctx, [wblT, wbl, wblB, wblTB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.82) : darkenHex(node.glowColor, 0.65);
  ctx.fill();

  // ── Left edge thickness ── (side face — medium tone)
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
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.25);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Specular highlight on left edge
  ctx.beginPath();
  const dLMid1 = { x: wtl.x * 0.5 + wtlT.x * 0.5, y: wtl.y * 0.5 + wtlT.y * 0.5 };
  const dLMid2 = { x: wbl.x * 0.5 + wblT.x * 0.5, y: wbl.y * 0.5 + wblT.y * 0.5 };
  ctx.moveTo(dLMid1.x, dLMid1.y);
  ctx.lineTo(dLMid2.x, dLMid2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2.5 * bScale;
  ctx.stroke();

  // ── Main face ── (front surface — rich solid gradient)
  const face = [wtl, wtr, wbr, wbl];
  drawPolygon(ctx, face);
  const grad = ctx.createLinearGradient(wtl.x, wtl.y, wbl.x, wbl.y);
  if (light) {
    grad.addColorStop(0, deepToneLit);
    grad.addColorStop(0.4, deepToneMid);
    grad.addColorStop(1, deepTone);
  } else {
    grad.addColorStop(0, hexToRgba(node.glowColor, 0.85));
    grad.addColorStop(0.3, hexToRgba(node.glowColor, 0.55));
    grad.addColorStop(0.7, darkenHex(node.glowColor, 0.35));
    grad.addColorStop(1, darkenHex(node.glowColor, 0.55));
  }
  ctx.fillStyle = grad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.55) * pulse);
  ctx.shadowBlur = light ? (selected ? 24 : 16) : (selected ? 34 : 22);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Specular highlight diagonal on main face
  ctx.beginPath();
  const cpSpec1 = pp(0.15, 0.10);
  const cpSpec2 = pp(0.55, 0.65);
  ctx.moveTo(cpSpec1.x, cpSpec1.y);
  ctx.lineTo(cpSpec2.x, cpSpec2.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3.5 * bScale;
  ctx.stroke();

  // Border
  drawPolygon(ctx, face);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.75 : 0.68));
  ctx.lineWidth = (selected ? 2.5 : 1.8) * bScale;
  ctx.stroke();
  // Outer glow
  drawPolygon(ctx, face);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.20 : (light ? 0.07 : 0.16));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Chart title area (top ~10 %) ──
  const hdrFrac = 0.10;
  drawPolygon(ctx, [pp(0, 0), pp(1, 0), pp(1, hdrFrac), pp(0, hdrFrac)]);
  ctx.fillStyle = light ? hexToRgba(node.glowColor, 0.08) : hexToRgba(node.glowColor, 0.04);
  ctx.fill();
  // Separator line
  ctx.beginPath();
  const sl = pp(0, hdrFrac);
  const sr = pp(1, hdrFrac);
  ctx.moveTo(sl.x, sl.y);
  ctx.lineTo(sr.x, sr.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.18 : 0.10);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Axis lines ──
  const chartL = 0.10;
  const chartR = 0.92;
  const chartT = hdrFrac + 0.08;
  const chartB = 0.90;

  // Y axis
  ctx.beginPath();
  const yT = pp(chartL, chartT);
  const yB = pp(chartL, chartB);
  ctx.moveTo(yT.x, yT.y);
  ctx.lineTo(yB.x, yB.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.18 : 0.10);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();
  // X axis
  ctx.beginPath();
  const xL = pp(chartL, chartB);
  const xR = pp(chartR, chartB);
  ctx.moveTo(xL.x, xL.y);
  ctx.lineTo(xR.x, xR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.18 : 0.10);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Grid lines (horizontal) ──
  for (let i = 1; i <= 3; i++) {
    const gv = chartT + (chartB - chartT) * (i / 4);
    const gl = pp(chartL, gv);
    const gr = pp(chartR, gv);
    ctx.beginPath();
    ctx.moveTo(gl.x, gl.y);
    ctx.lineTo(gr.x, gr.y);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.06 : 0.03);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();
  }

  // ── Chart line (main data series — animated) ──
  const dataPoints = 7;
  const seed = node.zIndex * 1.3;
  const chartXPoints: { u: number; v: number }[] = [];
  for (let i = 0; i < dataPoints; i++) {
    const t = i / (dataPoints - 1);
    const u = chartL + (chartR - chartL) * t;
    // Sine wave + noise seeded by zIndex, animated
    const raw = 0.45 + Math.sin(seed + t * 4.5 + time * 0.0008) * 0.25
              + Math.sin(seed * 2.1 + t * 7) * 0.10;
    const v = chartB - (chartB - chartT) * Math.max(0.05, Math.min(0.95, raw));
    chartXPoints.push({ u, v });
  }

  // Fill area under line
  ctx.beginPath();
  const firstP = pp(chartXPoints[0].u, chartXPoints[0].v);
  ctx.moveTo(firstP.x, firstP.y);
  for (let i = 1; i < chartXPoints.length; i++) {
    const p = pp(chartXPoints[i].u, chartXPoints[i].v);
    ctx.lineTo(p.x, p.y);
  }
  // Close down to x axis
  const lastP = pp(chartXPoints[chartXPoints.length - 1].u, chartB);
  const firstBase = pp(chartXPoints[0].u, chartB);
  ctx.lineTo(lastP.x, lastP.y);
  ctx.lineTo(firstBase.x, firstBase.y);
  ctx.closePath();
  ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.08 : 0.05);
  ctx.fill();

  // Line stroke (glowing)
  ctx.beginPath();
  for (let i = 0; i < chartXPoints.length; i++) {
    const p = pp(chartXPoints[i].u, chartXPoints[i].v);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.75 : 0.60);
  ctx.lineWidth = 2 * bScale;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = hexToRgba(node.glowColor, 0.50 * pulse);
  ctx.shadowBlur = 8 * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Data-point dots
  for (let i = 0; i < chartXPoints.length; i++) {
    const p = pp(chartXPoints[i].u, chartXPoints[i].v);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = light ? node.glowColor : hexToRgba(node.glowColor, 0.80);
    ctx.fill();
  }

  // ── Leading edge glow (left vertical) ──
  ctx.beginPath();
  ctx.moveTo(wtl.x, wtl.y);
  ctx.lineTo(wbl.x, wbl.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.88);
  ctx.lineWidth = 2 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.12 : 0.35);
  ctx.shadowBlur = (light ? 3 : 8) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const panelCX = (wtl.x + wtr.x + wbl.x + wbr.x) / 4;
  const panelCY = (wtl.y + wtr.y + wbl.y + wbr.y) / 4;
  const panelBasisX = by; // along the panel face width (the by direction)

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.height, panelH / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 0.8;
    const hdrCenter = pp(0.5, hdrFrac * 0.5);
    ctx.save();
    ctx.translate(hdrCenter.x, hdrCenter.y);
    ctx.transform(panelBasisX.x, panelBasisX.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.80 : 0.55;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePt = { x: (wbl.x + wbr.x) / 2, y: (wbl.y + wbr.y) / 2 + 12 * camera.zoom };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, panelBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = { x: titlePt.x, y: titlePt.y + scaledSize * 1.2 };
      drawTransformedText(ctx, node.subtitle, subPt, panelBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.72)' : hexToRgba(node.glowColor, 0.92),
        `600 ${Math.round(scaledSize * 0.78)}px Inter, sans-serif`);
    }
  }
}

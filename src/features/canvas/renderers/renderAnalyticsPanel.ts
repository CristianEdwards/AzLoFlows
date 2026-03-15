import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an isometric analytics panel with header bar, line chart and pie chart.
 * Same panel orientation as Browser / Dashboard — rises from right edge (rt→rb).
 */
export function renderAnalyticsPanel(
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
  const panelR = Math.min(14, (topEdgeLen + leftEdgeLen) * 0.045);

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // ── Panel rises from right edge (rt→rb) ──
  const windowH = node.height * 0.7 * camera.zoom;
  const tiltBack = node.width * 0.05 * camera.zoom;

  const wbl = rt;
  const wbr = rb;
  const wtl = { x: rt.x - bx.x * tiltBack, y: rt.y - windowH - bx.y * tiltBack };
  const wtr = { x: rb.x - bx.x * tiltBack, y: rb.y - windowH - bx.y * tiltBack };

  // Left-edge thickness
  const sideDepth = 30 * camera.zoom;
  const wblT = { x: wbl.x - by.x * sideDepth, y: wbl.y - by.y * sideDepth };
  const wtlT = { x: wtl.x - by.x * sideDepth, y: wtl.y - by.y * sideDepth };
  const wtrT = { x: wtr.x - by.x * sideDepth, y: wtr.y - by.y * sideDepth };
  const wbrT = { x: wbr.x - by.x * sideDepth, y: wbr.y - by.y * sideDepth };

  // Bottom-edge thickness
  const bottomDepth = 18 * camera.zoom;
  const wblB = { x: wbl.x, y: wbl.y + bottomDepth };
  const wbrB = { x: wbr.x, y: wbr.y + bottomDepth };
  const wblTB = { x: wblT.x, y: wblT.y + bottomDepth };

  // Helper: bilinear on panel face
  const pp = (u: number, v: number) => ({
    x: wtl.x + (wtr.x - wtl.x) * u + (wbl.x - wtl.x) * v,
    y: wtl.y + (wtr.y - wtl.y) * u + (wbl.y - wtl.y) * v,
  });

  // ── Behind-panel reflection ──
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
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Top edge face ──
  drawRoundedPolygon(ctx, [wtlT, wtl, wtr, wtrT], panelR);
  if (light) {
    const gTop = ctx.createLinearGradient(wtlT.x, wtlT.y, wtr.x, wtr.y);
    gTop.addColorStop(0, lightenHex(deepTone, 0.18));
    gTop.addColorStop(1, deepTone);
    ctx.fillStyle = gTop;
  } else {
    const gTop = ctx.createLinearGradient(wtlT.x, wtlT.y, wtr.x, wtr.y);
    gTop.addColorStop(0, hexToRgba(node.glowColor, 0.65));
    gTop.addColorStop(0.5, hexToRgba(node.glowColor, 0.45));
    gTop.addColorStop(1, hexToRgba(node.glowColor, 0.30));
    ctx.fillStyle = gTop;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.40 : 0.30);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Bottom edge thickness ──
  drawRoundedPolygon(ctx, [wbl, wbr, wbrB, wblB], panelR * 0.5);
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.75);
  } else {
    const gBot = ctx.createLinearGradient(wbl.x, wbl.y, wblB.x, wblB.y);
    gBot.addColorStop(0, darkenHex(node.glowColor, 0.40));
    gBot.addColorStop(1, darkenHex(node.glowColor, 0.60));
    ctx.fillStyle = gBot;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.20 : 0.15);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Bottom-right edge strip ──
  drawPolygon(ctx, [wbr, wbrT, { x: wbrT.x, y: wbrT.y + bottomDepth }, wbrB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.82) : darkenHex(node.glowColor, 0.70);
  ctx.fill();

  // ── Bottom-left corner strip ──
  drawPolygon(ctx, [wblT, wbl, wblB, wblTB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.80) : darkenHex(node.glowColor, 0.65);
  ctx.fill();

  // ── Left edge thickness ──
  drawRoundedPolygon(ctx, [wtl, wbl, wblT, wtlT], panelR);
  if (light) {
    const gSide = ctx.createLinearGradient(wtlT.x, wtlT.y, wtl.x, wtl.y);
    gSide.addColorStop(0, lightenHex(deepTone, 0.10));
    gSide.addColorStop(1, darkenHex(deepTone, 0.50));
    ctx.fillStyle = gSide;
  } else {
    const gSide = ctx.createLinearGradient(wtlT.x, wtlT.y, wtl.x, wtl.y);
    gSide.addColorStop(0, hexToRgba(node.glowColor, 0.55));
    gSide.addColorStop(0.5, darkenHex(node.glowColor, 0.30));
    gSide.addColorStop(1, darkenHex(node.glowColor, 0.50));
    ctx.fillStyle = gSide;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.25);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Specular highlight on left edge
  ctx.beginPath();
  const seMid1 = { x: wtl.x * 0.5 + wtlT.x * 0.5, y: wtl.y * 0.5 + wtlT.y * 0.5 };
  const seMid2 = { x: wbl.x * 0.5 + wblT.x * 0.5, y: wbl.y * 0.5 + wblT.y * 0.5 };
  ctx.moveTo(seMid1.x, seMid1.y);
  ctx.lineTo(seMid2.x, seMid2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 3 * bScale;
  ctx.stroke();

  // ── Main window face ──
  const winFace = [wtl, wtr, wbr, wbl];
  drawRoundedPolygon(ctx, winFace, panelR);
  ctx.fillStyle = 'rgba(8, 14, 28, 0.88)';
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.55) * pulse);
  ctx.shadowBlur = light ? (selected ? 24 : 16) : (selected ? 34 : 24);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Subtle color overlay
  drawRoundedPolygon(ctx, winFace, panelR);
  const winGrad = ctx.createLinearGradient(wtl.x, wtl.y, wbl.x, wbl.y);
  if (light) {
    winGrad.addColorStop(0, deepToneLit);
    winGrad.addColorStop(0.3, deepToneMid);
    winGrad.addColorStop(1, deepTone);
  } else {
    winGrad.addColorStop(0, hexToRgba(node.glowColor, 0.14));
    winGrad.addColorStop(0.4, hexToRgba(node.glowColor, 0.06));
    winGrad.addColorStop(1, hexToRgba(node.glowColor, 0.10));
  }
  ctx.fillStyle = winGrad;
  ctx.fill();

  // Specular highlights
  ctx.beginPath();
  ctx.moveTo(pp(0.15, 0.10).x, pp(0.15, 0.10).y);
  ctx.lineTo(pp(0.55, 0.65).x, pp(0.55, 0.65).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 4 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pp(0.20, 0.08).x, pp(0.20, 0.08).y);
  ctx.lineTo(pp(0.60, 0.62).x, pp(0.60, 0.62).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2 * bScale;
  ctx.stroke();

  // Window border
  drawRoundedPolygon(ctx, winFace, panelR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.85 : 0.72));
  ctx.lineWidth = (selected ? 3 : 2.2) * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.40);
  ctx.shadowBlur = (light ? 4 : 12) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Outer glow
  drawRoundedPolygon(ctx, winFace, panelR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.15));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Title bar (top ~8%) ──
  const tbFrac = 0.08;
  drawPolygon(ctx, [pp(0, 0), pp(1, 0), pp(1, tbFrac), pp(0, tbFrac)]);
  ctx.fillStyle = light ? hexToRgba(node.glowColor, 0.12) : hexToRgba(node.glowColor, 0.08);
  ctx.fill();

  // Title bar separator
  ctx.beginPath();
  const tbL = pp(0, tbFrac);
  const tbR = pp(1, tbFrac);
  ctx.moveTo(tbL.x, tbL.y);
  ctx.lineTo(tbR.x, tbR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.3 : 0.18);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Traffic light dots
  const dotColors = ['#ff5f57', '#ffbd2e', '#28c840'];
  for (let i = 0; i < 3; i++) {
    const d = pp(0.04 + i * 0.035, tbFrac * 0.5);
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.8 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(dotColors[i], light ? 0.7 : 0.5);
    ctx.fill();
  }

  // ── Address bar (next ~6%) ──
  const abFrac = tbFrac + 0.06;
  const abInTL = pp(0.08, tbFrac + 0.012);
  const abInTR = pp(0.92, tbFrac + 0.012);
  const abInBL = pp(0.08, abFrac - 0.012);
  const abInBR = pp(0.92, abFrac - 0.012);
  drawPolygon(ctx, [abInTL, abInTR, abInBR, abInBL]);
  ctx.fillStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.08);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // Address bar separator
  ctx.beginPath();
  const abL = pp(0, abFrac);
  const abR = pp(1, abFrac);
  ctx.moveTo(abL.x, abL.y);
  ctx.lineTo(abR.x, abR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.08);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;

  // ── Content area: Line chart (left half) + Pie chart (right half) ──
  const contentTop = abFrac + 0.04;

  if (showDetail) {
    // Subtle horizontal grid lines across the content area
    const gridAlpha = light ? 0.08 : 0.04;
    for (let i = 0; i < 4; i++) {
      const gy = contentTop + i * 0.13;
      ctx.beginPath();
      ctx.moveTo(pp(0.06, gy).x, pp(0.06, gy).y);
      ctx.lineTo(pp(0.94, gy).x, pp(0.94, gy).y);
      ctx.strokeStyle = hexToRgba(node.glowColor, gridAlpha);
      ctx.lineWidth = 0.5 * bScale;
      ctx.stroke();
    }

    // Line chart data points (left half of content area)
    const chartPts = [
      { u: 0.06, v: contentTop + 0.42 },
      { u: 0.14, v: contentTop + 0.30 },
      { u: 0.22, v: contentTop + 0.36 },
      { u: 0.30, v: contentTop + 0.18 },
      { u: 0.38, v: contentTop + 0.24 },
      { u: 0.46, v: contentTop + 0.10 },
    ];

    // Draw line chart polyline
    ctx.beginPath();
    const firstPt = pp(chartPts[0].u, chartPts[0].v);
    ctx.moveTo(firstPt.x, firstPt.y);
    for (let i = 1; i < chartPts.length; i++) {
      const pt = pp(chartPts[i].u, chartPts[i].v);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.85 : 0.70);
    ctx.lineWidth = 2 * bScale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw data point dots
    for (const cp of chartPts) {
      const pt = pp(cp.u, cp.v);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.9 : 0.6);
      ctx.fill();
    }

    // Pie chart (right half of content area)
    const pieCenter = pp(0.74, contentTop + 0.26);
    const pieR = Math.min(topEdgeLen, leftEdgeLen) * 0.09;
    const slices = [
      { start: 0, end: 0.38, color: node.glowColor, alpha: light ? 0.85 : 0.65 },
      { start: 0.38, end: 0.62, color: '#ff5f57', alpha: light ? 0.8 : 0.55 },
      { start: 0.62, end: 0.80, color: '#ffbd2e', alpha: light ? 0.8 : 0.55 },
      { start: 0.80, end: 0.92, color: '#28c840', alpha: light ? 0.8 : 0.55 },
      { start: 0.92, end: 1.0, color: '#a78bfa', alpha: light ? 0.8 : 0.55 },
    ];
    for (const s of slices) {
      ctx.beginPath();
      ctx.moveTo(pieCenter.x, pieCenter.y);
      ctx.arc(pieCenter.x, pieCenter.y, pieR,
        s.start * Math.PI * 2 - Math.PI / 2,
        s.end * Math.PI * 2 - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(s.color, s.alpha);
      ctx.fill();
    }
    // Pie border
    ctx.beginPath();
    ctx.arc(pieCenter.x, pieCenter.y, pieR, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.3 : 0.18);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();
  }

  // ── Leading edge glow ──
  ctx.beginPath();
  ctx.moveTo(wtl.x, wtl.y);
  ctx.lineTo(wbl.x, wbl.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.92);
  ctx.lineWidth = 2.4 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.4);
  ctx.shadowBlur = (light ? 3 : 8) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Top edge glow ──
  ctx.beginPath();
  ctx.moveTo(wtl.x, wtl.y);
  ctx.lineTo(wtr.x, wtr.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.60);
  ctx.lineWidth = 1.6 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.08 : 0.20);
  ctx.shadowBlur = (light ? 2 : 5) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Icon + text ──
  const panelCX = (wtl.x + wtr.x + wbl.x + wbr.x) / 4;
  const panelCY = (wtl.y + wtr.y + wbl.y + wbr.y) / 4;
  const panelBasisX = by;

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.height, windowH / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 1.2;
    ctx.save();
    ctx.translate(panelCX, panelCY);
    ctx.transform(panelBasisX.x, panelBasisX.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.75;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePt = { x: (wbl.x + wbr.x) / 2, y: (wbl.y + wbr.y) / 2 + 12 * camera.zoom };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.85);

    drawTransformedText(ctx, node.title, titlePt, panelBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = { x: titlePt.x, y: titlePt.y + scaledSize * 1.2 };
      drawTransformedText(ctx, node.subtitle, subPt, panelBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.8)}px Inter, sans-serif`);
    }
  }
}

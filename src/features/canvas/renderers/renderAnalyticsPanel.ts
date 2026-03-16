import { DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/** Height-factor converts node.height into screen-space vertical pixels. */
const SCREEN_H_FACTOR = 0.85;
/** World-unit thickness of the thin standing panel. */
const PANEL_THICK = 14;

/**
 * Renders a standing isometric monitor/panel with analytics content
 * (line chart + pie chart) on the vertical front face.
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
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;
  const screenH = node.width * SCREEN_H_FACTOR * camera.zoom;

  // ── Back bottom edge (far from viewer, at x = node.x) ──
  const bBL = worldToScreen({ x: node.x, y: node.y }, camera, viewport);
  const bBR = worldToScreen({ x: node.x, y: node.y + node.height }, camera, viewport);
  // ── Front bottom edge (toward viewer, shifted by thickness in iso-X) ──
  const fBL = worldToScreen({ x: node.x + PANEL_THICK, y: node.y }, camera, viewport);
  const fBR = worldToScreen({ x: node.x + PANEL_THICK, y: node.y + node.height }, camera, viewport);
  // ── Top edges (straight up by screenH) ──
  const fTL = { x: fBL.x, y: fBL.y - screenH };
  const fTR = { x: fBR.x, y: fBR.y - screenH };
  const bTL = { x: bBL.x, y: bBL.y - screenH };
  const bTR = { x: bBR.x, y: bBR.y - screenH };

  const screenW = Math.hypot(fBR.x - fBL.x, fBR.y - fBL.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, screenW / 120));
  const cornerR = Math.min(8, screenW * 0.035);
  const bx = { x: (fBR.x - fBL.x) / screenW, y: (fBR.y - fBL.y) / screenW };
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';

  // Parametric mapping on front face: u 0→1 left→right, v 0→1 top→bottom
  const fp = (u: number, v: number) => ({
    x: fTL.x + (fTR.x - fTL.x) * u + (fBL.x - fTL.x) * v,
    y: fTL.y + (fTR.y - fTL.y) * u + (fBL.y - fTL.y) * v,
  });

  // ── Right side face (farthest from viewer) ──
  drawRoundedPolygon(ctx, [fTR, bTR, bBR, fBR], cornerR);
  const gRight = ctx.createLinearGradient(fTR.x, fTR.y, bBR.x, bBR.y);
  gRight.addColorStop(0, light ? darkenHex(deepTone, 0.50) : darkenHex(node.glowColor, 0.35));
  gRight.addColorStop(1, light ? darkenHex(deepTone, 0.70) : darkenHex(node.glowColor, 0.55));
  ctx.fillStyle = gRight; ctx.fill();

  // ── Top face (thin strip) ──
  drawRoundedPolygon(ctx, [bTL, bTR, fTR, fTL], cornerR);
  const gTop = ctx.createLinearGradient(bTL.x, bTL.y, fTR.x, fTR.y);
  gTop.addColorStop(0, light ? darkenHex(deepTone, 0.35) : darkenHex(node.glowColor, 0.20));
  gTop.addColorStop(1, light ? darkenHex(deepTone, 0.50) : darkenHex(node.glowColor, 0.35));
  ctx.fillStyle = gTop; ctx.fill();

  // ── Left side face ──
  drawRoundedPolygon(ctx, [bTL, bBL, fBL, fTL], cornerR);
  const gLeft = ctx.createLinearGradient(bTL.x, bTL.y, fBL.x, fBL.y);
  gLeft.addColorStop(0, light ? darkenHex(deepTone, 0.45) : darkenHex(node.glowColor, 0.25));
  gLeft.addColorStop(1, light ? darkenHex(deepTone, 0.65) : darkenHex(node.glowColor, 0.50));
  ctx.fillStyle = gLeft; ctx.fill();

  // ── Front face (the screen) ──
  drawRoundedPolygon(ctx, [fTL, fTR, fBR, fBL], cornerR);
  const gFront = ctx.createLinearGradient(fTL.x, fTL.y, fBR.x, fBR.y);
  gFront.addColorStop(0, light ? darkenHex(deepTone, 0.15) : darkenHex(node.glowColor, 0.10));
  gFront.addColorStop(1, light ? darkenHex(deepTone, 0.30) : darkenHex(node.glowColor, 0.25));
  ctx.fillStyle = gFront;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.30 : 0.50) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 12) : (selected ? 30 : 18);
  ctx.fill(); ctx.shadowBlur = 0;

  // ── Glass screen inset ──
  const si = 0.05;
  const scr = [fp(si, si), fp(1 - si, si), fp(1 - si, 1 - si), fp(si, 1 - si)];
  drawRoundedPolygon(ctx, scr, cornerR * 0.6);
  ctx.fillStyle = light ? 'rgba(200,230,255,0.12)' : hexToRgba(lightenHex(node.glowColor, 0.40), 0.10);
  ctx.fill();

  // Diagonal reflection
  ctx.beginPath();
  ctx.moveTo(fp(0.58, 0.08).x, fp(0.58, 0.08).y);
  ctx.lineTo(fp(0.22, 0.72).x, fp(0.22, 0.72).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 5 * bScale; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fp(0.64, 0.06).x, fp(0.64, 0.06).y);
  ctx.lineTo(fp(0.28, 0.70).x, fp(0.28, 0.70).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2.5 * bScale; ctx.stroke();

  // ── Front face border ──
  drawRoundedPolygon(ctx, [fTL, fTR, fBR, fBL], cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.80 : 0.65));
  ctx.lineWidth = (selected ? 2.8 : 2) * bScale; ctx.stroke();
  drawRoundedPolygon(ctx, [fTL, fTR, fBR, fBL], cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.20 : 0.10);
  ctx.lineWidth = (selected ? 5 : 3.5) * bScale; ctx.stroke();

  // ── Edge highlights ──
  ctx.beginPath(); ctx.moveTo(fTL.x, fTL.y); ctx.lineTo(fTR.x, fTR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.75); ctx.lineWidth = 2 * bScale; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fTL.x, fTL.y); ctx.lineTo(fBL.x, fBL.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.90); ctx.lineWidth = 2.5 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.12 : 0.40);
  ctx.shadowBlur = (light ? 3 : 8) * bScale; ctx.stroke(); ctx.shadowBlur = 0;

  // ── Screen content ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;

  // Header strip
  const hdr = 0.10;
  drawPolygon(ctx, [fp(si, si), fp(1 - si, si), fp(1 - si, si + hdr), fp(si, si + hdr)]);
  ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fp(si, si + hdr).x, fp(si, si + hdr).y);
  ctx.lineTo(fp(1 - si, si + hdr).x, fp(1 - si, si + hdr).y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.18);
  ctx.lineWidth = 0.8 * bScale; ctx.stroke();

  if (showDetail) {
    // Traffic lights
    const dotColors = ['#ff5f57', '#ffbd2e', '#28c840'];
    for (let i = 0; i < 3; i++) {
      const d = fp(si + 0.03 + i * 0.04, si + hdr * 0.5);
      ctx.beginPath(); ctx.arc(d.x, d.y, 2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(dotColors[i], light ? 0.75 : 0.55); ctx.fill();
    }

    // Grid lines
    const ct = si + hdr + 0.03;
    for (let i = 0; i < 4; i++) {
      const gv = ct + i * 0.18;
      ctx.beginPath();
      ctx.moveTo(fp(si + 0.02, gv).x, fp(si + 0.02, gv).y);
      ctx.lineTo(fp(1 - si - 0.02, gv).x, fp(1 - si - 0.02, gv).y);
      ctx.strokeStyle = hexToRgba(node.glowColor, 0.05);
      ctx.lineWidth = 0.5 * bScale; ctx.stroke();
    }

    // Line chart (left portion)
    const pts = [
      { u: si + 0.04, v: ct + 0.55 },
      { u: si + 0.11, v: ct + 0.38 },
      { u: si + 0.18, v: ct + 0.44 },
      { u: si + 0.26, v: ct + 0.22 },
      { u: si + 0.33, v: ct + 0.30 },
      { u: si + 0.40, v: ct + 0.14 },
    ];
    ctx.beginPath();
    const p0 = fp(pts[0].u, pts[0].v);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < pts.length; i++) { const p = fp(pts[i].u, pts[i].v); ctx.lineTo(p.x, p.y); }
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.80 : 0.65);
    ctx.lineWidth = 2 * bScale; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    for (const cp of pts) {
      const p = fp(cp.u, cp.v);
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.85 : 0.60); ctx.fill();
    }

    // Pie chart (right portion)
    const pc = fp(0.72, ct + 0.36);
    const pr = screenW * 0.08;
    const slices = [
      { s: 0, e: 0.38, c: node.glowColor, a: light ? 0.80 : 0.60 },
      { s: 0.38, e: 0.62, c: '#ff5f57', a: light ? 0.75 : 0.50 },
      { s: 0.62, e: 0.80, c: '#ffbd2e', a: light ? 0.75 : 0.50 },
      { s: 0.80, e: 0.92, c: '#28c840', a: light ? 0.75 : 0.50 },
      { s: 0.92, e: 1.0, c: '#a78bfa', a: light ? 0.75 : 0.50 },
    ];
    for (const sl of slices) {
      ctx.beginPath(); ctx.moveTo(pc.x, pc.y);
      ctx.arc(pc.x, pc.y, pr, sl.s * Math.PI * 2 - Math.PI / 2, sl.e * Math.PI * 2 - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(sl.c, sl.a); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(pc.x, pc.y, pr, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.15); ctx.lineWidth = 0.6 * bScale; ctx.stroke();
  }

  // ── Icon + text ──
  const showDetailIcons = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const titlePos = fp(0.5, 0.48);
  const textDir = bx;
  const textStack = { x: 0, y: 1 };

  if (node.icon && nodeIconCatalog[node.icon] && showDetailIcons) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(screenW, screenH) * NODE_ICON_SCALE;
    const ic = fp(0.78, 0.50);
    ctx.save(); ctx.translate(ic.x, ic.y);
    ctx.transform(bx.x, bx.y, 0, 1, 0, 0);
    const s = iconSize / 32; ctx.scale(s, s); ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.85 : 0.65;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetailIcons) {
    const fs = node.fontSize ?? DEFAULT_FONT_SIZE;
    const ss = Math.round(fs * camera.zoom);
    drawTransformedText(ctx, node.title, titlePos, textDir, textStack, light ? 'rgba(255,255,255,0.95)' : '#fff', `600 ${ss}px Inter, sans-serif`);
    if (node.subtitle) {
      const sp = { x: titlePos.x, y: titlePos.y + 18 };
      drawTransformedText(ctx, node.subtitle, sp, textDir, textStack, light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95), `600 ${Math.round(ss * 0.8)}px Inter, sans-serif`);
    }
  }
}

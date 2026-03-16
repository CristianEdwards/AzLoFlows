import { getTextRatios } from '@/lib/geometry/textPosition';
import { DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

const SCREEN_H_FACTOR = 0.85;
const PANEL_THICK = 0;

/**
 * Renders a standing isometric monitor/panel with a line chart
 * (axes, area fill, data points) on the vertical front face.
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
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;
  const screenH = node.width * SCREEN_H_FACTOR * camera.zoom;

  const bBL = worldToScreen({ x: node.x, y: node.y }, camera, viewport);
  const bBR = worldToScreen({ x: node.x, y: node.y + node.height }, camera, viewport);
  const fBL = worldToScreen({ x: node.x + PANEL_THICK, y: node.y }, camera, viewport);
  const fBR = worldToScreen({ x: node.x + PANEL_THICK, y: node.y + node.height }, camera, viewport);
  const fTL = { x: fBL.x, y: fBL.y - screenH };
  const fTR = { x: fBR.x, y: fBR.y - screenH };
  const bTL = { x: bBL.x, y: bBL.y - screenH };
  const bTR = { x: bBR.x, y: bBR.y - screenH };

  const screenW = Math.hypot(fBR.x - fBL.x, fBR.y - fBL.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, screenW / 120));
  const cornerR = Math.min(8, screenW * 0.035);
  const bx = { x: (fBR.x - fBL.x) / screenW, y: (fBR.y - fBL.y) / screenW };
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';

  const fp = (u: number, v: number) => ({
    x: fTL.x + (fTR.x - fTL.x) * u + (fBL.x - fTL.x) * v,
    y: fTL.y + (fTR.y - fTL.y) * u + (fBL.y - fTL.y) * v,
  });

  // ── Right side face ──
  drawPolygon(ctx, [fTR, bTR, bBR, fBR]);
  const gRight = ctx.createLinearGradient(fTR.x, fTR.y, bBR.x, bBR.y);
  gRight.addColorStop(0, light ? darkenHex(deepTone, 0.50) : darkenHex(node.glowColor, 0.35));
  gRight.addColorStop(1, light ? darkenHex(deepTone, 0.70) : darkenHex(node.glowColor, 0.55));
  ctx.fillStyle = gRight; ctx.fill();

  // ── Top face (thin strip) ──
  drawPolygon(ctx, [bTL, bTR, fTR, fTL]);
  const gTop = ctx.createLinearGradient(bTL.x, bTL.y, fTR.x, fTR.y);
  gTop.addColorStop(0, light ? darkenHex(deepTone, 0.35) : darkenHex(node.glowColor, 0.20));
  gTop.addColorStop(1, light ? darkenHex(deepTone, 0.50) : darkenHex(node.glowColor, 0.35));
  ctx.fillStyle = gTop; ctx.fill();

  // ── Left side face ──
  drawPolygon(ctx, [bTL, bBL, fBL, fTL]);
  const gLeft = ctx.createLinearGradient(bTL.x, bTL.y, fBL.x, fBL.y);
  gLeft.addColorStop(0, light ? darkenHex(deepTone, 0.45) : darkenHex(node.glowColor, 0.25));
  gLeft.addColorStop(1, light ? darkenHex(deepTone, 0.65) : darkenHex(node.glowColor, 0.50));
  ctx.fillStyle = gLeft; ctx.fill();

  // ── Front face (screen) ──
  drawPolygon(ctx, [fTL, fTR, fBR, fBL]);
  const gFront = ctx.createLinearGradient(fTL.x, fTL.y, fBR.x, fBR.y);
  gFront.addColorStop(0, light ? darkenHex(deepTone, 0.15) : darkenHex(node.glowColor, 0.10));
  gFront.addColorStop(1, light ? darkenHex(deepTone, 0.30) : darkenHex(node.glowColor, 0.25));
  ctx.fillStyle = gFront;
  
  
  ctx.fill(); 

  // ── Glass screen inset ──
  const si = 0.05;
  const scr = [fp(si, si), fp(1 - si, si), fp(1 - si, 1 - si), fp(si, 1 - si)];
  drawPolygon(ctx, scr);
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
  drawPolygon(ctx, [fTL, fTR, fBR, fBL]);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.80 : 0.65));
  ctx.lineWidth = (selected ? 2.8 : 2) * bScale; ctx.stroke();
  drawPolygon(ctx, [fTL, fTR, fBR, fBL]);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.20 : 0.10);
  ctx.lineWidth = (selected ? 5 : 3.5) * bScale; ctx.stroke();

  // ── Edge highlights ──
  ctx.beginPath(); ctx.moveTo(fTL.x, fTL.y); ctx.lineTo(fTR.x, fTR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.75); ctx.lineWidth = 2 * bScale; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fTL.x, fTL.y); ctx.lineTo(fBL.x, fBL.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.90); ctx.lineWidth = 2.5 * bScale;
  
   ctx.stroke(); 

  // ── Chart content ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail) {
    const cL = si + 0.08;
    const cR = 1 - si - 0.06;
    const cT = si + 0.10;
    const cB = 1 - si - 0.10;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(fp(cL, cT).x, fp(cL, cT).y);
    ctx.lineTo(fp(cL, cB).x, fp(cL, cB).y);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.18);
    ctx.lineWidth = 0.8 * bScale; ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(fp(cL, cB).x, fp(cL, cB).y);
    ctx.lineTo(fp(cR, cB).x, fp(cR, cB).y);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.18);
    ctx.lineWidth = 0.8 * bScale; ctx.stroke();

    // Horizontal grid lines
    for (let i = 1; i <= 3; i++) {
      const gy = cT + (cB - cT) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(fp(cL, gy).x, fp(cL, gy).y);
      ctx.lineTo(fp(cR, gy).x, fp(cR, gy).y);
      ctx.strokeStyle = hexToRgba(node.glowColor, 0.06);
      ctx.lineWidth = 0.5 * bScale; ctx.stroke();
    }

    // Data points
    const dataPoints = [0.6, 0.35, 0.7, 0.25, 0.55, 0.15, 0.45, 0.3];
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < dataPoints.length; i++) {
      const px = cL + (cR - cL) * (i / (dataPoints.length - 1));
      const py = cB - (cB - cT) * dataPoints[i];
      pts.push(fp(px, py));
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(fp(cL, cB).x, fp(cL, cB).y);
    for (const pt of pts) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(fp(cR, cB).x, fp(cR, cB).y);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.08);
    ctx.fill();

    // Chart line
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.60);
    ctx.lineWidth = 1.8 * bScale; ctx.lineJoin = 'round'; ctx.stroke();

    // Dots
    for (const pt of pts) {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(node.glowColor, 0.50); ctx.fill();
    }
  }

  // ── Icon + text ──
  const showDetailIcons = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textRatios = getTextRatios(node, 0.48);
  const titlePos = fp(textRatios.x, textRatios.y);
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

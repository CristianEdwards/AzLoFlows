import { DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

const SCREEN_H_FACTOR = 0.85;

/**
 * Renders a standing isometric node without flat/thickness limits.
 */
export function renderStandingNode(
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

  // 3D Box corners (reduced depth)
  const depth = node.width * 0.03; // very thin panel depth
  const p0 = worldToScreen({ x: node.x, y: node.y }, camera, viewport); // Top
  const p1 = worldToScreen({ x: node.x, y: node.y + node.height }, camera, viewport); // Left
  const p2 = worldToScreen({ x: node.x + depth, y: node.y + node.height }, camera, viewport); // Bottom
  const p3 = worldToScreen({ x: node.x + depth, y: node.y }, camera, viewport); // Right

  const t0 = { x: p0.x, y: p0.y - screenH };
  const t1 = { x: p1.x, y: p1.y - screenH };
  const t2 = { x: p2.x, y: p2.y - screenH };
  const t3 = { x: p3.x, y: p3.y - screenH };

  const deepTone = light ? deepToneForGlow(node.glowColor) : '';

  // Right Face (Thickness side) 
  drawPolygon(ctx, [t1, t2, p2, p1]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.4) : darkenHex(node.glowColor, 0.45);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.3);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top Face (Thickness top) 
  drawPolygon(ctx, [t0, t3, t2, t1]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.3) : darkenHex(node.glowColor, 0.20);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Front face mapping for text and UI
  const fBL = p0;
  const fBR = p1;
  const fTL = t0;
  const fTR = t1;

  const screenW = Math.hypot(fBR.x - fBL.x, fBR.y - fBL.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, screenW / 120));
  const bx = { x: (fBR.x - fBL.x) / screenW, y: (fBR.y - fBL.y) / screenW };    



  const fp = (u: number, v: number) => ({
    x: fTL.x + (fTR.x - fTL.x) * u + (fBL.x - fTL.x) * v,
    y: fTL.y + (fTR.y - fTL.y) * u + (fBL.y - fTL.y) * v,
  });

  // ── Front face (screen) ──
  drawPolygon(ctx, [fTL, fTR, fBR, fBL]);
  const gFront = ctx.createLinearGradient(fTL.x, fTL.y, fBR.x, fBR.y);
  gFront.addColorStop(0, light ? darkenHex(deepTone, 0.15) : darkenHex(node.glowColor, 0.10));
  gFront.addColorStop(1, light ? darkenHex(deepTone, 0.30) : darkenHex(node.glowColor, 0.25));
  ctx.fillStyle = gFront;
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

  // ── Icon + text ──
  const showDetailIcons = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const titlePos = fp(0.5, 0.48);
  const textDir = bx;
  const textStack = { x: 0, y: 1 };

  if (node.icon && nodeIconCatalog[node.icon] && showDetailIcons) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(screenW, screenH) * NODE_ICON_SCALE;
    const ic = fp(0.5, 0.35); // Center icon slightly above title
    ctx.save(); ctx.translate(ic.x, ic.y);
    ctx.transform(bx.x, bx.y, 0, 1, 0, 0);
    const s = iconSize / 32; ctx.scale(s, s); ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.85 : 0.65;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
    
    // adjust title position if we have an icon
    titlePos.x = fp(0.5, 0.65).x;
    titlePos.y = fp(0.5, 0.65).y;
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

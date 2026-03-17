import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { lightenHex, darkenHex } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/**
 * Renders a database shape in isometric using proven iso-box faces
 * (top, left, front) for guaranteed complete solid coverage, with
 * decorative band lines and indicator dots.
 */
export function renderDatabase(
  ctx: CanvasRenderingContext2D,
  node: NodeEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  _time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const pts = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
  const [lt, rt, rb, lb] = pts;
  const depth = NODE_DEPTH * 1.6 * camera.zoom;

  const topLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topLen + leftLen) * 0.5 / 120));

  const bx: Point = { x: (rt.x - lt.x) / topLen, y: (rt.y - lt.y) / topLen };

  // Depth-shifted corners
  const ltD: Point = { x: lt.x, y: lt.y + depth };
  const rtD: Point = { x: rt.x, y: rt.y + depth };
  const rbD: Point = { x: rb.x, y: rb.y + depth };
  const lbD: Point = { x: lb.x, y: lb.y + depth };

  const base = node.fill;
  const glow = node.glowColor;

  /* ═══ SOLID BOX FACES ═══════════════════════════════════════ */

  /* ── Left face ── */
  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  {
    const g = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    g.addColorStop(0, lightenHex(base, 0.15));
    g.addColorStop(1, darkenHex(base, 0.20));
    ctx.fillStyle = g;
  }
  ctx.fill();

  /* ── Front face ── */
  drawPolygon(ctx, [lb, rb, rbD, lbD]);
  {
    const g = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    g.addColorStop(0, darkenHex(base, 0.20));
    g.addColorStop(1, darkenHex(base, 0.38));
    ctx.fillStyle = g;
  }
  ctx.fill();

  /* ── Top face ── */
  drawPolygon(ctx, [lt, rt, rb, lb]);
  {
    const g = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
    g.addColorStop(0, lightenHex(base, 0.22));
    g.addColorStop(0.5, base);
    g.addColorStop(1, darkenHex(base, 0.12));
    ctx.fillStyle = g;
  }
  ctx.fill();

  /* ═══ DECORATIVE DETAILS ════════════════════════════════════ */

  const bandCount = 3;

  /* ── Horizontal bands on front face ── */
  for (let b = 1; b < bandCount; b++) {
    const t = b / bandCount;
    const p1: Point = { x: lb.x + (lbD.x - lb.x) * t, y: lb.y + (lbD.y - lb.y) * t };
    const p2: Point = { x: rb.x + (rbD.x - rb.x) * t, y: rb.y + (rbD.y - rb.y) * t };
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + 1.5 * camera.zoom);
    ctx.lineTo(p2.x, p2.y + 1.5 * camera.zoom);
    ctx.strokeStyle = darkenHex(base, 0.50);
    ctx.lineWidth = 2 * bScale;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = lightenHex(glow, 0.05);
    ctx.lineWidth = 1 * bScale;
    ctx.stroke();
  }

  /* ── Horizontal bands on left face ── */
  for (let b = 1; b < bandCount; b++) {
    const t = b / bandCount;
    const p1: Point = { x: lt.x + (ltD.x - lt.x) * t, y: lt.y + (ltD.y - lt.y) * t };
    const p2: Point = { x: lb.x + (lbD.x - lb.x) * t, y: lb.y + (lbD.y - lb.y) * t };
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + 1.5 * camera.zoom);
    ctx.lineTo(p2.x, p2.y + 1.5 * camera.zoom);
    ctx.strokeStyle = darkenHex(base, 0.40);
    ctx.lineWidth = 2 * bScale;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = lightenHex(glow, 0.02);
    ctx.lineWidth = 1 * bScale;
    ctx.stroke();
  }

  /* ── Indicator dots on front face ── */
  for (let b = 0; b < bandCount; b++) {
    const t = (b + 0.5) / bandCount;
    const dotPt: Point = {
      x: lb.x + (lbD.x - lb.x) * t + (rb.x - lb.x) * 0.08,
      y: lb.y + (lbD.y - lb.y) * t + (rb.y - lb.y) * 0.08,
    };
    const dr = 2.5 * camera.zoom;
    ctx.beginPath();
    ctx.arc(dotPt.x, dotPt.y, dr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc107';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dotPt.x - dr * 0.25, dotPt.y - dr * 0.25, dr * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff5cc';
    ctx.fill();
  }

  /* ── Specular on left face ── */
  {
    const sp1: Point = { x: lt.x * 0.7 + lb.x * 0.3, y: lt.y * 0.7 + lb.y * 0.3 };
    const sp2: Point = { x: ltD.x * 0.7 + lbD.x * 0.3, y: ltD.y * 0.7 + lbD.y * 0.3 };
    ctx.beginPath();
    ctx.moveTo(sp1.x, sp1.y);
    ctx.lineTo(sp2.x, sp2.y);
    ctx.strokeStyle = lightenHex(base, 0.18);
    ctx.lineWidth = 2 * bScale;
    ctx.stroke();
  }

  /* ── Face borders ── */
  drawPolygon(ctx, [lt, rt, rb, lb]);
  ctx.strokeStyle = selected ? lightenHex(glow, 0.10) : darkenHex(glow, 0.10);
  ctx.lineWidth = (selected ? 2.5 : 1.2) * bScale;
  ctx.stroke();

  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  ctx.strokeStyle = darkenHex(glow, 0.20);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  drawPolygon(ctx, [lb, rb, rbD, lbD]);
  ctx.strokeStyle = darkenHex(glow, 0.25);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  /* ── Specular on top face ── */
  {
    const tSpec1: Point = { x: lt.x * 0.55 + rt.x * 0.45, y: lt.y * 0.55 + rt.y * 0.45 };
    const tSpec2: Point = { x: lb.x * 0.45 + rb.x * 0.55, y: lb.y * 0.45 + rb.y * 0.55 };
    ctx.beginPath();
    ctx.moveTo(tSpec1.x, tSpec1.y);
    ctx.lineTo(tSpec2.x, tSpec2.y);
    ctx.strokeStyle = lightenHex(base, 0.18);
    ctx.lineWidth = 2.5 * bScale;
    ctx.stroke();
  }

  /* ═══ TITLE TEXT ════════════════════════════════════════════ */

  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail && node.title !== 'New Node') {
    const { x: rx, y: ry } = getTextRatios(node, 0.50);
    const titlePt: Point = {
      x: lt.x + (rt.x - lt.x) * rx + (lb.x - lt.x) * ry,
      y: lt.y + (rt.y - lt.y) * rx + (lb.y - lt.y) * ry + depth + 12 * camera.zoom,
    };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, bx, { x: 0, y: 1 },
      light ? '#ffffffee' : glow,
      `600 ${scaledSize}px Inter, sans-serif`);
  }
}
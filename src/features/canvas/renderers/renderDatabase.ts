import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { lightenHex, darkenHex } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

const SEGS = 48; // segments per full ellipse – smooth at any zoom

/**
 * Renders an isometric cylinder (database shape) using a 3-layer
 * painting approach that guarantees complete solid coverage:
 *   1. Bottom ellipse fill  (catches any sub-pixel leaks)
 *   2. Front wall path      (right edge → bottom arc → left edge)
 *   3. Top ellipse fill     (cap – hides the chord)
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

  // Ellipse centre & half-axes (iso-projected)
  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const hx: Point = { x: -(rt.x - lt.x) / 2, y: -(rt.y - lt.y) / 2 };
  const hy: Point = { x: -(lb.x - lt.x) / 2, y: -(lb.y - lt.y) / 2 };

  const topLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topLen + leftLen) * 0.5 / 120));
  const bx: Point = { x: (rt.x - lt.x) / topLen, y: (rt.y - lt.y) / topLen };

  const base = node.fill;
  const glow = node.glowColor;

  // Helper: point on ellipse at angle t (centre + offset dy for depth)
  const ePt = (t: number, dy: number): Point => ({
    x: cx + Math.cos(t) * hx.x + Math.sin(t) * hy.x,
    y: cy + Math.cos(t) * hx.y + Math.sin(t) * hy.y + dy,
  });

  // Pre-compute top & bottom ellipse point arrays
  const topE: Point[] = [];
  const botE: Point[] = [];
  for (let i = 0; i <= SEGS; i++) {
    const a = (i / SEGS) * Math.PI * 2;
    topE.push(ePt(a, 0));
    botE.push(ePt(a, depth));
  }

  /* ═══ LAYER 1 – Bottom ellipse (solid dark background) ══════ */
  ctx.beginPath();
  ctx.moveTo(botE[0].x, botE[0].y);
  for (let i = 1; i <= SEGS; i++) ctx.lineTo(botE[i].x, botE[i].y);
  ctx.closePath();
  ctx.fillStyle = darkenHex(base, 0.35);
  ctx.fill();

  /* ═══ LAYER 2 – Front wall ════════════════════════════════════
   * Path: right of top → straight down → front arc of bottom
   *        (right→left) → straight up → close.
   * "Front" = indices 0 → SEGS/2 (angle 0 → π), which sweeps
   * through the +hy direction (toward the viewer in iso).        */
  const half = SEGS / 2;
  ctx.beginPath();
  // Start at top-right of ellipse (angle 0)
  ctx.moveTo(topE[0].x, topE[0].y);
  // Right edge down to bottom-right
  ctx.lineTo(botE[0].x, botE[0].y);
  // Front arc of bottom ellipse: right → front → left
  for (let i = 1; i <= half; i++) ctx.lineTo(botE[i].x, botE[i].y);
  // Left edge up to top-left
  ctx.lineTo(topE[half].x, topE[half].y);
  ctx.closePath();
  {
    const g = ctx.createLinearGradient(
      topE[0].x, topE[0].y,
      botE[half].x, botE[half].y,
    );
    g.addColorStop(0, darkenHex(base, 0.08));
    g.addColorStop(0.5, darkenHex(base, 0.22));
    g.addColorStop(1, darkenHex(base, 0.35));
    ctx.fillStyle = g;
  }
  ctx.fill();

  /* ═══ LAYER 3 – Top ellipse (cap) ════════════════════════════ */
  ctx.beginPath();
  ctx.moveTo(topE[0].x, topE[0].y);
  for (let i = 1; i <= SEGS; i++) ctx.lineTo(topE[i].x, topE[i].y);
  ctx.closePath();
  {
    const g = ctx.createLinearGradient(
      topE[SEGS * 3 / 4].x, topE[SEGS * 3 / 4].y,
      topE[SEGS / 4].x, topE[SEGS / 4].y,
    );
    g.addColorStop(0, lightenHex(base, 0.22));
    g.addColorStop(0.5, base);
    g.addColorStop(1, darkenHex(base, 0.10));
    ctx.fillStyle = g;
  }
  ctx.fill();

  /* ═══ DECORATIVE DETAILS ════════════════════════════════════ */

  // Elliptical band lines on the front wall
  const bandCount = 3;
  for (let b = 1; b < bandCount; b++) {
    const t = b / bandCount;
    const dy = depth * t;
    ctx.beginPath();
    const p0 = ePt(0, dy);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i <= half; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      const p = ePt(a, dy);
      ctx.lineTo(p.x, p.y);
    }
    // shadow line
    ctx.strokeStyle = darkenHex(base, 0.45);
    ctx.lineWidth = 2 * bScale;
    ctx.stroke();
    // highlight line (offset up slightly)
    ctx.beginPath();
    const q0 = ePt(0, dy - 1.5 * camera.zoom);
    ctx.moveTo(q0.x, q0.y);
    for (let i = 1; i <= half; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      const q = ePt(a, dy - 1.5 * camera.zoom);
      ctx.lineTo(q.x, q.y);
    }
    ctx.strokeStyle = lightenHex(glow, 0.04);
    ctx.lineWidth = 1 * bScale;
    ctx.stroke();
  }

  // Indicator dots along the front wall
  for (let b = 0; b < bandCount; b++) {
    const t = (b + 0.5) / bandCount;
    const dy = depth * t;
    // Place dot at ~15° from right edge on front arc
    const dotA = Math.PI * 0.08;
    const dotPt = ePt(dotA, dy);
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

  /* ═══ STROKES ═══════════════════════════════════════════════ */

  // Top ellipse border
  ctx.beginPath();
  ctx.moveTo(topE[0].x, topE[0].y);
  for (let i = 1; i <= SEGS; i++) ctx.lineTo(topE[i].x, topE[i].y);
  ctx.closePath();
  ctx.strokeStyle = selected ? lightenHex(glow, 0.10) : darkenHex(glow, 0.10);
  ctx.lineWidth = (selected ? 2.5 : 1.2) * bScale;
  ctx.stroke();

  // Front wall side edges + bottom arc
  ctx.beginPath();
  ctx.moveTo(topE[0].x, topE[0].y);
  ctx.lineTo(botE[0].x, botE[0].y);
  for (let i = 1; i <= half; i++) ctx.lineTo(botE[i].x, botE[i].y);
  ctx.lineTo(topE[half].x, topE[half].y);
  ctx.strokeStyle = darkenHex(glow, 0.20);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Specular highlight on front wall (vertical line near the right edge)
  {
    const specA = Math.PI * 0.15;
    const sp1 = ePt(specA, depth * 0.1);
    const sp2 = ePt(specA, depth * 0.9);
    ctx.beginPath();
    ctx.moveTo(sp1.x, sp1.y);
    ctx.lineTo(sp2.x, sp2.y);
    ctx.strokeStyle = lightenHex(base, 0.16);
    ctx.lineWidth = 2 * bScale;
    ctx.stroke();
  }

  // Specular highlight across top ellipse
  {
    const ts1 = ePt(Math.PI * 1.35, 0);
    const ts2 = ePt(Math.PI * 0.35, 0);
    ctx.beginPath();
    ctx.moveTo(ts1.x, ts1.y);
    ctx.lineTo(ts2.x, ts2.y);
    ctx.strokeStyle = lightenHex(base, 0.16);
    ctx.lineWidth = 2.5 * bScale;
    ctx.stroke();
  }

  /* ═══ TITLE TEXT ═════════════════════════════════════════════ */

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

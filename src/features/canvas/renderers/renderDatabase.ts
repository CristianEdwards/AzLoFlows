import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { lightenHex, darkenHex } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

const SEGS = 48;
const HALF = SEGS / 2;
const TIERS = 3;

/**
 * Renders an isometric database cylinder as 3 stacked disk tiers
 * (matching the reference SVG structure).  Each tier paints:
 *   1. Back wall half  (darker gradient)
 *   2. Front wall half (lighter gradient)
 *   3. Top cap ellipse (solid, painted last = frontmost)
 *
 * Wall halves explicitly trace ellipse arcs on both top and bottom
 * edges — closePath only ever draws a straight vertical side edge,
 * never a chord across an ellipse.  This eliminates all gaps.
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
  const totalDepth = NODE_DEPTH * 1.6 * camera.zoom;

  // Ellipse centre & half-axes
  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const hx: Point = { x: (lb.x - lt.x) / 2, y: (lb.y - lt.y) / 2 };
  const hy: Point = { x: -(rt.x - lt.x) / 2, y: -(rt.y - lt.y) / 2 };

  const topLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topLen + leftLen) * 0.5 / 120));
  const bx: Point = { x: (rt.x - lt.x) / topLen, y: (rt.y - lt.y) / topLen };

  const base = node.fill;
  const glow = node.glowColor;

  // Point on ellipse at parametric angle t, shifted down by dy
  const ePt = (t: number, dy: number): Point => ({
    x: cx + Math.cos(t) * hx.x + Math.sin(t) * hy.x,
    y: cy + Math.cos(t) * hx.y + Math.sin(t) * hy.y + dy,
  });

  // Build array of points for a full ellipse at vertical offset dy
  const buildE = (dy: number): Point[] => {
    const arr: Point[] = [];
    for (let i = 0; i <= SEGS; i++) {
      arr.push(ePt((i / SEGS) * Math.PI * 2, dy));
    }
    return arr;
  };

  /**
   * Fill one half of a cylindrical wall between topE and botE.
   *
   * Traces: top arc (from→to) → straight down → bottom arc (to→from) → closePath (straight up).
   * closePath only ever draws a vertical edge, never a chord across an ellipse.
   */
  const fillWallHalf = (
    topE: Point[], botE: Point[],
    from: number, to: number,
    style: string | CanvasGradient,
  ) => {
    ctx.beginPath();
    ctx.moveTo(topE[from].x, topE[from].y);
    // Top arc: from → to (forward)
    for (let i = from + 1; i <= to; i++) ctx.lineTo(topE[i].x, topE[i].y);
    // Straight down to bottom at 'to'
    ctx.lineTo(botE[to].x, botE[to].y);
    // Bottom arc: to → from (backward)
    for (let i = to - 1; i >= from; i--) ctx.lineTo(botE[i].x, botE[i].y);
    // closePath goes from botE[from] → topE[from] = straight vertical edge
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  };

  // Tier layout
  const tierH = totalDepth / TIERS;
  const wallH = tierH * 0.77;   // wall height within each tier
  // remaining 23% of tierH is the gap where the cap of the tier below peeks through

  /* ═══ PAINT TIERS (bottom → top so upper tiers cover lower) ═ */
  for (let tier = TIERS - 1; tier >= 0; tier--) {
    const topDy = tier * tierH;
    const botDy = topDy + wallH;
    const midDy = (topDy + botDy) / 2;
    const topE = buildE(topDy);
    const botE = buildE(botDy);

    /* ── Back wall half (indices HALF → SEGS) ──────────────── */
    {
      const lp = ePt(Math.PI * 1.5, midDy);
      const rp = ePt(Math.PI * 0.5, midDy);
      const g = ctx.createLinearGradient(lp.x, lp.y, rp.x, rp.y);
      g.addColorStop(0, darkenHex(base, 0.42));
      g.addColorStop(0.5, darkenHex(base, 0.32));
      g.addColorStop(1, darkenHex(base, 0.42));
      fillWallHalf(topE, botE, HALF, SEGS, g);
    }

    /* ── Front wall half (indices 0 → HALF) ────────────────── */
    {
      const lp = ePt(Math.PI * 1.5, midDy);
      const rp = ePt(Math.PI * 0.5, midDy);
      const g = ctx.createLinearGradient(lp.x, lp.y, rp.x, rp.y);
      g.addColorStop(0.00, darkenHex(base, 0.40));
      g.addColorStop(0.25, darkenHex(base, 0.28));
      g.addColorStop(0.65, darkenHex(base, 0.15));
      g.addColorStop(0.90, lightenHex(base, 0.05));
      g.addColorStop(1.00, darkenHex(base, 0.40));
      fillWallHalf(topE, botE, 0, HALF, g);
    }

    /* ── Top cap (full ellipse, painted last = frontmost) ───── */
    ctx.beginPath();
    ctx.moveTo(topE[0].x, topE[0].y);
    for (let i = 1; i <= SEGS; i++) ctx.lineTo(topE[i].x, topE[i].y);
    ctx.closePath();
    {
      const g = ctx.createLinearGradient(
        topE[SEGS * 3 / 4].x, topE[SEGS * 3 / 4].y,
        topE[SEGS / 4].x, topE[SEGS / 4].y,
      );
      g.addColorStop(0, lightenHex(base, 0.18));
      g.addColorStop(0.5, lightenHex(base, 0.05));
      g.addColorStop(1, darkenHex(base, 0.06));
      ctx.fillStyle = g;
    }
    ctx.fill();
    // Cap border
    ctx.strokeStyle = selected ? lightenHex(glow, 0.10) : darkenHex(glow, 0.15);
    ctx.lineWidth = (selected ? 2.5 : 1) * bScale;
    ctx.stroke();

    /* ── Indicator dot on front-left side ──────────────────────── */
    const dotPt = ePt(Math.PI * 0.92, midDy);
    const dr = 2.5 * camera.zoom;
    ctx.beginPath();
    ctx.arc(dotPt.x, dotPt.y, dr, 0, Math.PI * 2);
    ctx.fillStyle = '#abafb6';
    ctx.fill();
  }

  /* ═══ TITLE TEXT ═════════════════════════════════════════════ */
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail && node.title !== 'New Node') {
    const { x: rx, y: ry } = getTextRatios(node, 0.50);
    const titlePt: Point = {
      x: lt.x + (rt.x - lt.x) * rx + (lb.x - lt.x) * ry,
      y: lt.y + (rt.y - lt.y) * rx + (lb.y - lt.y) * ry + totalDepth + 12 * camera.zoom,
    };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, bx, { x: 0, y: 1 },
      light ? '#ffffffee' : glow,
      `600 ${scaledSize}px Inter, sans-serif`);
  }
}

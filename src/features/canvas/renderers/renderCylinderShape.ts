import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { lightenHex, darkenHex } from '@/lib/rendering/tokens';
import { getTextRatios } from '@/lib/geometry/textPosition';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/* ── geometry helpers ──────────────────────────────────────────── */

const SEGS = 48;

/** Full isometric ellipse (closed path). */
function ellipse(
  ctx: CanvasRenderingContext2D,
  c: Point, hx: Point, hy: Point,
) {
  ctx.beginPath();
  for (let i = 0; i <= SEGS; i++) {
    const t = (i / SEGS) * Math.PI * 2;
    const px = c.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x;
    const py = c.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Front-visible half of an ellipse (right → left across front). */
function halfEllipse(
  ctx: CanvasRenderingContext2D,
  c: Point, hx: Point, hy: Point,
) {
  ctx.beginPath();
  for (let i = 0; i <= SEGS / 2; i++) {
    const t = (i / SEGS) * Math.PI * 2;
    const px = c.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x;
    const py = c.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}

/**
 * Closed cylinder body: right edge down → front half of bottom ellipse
 * → left edge up → close.  Produces a solid quad-like shape covering
 * the entire visible front face of the cylinder.
 */
function body(
  ctx: CanvasRenderingContext2D,
  top: Point, bot: Point, hx: Point, hy: Point,
) {
  ctx.beginPath();
  // Start at right edge of top ellipse
  ctx.moveTo(top.x + hx.x, top.y + hx.y);
  // Right edge down to bottom
  ctx.lineTo(bot.x + hx.x, bot.y + hx.y);
  // Front half of bottom ellipse (right → front → left)
  for (let i = 0; i <= SEGS / 2; i++) {
    const t = (i / SEGS) * Math.PI * 2;
    ctx.lineTo(
      bot.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x,
      bot.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y,
    );
  }
  // Left edge up to top
  ctx.lineTo(top.x - hx.x, top.y - hx.y);
  // Back half of top ellipse (left → back → right) to close properly
  for (let i = SEGS / 2; i <= SEGS; i++) {
    const t = (i / SEGS) * Math.PI * 2;
    ctx.lineTo(
      top.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x,
      top.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y,
    );
  }
  ctx.closePath();
}

/* ── main renderer ─────────────────────────────────────────────── */

export function renderCylinderShape(
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
  const [lt, rt, _rb, lb] = pts;
  const depth = NODE_DEPTH * 1.4 * camera.zoom;

  const topLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topLen + leftLen) * 0.5 / 120));

  const bx: Point = { x: (rt.x - lt.x) / topLen, y: (rt.y - lt.y) / topLen };

  const center: Point = {
    x: (lt.x + rt.x + pts[2].x + lb.x) / 4,
    y: (lt.y + rt.y + pts[2].y + lb.y) / 4,
  };
  // Swap hx/hy to rotate the cylinder ellipse 90° right
  const hx: Point = { x: (lb.x - lt.x) / 2, y: (lb.y - lt.y) / 2 };
  const hy: Point = { x: (rt.x - lt.x) / 2, y: (rt.y - lt.y) / 2 };
  const bot: Point = { x: center.x, y: center.y + depth };

  const base = node.fill;
  const glow = node.glowColor;

  /* ── 0. Bottom ellipse fill (solid base layer — prevents gaps) ── */
  ellipse(ctx, bot, hx, hy);
  ctx.fillStyle = darkenHex(base, 0.25);
  ctx.fill();

  /* ── 1. Cylinder body fill (solid gradient, gentle L→R shading) ── */
  body(ctx, center, bot, hx, hy);
  const gBody = ctx.createLinearGradient(
    center.x - hx.x * 1.1, center.y - hx.y * 1.1,
    center.x + hx.x * 1.1, center.y + hx.y * 1.1,
  );
  if (light) {
    gBody.addColorStop(0, lightenHex(base, 0.20));
    gBody.addColorStop(0.4, base);
    gBody.addColorStop(0.75, darkenHex(base, 0.20));
    gBody.addColorStop(1, darkenHex(base, 0.30));
  } else {
    gBody.addColorStop(0, lightenHex(base, 0.22));
    gBody.addColorStop(0.4, base);
    gBody.addColorStop(0.75, darkenHex(base, 0.18));
    gBody.addColorStop(1, darkenHex(base, 0.28));
  }
  ctx.fillStyle = gBody;
  ctx.fill();

  /* ── 2. Body outline (single stroke around the filled body path) ── */
  body(ctx, center, bot, hx, hy);
  ctx.strokeStyle = darkenHex(glow, 0.25);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  /* ── 3. Subtle glossy highlight on left side of body ──────── */
  ctx.beginPath();
  const hlAngle = Math.PI * 0.72;
  const spTop: Point = {
    x: center.x + Math.cos(hlAngle) * hx.x * 0.85 + Math.sin(hlAngle) * hy.x * 0.85,
    y: center.y + Math.cos(hlAngle) * hx.y * 0.85 + Math.sin(hlAngle) * hy.y * 0.85,
  };
  const spBot: Point = {
    x: bot.x + Math.cos(hlAngle) * hx.x * 0.85 + Math.sin(hlAngle) * hy.x * 0.85,
    y: bot.y + Math.cos(hlAngle) * hx.y * 0.85 + Math.sin(hlAngle) * hy.y * 0.85,
  };
  ctx.moveTo(spTop.x, spTop.y);
  ctx.lineTo(spBot.x, spBot.y);
  ctx.strokeStyle = lightenHex(base, 0.15);
  ctx.lineWidth = 2 * bScale;
  ctx.stroke();

  /* ── 4. Top ellipse fill (solid gradient) ─────────────────── */
  ellipse(ctx, center, hx, hy);
  const gTop = ctx.createLinearGradient(
    center.x + hy.x, center.y + hy.y,
    center.x - hy.x, center.y - hy.y,
  );
  if (light) {
    gTop.addColorStop(0, lightenHex(base, 0.25));
    gTop.addColorStop(0.5, lightenHex(base, 0.08));
    gTop.addColorStop(1, darkenHex(base, 0.12));
  } else {
    gTop.addColorStop(0, lightenHex(base, 0.22));
    gTop.addColorStop(0.5, base);
    gTop.addColorStop(1, darkenHex(base, 0.15));
  }
  ctx.fillStyle = gTop;
  ctx.fill();

  /* ── 5. Top ellipse stroke ────────────────────────────────── */
  ellipse(ctx, center, hx, hy);
  ctx.strokeStyle = selected ? lightenHex(glow, 0.10) : darkenHex(glow, 0.10);
  ctx.lineWidth = (selected ? 2.5 : 1.5) * bScale;
  ctx.stroke();

  /* ── 6. Subtle glossy arc on top face ─────────────────────── */
  ctx.beginPath();
  for (let i = 4; i <= 16; i++) {
    const t = (i / SEGS) * Math.PI * 2;
    const f = 0.75;
    const px = center.x + Math.cos(t) * hx.x * f + Math.sin(t) * hy.x * f;
    const py = center.y + Math.cos(t) * hx.y * f + Math.sin(t) * hy.y * f;
    if (i === 4) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = lightenHex(base, 0.20);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  /* ── 8. Title text below ──────────────────────────────────── */
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

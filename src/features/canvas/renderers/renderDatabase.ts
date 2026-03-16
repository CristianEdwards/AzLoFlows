import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import { getTextRatios } from '@/lib/geometry/textPosition';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/* ── helpers ───────────────────────────────────────────────────── */

/** Trace a full isometric ellipse path (48 segments). */
function ellipsePath(
  ctx: CanvasRenderingContext2D,
  c: Point, hx: Point, hy: Point, segs = 48,
) {
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const px = c.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x;
    const py = c.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Trace only the front-visible half of an ellipse (i = 0‥24 of 48). */
function halfEllipsePath(
  ctx: CanvasRenderingContext2D,
  c: Point, hx: Point, hy: Point,
) {
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const t = (i / 48) * Math.PI * 2;
    const px = c.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x;
    const py = c.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}

/**
 * Traces a closed "cylinder body" path: right side down → front-half of
 * bottom ellipse → left side up → (implicit close via closePath).
 */
function bodyPath(
  ctx: CanvasRenderingContext2D,
  topC: Point, botC: Point, hx: Point, hy: Point,
) {
  ctx.beginPath();
  // right edge down
  ctx.moveTo(topC.x + hx.x, topC.y + hx.y);
  ctx.lineTo(botC.x + hx.x, botC.y + hx.y);
  // front half of bottom ellipse (right → left)
  for (let i = 0; i <= 24; i++) {
    const t = (i / 48) * Math.PI * 2;
    ctx.lineTo(
      botC.x + Math.cos(t) * hx.x + Math.sin(t) * hy.x,
      botC.y + Math.cos(t) * hx.y + Math.sin(t) * hy.y,
    );
  }
  // left edge up
  ctx.lineTo(topC.x - hx.x, topC.y - hx.y);
  ctx.closePath();
}

/* ── main renderer ─────────────────────────────────────────────── */

export function renderDatabase(
  ctx: CanvasRenderingContext2D,
  node: NodeEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const pts = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
  const [lt, rt, rb, lb] = pts;
  // Make the cylinder tall — 1.6× the standard depth
  const depth = NODE_DEPTH * 1.6 * camera.zoom;

  const topLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topLen + leftLen) * 0.5 / 120));

  const bx: Point = { x: (rt.x - lt.x) / topLen, y: (rt.y - lt.y) / topLen };
  const by: Point = { x: (lb.x - lt.x) / leftLen, y: (lb.y - lt.y) / leftLen };

  // Ellipse geometry
  const center: Point = {
    x: (lt.x + rt.x + rb.x + lb.x) / 4,
    y: (lt.y + rt.y + rb.y + lb.y) / 4,
  };
  const hx: Point = { x: (rt.x - lt.x) / 2, y: (rt.y - lt.y) / 2 };
  const hy: Point = { x: (lb.x - lt.x) / 2, y: (lb.y - lt.y) / 2 };
  const bot: Point = { x: center.x, y: center.y + depth };

  const faceFill = light ? node.glowColor : node.fill;
  const deep = light ? deepToneForGlow(node.glowColor) : '';

  /* ── 1. Drop shadow (light mode only) ─────────────────────── */
  if (light) {
    ellipsePath(ctx, bot, hx, hy);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  /* ── 2. Cylinder body (solid, with left-to-right shading) ── */
  bodyPath(ctx, center, bot, hx, hy);
  const gBody = ctx.createLinearGradient(
    center.x - hx.x * 1.1, center.y - hx.y * 1.1,
    center.x + hx.x * 1.1, center.y + hx.y * 1.1,
  );
  if (light) {
    gBody.addColorStop(0, lightenHex(deep, 0.25));
    gBody.addColorStop(0.35, deep);
    gBody.addColorStop(0.7, darkenHex(deep, 0.55));
    gBody.addColorStop(1, darkenHex(deep, 0.75));
  } else {
    gBody.addColorStop(0, lightenHex(faceFill, 0.20));
    gBody.addColorStop(0.3, faceFill);
    gBody.addColorStop(0.65, darkenHex(faceFill, 0.35));
    gBody.addColorStop(1, darkenHex(faceFill, 0.55));
  }
  ctx.fillStyle = gBody;
  ctx.fill();

  /* ── 3. Bottom ellipse (visible front half) ─────────────── */
  halfEllipsePath(ctx, bot, hx, hy);
  ctx.strokeStyle = light ? darkenHex(node.glowColor, 0.30) : darkenHex(node.glowColor, 0.25);
  ctx.lineWidth = 1.8 * bScale;
  ctx.stroke();

  /* ── 4. Horizontal separator bands ──────────────────────── */
  const bands = 3;
  const bandH = depth / bands;
  for (let b = 1; b < bands; b++) {
    const yOff = b * bandH;
    const bc: Point = { x: center.x, y: center.y + yOff };

    // Dark shadow just below the line
    halfEllipsePath(ctx, { x: bc.x, y: bc.y + 1.5 * camera.zoom }, hx, hy);
    ctx.strokeStyle = light
      ? darkenHex(deep, 0.50)
      : darkenHex(faceFill, 0.60);
    ctx.lineWidth = 3 * bScale;
    ctx.stroke();

    // Bright separator line
    halfEllipsePath(ctx, bc, hx, hy);
    ctx.strokeStyle = light
      ? lightenHex(node.glowColor, 0.15)
      : lightenHex(node.glowColor, 0.10);
    ctx.lineWidth = 1.2 * bScale;
    ctx.stroke();
  }

  /* ── 5. Indicator dots (one per band) ───────────────────── */
  for (let b = 0; b < bands; b++) {
    const bandMidY = center.y + b * bandH + bandH * 0.55;
    // Place the dot at ~130° on the front face (left-of-center)
    const angle = Math.PI * 0.72;
    const dx = Math.cos(angle) * hx.x * 0.88 + Math.sin(angle) * hy.x * 0.88;
    const dy = Math.cos(angle) * hx.y * 0.88 + Math.sin(angle) * hy.y * 0.88;
    const dotCx = center.x + dx;
    const dotCy = bandMidY + dy;
    const dr = 2.5 * camera.zoom;

    ctx.beginPath();
    ctx.arc(dotCx, dotCy, dr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc107';
    ctx.fill();
    // Tiny highlight
    ctx.beginPath();
    ctx.arc(dotCx - dr * 0.25, dotCy - dr * 0.25, dr * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff5cc';
    ctx.fill();
  }

  /* ── 6. Glossy body highlight (left edge) ───────────────── */
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI * 0.62 + (i / 12) * Math.PI * 0.56;
    const f = 0.92;
    const px = center.x + Math.cos(t) * hx.x * f + Math.sin(t) * hy.x * f;
    const py = center.y + Math.cos(t) * hx.y * f + Math.sin(t) * hy.y * f;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = light ? lightenHex(faceFill, 0.40) : lightenHex(faceFill, 0.18);
  ctx.lineWidth = 2.5 * bScale;
  ctx.stroke();

  // Vertical specular on body (left third)
  ctx.beginPath();
  const specAngle = Math.PI * 0.78;
  const spTop: Point = {
    x: center.x + Math.cos(specAngle) * hx.x * 0.85 + Math.sin(specAngle) * hy.x * 0.85,
    y: center.y + Math.cos(specAngle) * hx.y * 0.85 + Math.sin(specAngle) * hy.y * 0.85,
  };
  const spBot: Point = {
    x: bot.x + Math.cos(specAngle) * hx.x * 0.85 + Math.sin(specAngle) * hy.x * 0.85,
    y: bot.y + Math.cos(specAngle) * hx.y * 0.85 + Math.sin(specAngle) * hy.y * 0.85,
  };
  ctx.moveTo(spTop.x, spTop.y);
  ctx.lineTo(spBot.x, spBot.y);
  ctx.strokeStyle = light ? lightenHex(faceFill, 0.30) : lightenHex(faceFill, 0.10);
  ctx.lineWidth = 3 * bScale;
  ctx.stroke();

  /* ── 7. Top ellipse fill ────────────────────────────────── */
  ellipsePath(ctx, center, hx, hy);
  const gTop = ctx.createLinearGradient(
    center.x + hy.x, center.y + hy.y,
    center.x - hy.x, center.y - hy.y,
  );
  if (light) {
    gTop.addColorStop(0, lightenHex(deep, 0.30));
    gTop.addColorStop(0.5, lightenHex(deep, 0.15));
    gTop.addColorStop(1, deep);
  } else {
    gTop.addColorStop(0, lightenHex(faceFill, 0.25));
    gTop.addColorStop(0.4, faceFill);
    gTop.addColorStop(1, darkenHex(faceFill, 0.25));
  }
  ctx.fillStyle = gTop;
  ctx.fill();

  /* ── 8. Top ellipse strokes ─────────────────────────────── */
  ellipsePath(ctx, center, hx, hy);
  ctx.strokeStyle = selected ? lightenHex(node.glowColor, 0.15) : (light ? node.glowColor : darkenHex(node.glowColor, 0.10));
  ctx.lineWidth = (selected ? 3 : 2) * bScale;
  ctx.stroke();

  // Outer glow ring (solid, slightly darker)
  ellipsePath(ctx, center, hx, hy);
  ctx.strokeStyle = selected ? darkenHex(node.glowColor, 0.40) : darkenHex(node.glowColor, light ? 0.55 : 0.50);
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // Glossy arc on top face
  ctx.beginPath();
  for (let i = 3; i <= 20; i++) {
    const t = (i / 48) * Math.PI * 2;
    const f = 0.78;
    const px = center.x + Math.cos(t) * hx.x * f + Math.sin(t) * hy.x * f;
    const py = center.y + Math.cos(t) * hx.y * f + Math.sin(t) * hy.y * f;
    if (i === 3) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = light ? lightenHex(faceFill, 0.45) : lightenHex(faceFill, 0.15);
  ctx.lineWidth = 1.8 * bScale;
  ctx.stroke();

  /* ── 9. Body outline (side edges) ───────────────────────── */
  ctx.beginPath();
  ctx.moveTo(center.x + hx.x, center.y + hx.y);
  ctx.lineTo(bot.x + hx.x, bot.y + hx.y);
  ctx.moveTo(center.x - hx.x, center.y - hx.y);
  ctx.lineTo(bot.x - hx.x, bot.y - hx.y);
  ctx.strokeStyle = selected ? lightenHex(node.glowColor, 0.10) : darkenHex(node.glowColor, light ? 0.30 : 0.25);
  ctx.lineWidth = (selected ? 2 : 1.2) * bScale;
  ctx.stroke();

  /* ── 10. Title below the cylinder ───────────────────────── */
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
      light ? '#ffffffee' : node.glowColor,
      `600 ${scaledSize}px Inter, sans-serif`);
  }
}
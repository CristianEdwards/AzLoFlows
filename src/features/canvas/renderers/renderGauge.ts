import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a 3-D donut / gauge ring in isometric.
 *
 * The gauge is a thick ring lying flat on the iso plane (the isoQuad),
 * with a depth extrusion giving it volume. A coloured arc fills a
 * percentage of the ring, and the remaining portion is a faint track.
 * A percentage label sits in the centre.
 */
export function renderGauge(
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

  // Basis vectors along iso axes
  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';

  // Centre of the quad and radii
  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const outerR = Math.min(topEdgeLen, leftEdgeLen) * 0.44;
  const ringW = outerR * 0.30;            // ring thickness
  const innerR = outerR - ringW;
  const depth = NODE_DEPTH * 0.35 * camera.zoom;

  // Gauge fill fraction (we use zIndex as a seed to vary per instance visually)
  const fillFrac = 0.72 + Math.sin(node.zIndex * 1.7) * 0.15; // ~57–87 %
  const startAngle = -Math.PI * 0.5;      // 12-o'clock
  const endAngle = startAngle + Math.PI * 2 * fillFrac;
  const segments = 48;

  // Helper: point on an iso-ellipse at angle θ with radius r
  const isoRingPt = (theta: number, r: number, yOff = 0) => ({
    x: cx + bx.x * Math.cos(theta) * r + by.x * Math.sin(theta) * r,
    y: cy + bx.y * Math.cos(theta) * r + by.y * Math.sin(theta) * r + yOff,
  });

  // ── Drop shadow ──
  if (light) {
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const p = isoRingPt(a, outerR, depth);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Outer rim depth (visible around the bottom half of the ring) ──
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    // Only draw depth faces visible from viewer (front-facing)
    const midA = (a0 + a1) / 2;
    const viewDot = by.x * Math.cos(midA) + by.y * Math.sin(midA);
    if (viewDot < 0.15) continue; // back-facing
    const p0 = isoRingPt(a0, outerR);
    const p1 = isoRingPt(a1, outerR);
    const p0d = isoRingPt(a0, outerR, depth);
    const p1d = isoRingPt(a1, outerR, depth);
    drawPolygon(ctx, [p0, p1, p1d, p0d]);
    ctx.fillStyle = light ? darkenHex(deepTone, 0.65) : hexToRgba(faceFill, 0.12);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.04);
    ctx.lineWidth = 0.3 * bScale;
    ctx.stroke();
  }

  // ── Bottom face of the ring (depth level, the "floor") ──
  // Outer ellipse path at depth
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const p = isoRingPt(a, outerR, depth);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  // Inner ellipse path at depth (counter-clockwise to cut out hole)
  for (let i = segments; i >= 0; i--) {
    const a = (i / segments) * Math.PI * 2;
    const p = isoRingPt(a, innerR, depth);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = light ? darkenHex(deepTone, 0.55) : hexToRgba(faceFill, 0.08);
  ctx.fill();

  // ── Top face of the ring (the main visual — gauge track + arc) ──
  // Track ring (full circle, faint)
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const p = isoRingPt(a, outerR);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = segments; i >= 0; i--) {
    const a = (i / segments) * Math.PI * 2;
    const p = isoRingPt(a, innerR);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  const trackGrad = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  if (light) {
    trackGrad.addColorStop(0, lightenHex(deepTone, 0.18));
    trackGrad.addColorStop(1, deepTone);
  } else {
    trackGrad.addColorStop(0, hexToRgba(faceFill, 0.22));
    trackGrad.addColorStop(1, hexToRgba(faceFill, 0.08));
  }
  ctx.fillStyle = trackGrad;
  ctx.fill();
  // Track border
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.20 : 0.10);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Filled arc (the coloured gauge portion) ──
  const arcSegs = Math.ceil(segments * fillFrac);
  ctx.beginPath();
  for (let i = 0; i <= arcSegs; i++) {
    const t = i / arcSegs;
    const a = startAngle + (endAngle - startAngle) * t;
    const p = isoRingPt(a, outerR);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = arcSegs; i >= 0; i--) {
    const t = i / arcSegs;
    const a = startAngle + (endAngle - startAngle) * t;
    const p = isoRingPt(a, innerR);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  const arcGrad = ctx.createLinearGradient(
    isoRingPt(startAngle, outerR).x,
    isoRingPt(startAngle, outerR).y,
    isoRingPt(endAngle, outerR).x,
    isoRingPt(endAngle, outerR).y,
  );
  if (light) {
    arcGrad.addColorStop(0, lightenHex(node.glowColor, 0.2));
    arcGrad.addColorStop(1, node.glowColor);
  } else {
    arcGrad.addColorStop(0, hexToRgba(node.glowColor, 0.85));
    arcGrad.addColorStop(1, hexToRgba(node.glowColor, 0.55));
  }
  ctx.fillStyle = arcGrad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.30 : 0.50) * pulse);
  ctx.shadowBlur = light ? 8 : 14;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Arc border
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.70 : 0.55));
  ctx.lineWidth = (selected ? 2 : 1.2) * bScale;
  ctx.stroke();

  // ── Depth faces for the filled arc (front-visible only) ──
  for (let i = 0; i < arcSegs; i++) {
    const t0 = i / arcSegs;
    const t1 = (i + 1) / arcSegs;
    const a0 = startAngle + (endAngle - startAngle) * t0;
    const a1 = startAngle + (endAngle - startAngle) * t1;
    const midA = (a0 + a1) / 2;
    const viewDot = by.x * Math.cos(midA) + by.y * Math.sin(midA);
    if (viewDot < 0.15) continue;
    const p0 = isoRingPt(a0, outerR);
    const p1 = isoRingPt(a1, outerR);
    const p0d = isoRingPt(a0, outerR, depth);
    const p1d = isoRingPt(a1, outerR, depth);
    drawPolygon(ctx, [p0, p1, p1d, p0d]);
    ctx.fillStyle = light ? darkenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 0.22);
    ctx.fill();
  }

  // ── Centre label (percentage) ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail) {
    const pctText = `${Math.round(fillFrac * 100)}%`;
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 1.1);
    drawTransformedText(ctx, pctText, { x: cx, y: cy }, bx, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);
  }

  // ── Icon + title below the gauge ──
  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom * 0.7;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.5, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y + outerR + 10 * camera.zoom);
    ctx.transform(bx.x, bx.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.85 : 0.65;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail && node.title !== 'New Node') {
    const titlePt = { x: cx, y: cy + outerR + depth + 8 * camera.zoom };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, bx, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.90)' : hexToRgba(node.glowColor, 0.95),
      `600 ${scaledSize}px Inter, sans-serif`);
  }
}

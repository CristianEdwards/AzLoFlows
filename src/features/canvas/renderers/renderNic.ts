import { getTextRatios } from '@/lib/geometry/textPosition';
import { DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/* ── SVG viewBox: -21.34 -12.31 44.19 44.19 ── */
const VB_X = -21.34;
const VB_Y = -12.31;
const VB_W = 44.19;
const VB_H = 44.19;
const SVG_CX = VB_X + VB_W / 2; // ≈ 0.755
const SVG_CY = VB_Y + VB_H / 2; // ≈ 9.785

/* ── Draw command: fill-only or stroke-only ── */
interface DrawCmd { p: Path2D; f?: string; s?: string; lw?: number }

/* ── Lazy-initialised Path2D cache (built once, reused every frame) ── */
let _cache: DrawCmd[] | null = null;

function cmds(): DrawCmd[] {
  if (_cache) return _cache;
  _cache = [
    // ── 1. Ground shadow ellipse ──
    { p: new Path2D('M11.26,15.50L10.37,15.97L9.40,16.38L8.37,16.74L7.28,17.03L6.15,17.27L4.99,17.44L3.80,17.54L2.60,17.57L1.40,17.54L0.21,17.44L-0.96,17.27L-2.09,17.03L-3.18,16.74L-4.21,16.38L-5.17,15.97L-6.06,15.50L-6.87,14.99L-7.59,14.43L-8.20,13.83L-8.72,13.21L-9.12,12.55L-9.41,11.88L-9.59,11.19L-9.65,10.50L-9.59,9.81L-9.41,9.12L-9.12,8.45L-8.72,7.79L-8.20,7.17L-7.59,6.57L-6.87,6.01L-6.06,5.50L-5.17,5.03L-4.21,4.62L-3.18,4.26L-2.09,3.97L-0.96,3.73L0.21,3.56L1.40,3.46L2.60,3.43L3.80,3.46L4.99,3.56L6.15,3.73L7.28,3.97L8.37,4.26L9.40,4.62L10.37,5.03L11.26,5.50L12.07,6.01L12.78,6.57L13.40,7.17L13.91,7.79L14.32,8.45L14.61,9.12L14.79,9.81L14.85,10.50L14.79,11.19L14.61,11.88L14.32,12.55L13.91,13.21L13.40,13.83L12.78,14.43L12.07,14.99Z'), f: 'rgba(5, 10, 30, 0.15)' },

    // ── 2. PCB left face ──
    { p: new Path2D('M-9.53,9.50L-2.60,13.50L-2.60,13.00L-9.53,9.00Z'), f: '#368c5a' },

    // ── 3. PCB right face ──
    { p: new Path2D('M9.53,6.50L-2.60,13.50L-2.60,13.00L9.53,6.00Z'), f: '#48BB78' },

    // ── 4. PCB top face ──
    { p: new Path2D('M2.60,2.00L9.53,6.00L-2.60,13.00L-9.53,9.00Z'), f: '#76cc9a' },

    // ── 5–6. PCB notch triangles ──
    { p: new Path2D('M1.73,3.49L0.00,4.49L0.00,5.49Z'), s: '#328354', lw: 1.5 },
    { p: new Path2D('M2.60,3.99L1.73,4.49L1.73,5.49Z'), s: '#328354', lw: 1.5 },

    // ── 7–9. Small port block (left / right / top) ──
    { p: new Path2D('M-0.87,7.00L1.73,8.50L1.73,7.30L-0.87,5.80Z'), f: '#1b2330' },
    { p: new Path2D('M4.33,7.00L1.73,8.50L1.73,7.30L4.33,5.80Z'), f: '#242E40' },
    { p: new Path2D('M1.73,4.30L4.33,5.80L1.73,7.30L-0.87,5.80Z'), f: '#5b6270' },

    // ── 10–15. Port stripe lines ──
    { p: new Path2D('M2.08,4.49L-0.52,5.99Z'), s: '#0F172A', lw: 1 },
    { p: new Path2D('M2.42,4.69L-0.17,6.19Z'), s: '#0F172A', lw: 1 },
    { p: new Path2D('M2.77,4.89L0.17,6.39Z'), s: '#0F172A', lw: 1 },
    { p: new Path2D('M3.12,5.09L0.52,6.59Z'), s: '#0F172A', lw: 1 },
    { p: new Path2D('M3.46,5.29L0.87,6.79Z'), s: '#0F172A', lw: 1 },
    { p: new Path2D('M3.81,5.49L1.21,6.99Z'), s: '#0F172A', lw: 1 },

    // ── 16–18. Connector cube A (left / right / top) ──
    { p: new Path2D('M-1.73,8.50L-0.87,9.00L-0.87,8.20L-1.73,7.70Z'), f: '#1b2330' },
    { p: new Path2D('M0.00,8.50L-0.87,9.00L-0.87,8.20L0.00,7.70Z'), f: '#242E40' },
    { p: new Path2D('M-0.87,7.20L0.00,7.70L-0.87,8.20L-1.73,7.70Z'), f: '#5b6270' },

    // ── 19–21. Connector cube B (left / right / top) ──
    { p: new Path2D('M0.00,9.50L0.87,10.00L0.87,9.20L0.00,8.70Z'), f: '#1b2330' },
    { p: new Path2D('M1.73,9.50L0.87,10.00L0.87,9.20L1.73,8.70Z'), f: '#242E40' },
    { p: new Path2D('M0.87,8.20L1.73,8.70L0.87,9.20L0.00,8.70Z'), f: '#5b6270' },

    // ── 22–24. Small bracket (left / right / top) ──
    { p: new Path2D('M-6.50,8.25L-5.20,9.00L-5.20,8.50L-6.50,7.75Z'), f: '#6f7a8a' },
    { p: new Path2D('M-3.90,8.25L-5.20,9.00L-5.20,8.50L-3.90,7.75Z'), f: '#94A3B8' },
    { p: new Path2D('M-5.20,7.00L-3.90,7.75L-5.20,8.50L-6.50,7.75Z'), f: '#afbaca' },

    // ── 25–58. Gold connector pins (15 pairs: left-face + top-face each) ──
    { p: new Path2D('M0.87,3.50L0.61,3.65L0.61,3.15L0.87,3.00Z'), f: '#F59E0B' },
    { p: new Path2D('M0.87,2.99L0.61,3.14L1.30,3.54L1.56,3.39Z'), f: '#F59E0B' },
    { p: new Path2D('M0.43,3.75L0.17,3.90L0.17,3.40L0.43,3.25Z'), f: '#F59E0B' },
    { p: new Path2D('M0.43,3.24L0.17,3.39L0.87,3.79L1.13,3.64Z'), f: '#F59E0B' },
    { p: new Path2D('M0.00,4.00L-0.26,4.15L-0.26,3.65L0.00,3.50Z'), f: '#F59E0B' },
    { p: new Path2D('M0.00,3.49L-0.26,3.64L0.43,4.04L0.69,3.89Z'), f: '#F59E0B' },
    { p: new Path2D('M-0.43,4.25L-0.69,4.40L-0.69,3.90L-0.43,3.75Z'), f: '#F59E0B' },
    { p: new Path2D('M-0.43,3.74L-0.69,3.89L0.00,4.29L0.26,4.14Z'), f: '#F59E0B' },
    { p: new Path2D('M-0.87,4.50L-1.13,4.65L-1.13,4.15L-0.87,4.00Z'), f: '#F59E0B' },
    { p: new Path2D('M-0.87,3.99L-1.13,4.14L-0.43,4.54L-0.17,4.39Z'), f: '#F59E0B' },
    { p: new Path2D('M-1.30,4.75L-1.56,4.90L-1.56,4.40L-1.30,4.25Z'), f: '#F59E0B' },
    { p: new Path2D('M-1.30,4.24L-1.56,4.39L-0.87,4.79L-0.61,4.64Z'), f: '#F59E0B' },
    { p: new Path2D('M-1.73,5.00L-1.99,5.15L-1.99,4.65L-1.73,4.50Z'), f: '#F59E0B' },
    { p: new Path2D('M-1.73,4.49L-1.99,4.64L-1.30,5.04L-1.04,4.89Z'), f: '#F59E0B' },
    { p: new Path2D('M-2.17,5.25L-2.42,5.40L-2.42,4.90L-2.17,4.75Z'), f: '#F59E0B' },
    { p: new Path2D('M-2.17,4.74L-2.42,4.89L-1.73,5.29L-1.47,5.14Z'), f: '#F59E0B' },
    { p: new Path2D('M-2.60,5.50L-2.86,5.65L-2.86,5.15L-2.60,5.00Z'), f: '#F59E0B' },
    { p: new Path2D('M-2.60,4.99L-2.86,5.14L-2.17,5.54L-1.91,5.39Z'), f: '#F59E0B' },
    { p: new Path2D('M-3.03,5.75L-3.29,5.90L-3.29,5.40L-3.03,5.25Z'), f: '#F59E0B' },
    { p: new Path2D('M-3.03,5.24L-3.29,5.39L-2.60,5.79L-2.34,5.64Z'), f: '#F59E0B' },
    { p: new Path2D('M-3.46,6.00L-3.72,6.15L-3.72,5.65L-3.46,5.50Z'), f: '#F59E0B' },
    { p: new Path2D('M-3.46,5.49L-3.72,5.64L-3.03,6.04L-2.77,5.89Z'), f: '#F59E0B' },
    { p: new Path2D('M-3.90,6.25L-4.16,6.40L-4.16,5.90L-3.90,5.75Z'), f: '#F59E0B' },
    { p: new Path2D('M-3.90,5.74L-4.16,5.89L-3.46,6.29L-3.20,6.14Z'), f: '#F59E0B' },
    { p: new Path2D('M-4.33,6.50L-4.59,6.65L-4.59,6.15L-4.33,6.00Z'), f: '#F59E0B' },
    { p: new Path2D('M-4.33,5.99L-4.59,6.14L-3.90,6.54L-3.64,6.39Z'), f: '#F59E0B' },
    { p: new Path2D('M-4.76,6.75L-5.02,6.90L-5.02,6.40L-4.76,6.25Z'), f: '#F59E0B' },
    { p: new Path2D('M-4.76,6.24L-5.02,6.39L-4.33,6.79L-4.07,6.64Z'), f: '#F59E0B' },
    { p: new Path2D('M-5.20,7.00L-5.46,7.15L-5.46,6.65L-5.20,6.50Z'), f: '#F59E0B' },
    { p: new Path2D('M-5.20,6.49L-5.46,6.64L-4.76,7.04L-4.50,6.89Z'), f: '#F59E0B' },
    { p: new Path2D('M-5.63,7.25L-5.89,7.40L-5.89,6.90L-5.63,6.75Z'), f: '#F59E0B' },
    { p: new Path2D('M-5.63,6.74L-5.89,6.89L-5.20,7.29L-4.94,7.14Z'), f: '#F59E0B' },
    { p: new Path2D('M-6.06,7.50L-6.32,7.65L-6.32,7.15L-6.06,7.00Z'), f: '#F59E0B' },
    { p: new Path2D('M-6.06,6.99L-6.32,7.14L-5.63,7.54L-5.37,7.39Z'), f: '#F59E0B' },

    // ── 59–61. RJ-45 housing A (left / right / top) ──
    { p: new Path2D('M-10.39,10.50L-7.79,12.00L-7.79,8.50L-10.39,7.00Z'), f: '#98a0a9' },
    { p: new Path2D('M-5.20,10.50L-7.79,12.00L-7.79,8.50L-5.20,7.00Z'), f: '#CBD5E1' },
    { p: new Path2D('M-7.79,5.50L-5.20,7.00L-7.79,8.50L-10.39,7.00Z'), f: '#d8e0e9' },

    // ── 62–64. RJ-45 housing B (left / right / top) ──
    { p: new Path2D('M-6.93,12.50L-4.33,14.00L-4.33,10.50L-6.93,9.00Z'), f: '#98a0a9' },
    { p: new Path2D('M-1.73,12.50L-4.33,14.00L-4.33,10.50L-1.73,9.00Z'), f: '#CBD5E1' },
    { p: new Path2D('M-4.33,7.50L-1.73,9.00L-4.33,10.50L-6.93,9.00Z'), f: '#d8e0e9' },

    // ── 65–67. Metal backplate strip (left / right-edge / top-edge) ──
    { p: new Path2D('M-13.34,9.70L-2.94,15.70L-2.94,10.70L-13.34,4.70Z'), f: '#6f7a8a' },
    { p: new Path2D('M-2.51,15.45L-2.94,15.70L-2.94,10.70L-2.51,10.45Z'), f: '#94A3B8' },
    { p: new Path2D('M-12.90,4.45L-2.51,10.45L-2.94,10.70L-13.34,4.70Z'), f: '#afbaca' },

    // ── 68–71. Port openings + LED cutouts ──
    { p: new Path2D('M-10.31,10.46L-8.58,11.46L-8.58,9.46L-10.31,8.46Z'), f: '#0B1120' },
    { p: new Path2D('M-9.71,8.80L-9.19,9.11L-9.19,8.80L-9.71,8.50Z'), f: '#0B1120' },
    { p: new Path2D('M-6.85,12.45L-5.12,13.45L-5.12,11.45L-6.85,10.45Z'), f: '#0B1120' },
    { p: new Path2D('M-6.24,10.80L-5.72,11.11L-5.72,10.80L-6.24,10.50Z'), f: '#0B1120' },

    // ── 72–73. Green LED indicators ──
    { p: new Path2D('M-10.05,8.11L-9.88,8.21L-9.88,8.00L-10.05,7.91Z'), f: '#b6e4c9' },
    { p: new Path2D('M-6.59,10.11L-6.42,10.20L-6.42,10.00L-6.59,9.91Z'), f: '#b6e4c9' },
  ];
  return _cache;
}

/**
 * Renders a NIC (Network Interface Card) by drawing the exact reference SVG
 * paths onto the canvas. The SVG is already isometric — no projection is
 * applied; instead the paths are scaled to fit the node's screen-space
 * bounding box derived from isoQuad.
 */
export function renderNic(
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

  // ── Bounding box of iso quad in screen space ──
  const xs = [lt.x, rt.x, rb.x, lb.x];
  const ys = [lt.y, rt.y, rb.y, lb.y];
  const minX = Math.min(xs[0], xs[1], xs[2], xs[3]);
  const maxX = Math.max(xs[0], xs[1], xs[2], xs[3]);
  const minY = Math.min(ys[0], ys[1], ys[2], ys[3]);
  const maxY = Math.max(ys[0], ys[1], ys[2], ys[3]);
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Scale SVG to fit
  const scale = Math.min(bboxW / VB_W, bboxH / VB_H);

  // ── Draw all SVG paths ──
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-SVG_CX, -SVG_CY);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'square';

  for (const cmd of cmds()) {
    if (cmd.f) {
      ctx.fillStyle = cmd.f;
      ctx.fill(cmd.p);
    }
    if (cmd.s) {
      ctx.strokeStyle = cmd.s;
      ctx.lineWidth = cmd.lw ?? 1;
      ctx.stroke(cmd.p);
    }
  }

  ctx.restore();

  // ── Selection highlight ──
  if (selected) {
    drawPolygon(ctx, points);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.90);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawPolygon(ctx, points);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.20);
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // ── Icon + text ──
  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bxDir = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const byDir = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? bxDir : byDir;
  const textStackDirection = node.textRotated
    ? { x: byDir.x, y: byDir.y }
    : { x: -bxDir.x, y: -bxDir.y };

  if (showDetail) {
    const hasIcon = !!(node.icon && nodeIconCatalog[node.icon]);
    const hasSub = !!node.subtitle;

    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLength = node.textRotated ? topEdgeLen : leftEdgeLen;
    const nodeTopEdge = textEdgeLength * 0.85;
    ctx.font = `600 ${scaledTitleSize}px Inter, sans-serif`;
    const titleTextWidth = ctx.measureText(node.title).width * 0.87;
    const clampedSize = titleTextWidth > nodeTopEdge
      ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / titleTextWidth)))
      : scaledTitleSize;

    const gap = 4 * camera.zoom;
    let iconSize = hasIcon
      ? Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom * 0.35
      : 0;
    const subtitleFontSize = hasSub ? Math.round(clampedSize * 0.8125) : 0;

    const aboveTitle = clampedSize / 2;
    let belowTitle = clampedSize / 2;
    if (hasIcon) belowTitle += gap + iconSize;
    if (hasSub) belowTitle += gap + subtitleFontSize;
    let totalStack = aboveTitle + belowTitle;

    const stackEdgeLen = node.textRotated ? leftEdgeLen : topEdgeLen;
    const maxStack = stackEdgeLen * 0.75;
    if (totalStack > maxStack && hasIcon) {
      iconSize = Math.max(8, iconSize - (totalStack - maxStack));
      belowTitle = clampedSize / 2 + gap + iconSize + (hasSub ? gap + subtitleFontSize : 0);
      totalStack = aboveTitle + belowTitle;
    }

    const baseRatios = getTextRatios(node, 0.48);
    let rx = baseRatios.x;
    let ry = baseRatios.y;

    if (node.textRotated) {
      const aboveFrac = aboveTitle / leftEdgeLen;
      const belowFrac = belowTitle / leftEdgeLen;
      ry = Math.max(0.25 + aboveFrac, Math.min(0.92 - belowFrac, ry));
      rx = Math.max(0.10, Math.min(0.90, rx));
    } else {
      const aboveFrac = aboveTitle / topEdgeLen;
      const belowFrac = belowTitle / topEdgeLen;
      rx = Math.max(0.05 + belowFrac, Math.min(0.95 - aboveFrac, rx));
      ry = Math.max(0.25, Math.min(0.88, ry));
    }

    const titlePoint = worldToScreen(
      { x: node.x + node.width * rx, y: node.y + node.height * ry },
      camera, viewport,
    );

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(30,30,30,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${clampedSize}px Inter, sans-serif`);

    if (hasIcon) {
      const iconDef = nodeIconCatalog[node.icon!];
      const iconOffset = clampedSize / 2 + gap + iconSize / 2;
      const iconPt = {
        x: titlePoint.x + textStackDirection.x * iconOffset,
        y: titlePoint.y + textStackDirection.y * iconOffset,
      };
      ctx.save();
      ctx.translate(iconPt.x, iconPt.y);
      ctx.transform(byDir.x, byDir.y, -bxDir.x, -bxDir.y, 0, 0);
      const s = iconSize / 32;
      ctx.scale(s, s);
      ctx.translate(-16, -16);
      ctx.globalAlpha = light ? 0.9 : 0.7;
      ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
      for (const d of iconDef.paths) ctx.fill(new Path2D(d));
      ctx.restore();
    }

    if (hasSub) {
      const subtitleOffset = hasIcon
        ? clampedSize / 2 + gap + iconSize + gap + subtitleFontSize / 2
        : clampedSize / 2 + gap + subtitleFontSize / 2;
      const subtitlePoint = {
        x: titlePoint.x + textStackDirection.x * subtitleOffset,
        y: titlePoint.y + textStackDirection.y * subtitleOffset,
      };
      drawTransformedText(ctx, node.subtitle, subtitlePoint, textDirection, textStackDirection,
        light ? 'rgba(30,30,30,0.75)' : hexToRgba(node.glowColor, 0.95),
        `${light ? 600 : 500} ${subtitleFontSize}px Inter, sans-serif`);
    }
  }
}

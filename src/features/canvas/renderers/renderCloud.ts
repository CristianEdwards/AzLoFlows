import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/**
 * Draw a puffy cloud outline in isometric space using cubic bezier curves.
 * `cx,cy` is the cloud centre in screen coords,
 * `hx,hy` are half-extent vectors along the two iso axes.
 * The path is NOT closed yet so the caller can stroke / fill.
 */
function cloudTopPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  hx: Point, hy: Point,
) {
  // Map normalised (u,v) in [-1,1] → screen coords
  const p = (u: number, v: number) => ({
    x: cx + u * hx.x + v * hy.x,
    y: cx + u * hx.y + v * hy.y,   // BUG: should use cy
  });
  // Fix: use cy for y
  const pt = (u: number, v: number) => ({
    x: cx + u * hx.x + v * hy.x,
    y: cy + u * hx.y + v * hy.y,
  });

  // Cloud outline (clockwise from left-center)
  const s  = pt(-0.90,  0.05);
  const a1 = pt(-0.85, -0.35);
  const a2 = pt(-0.55, -0.60);
  const b1 = pt(-0.30, -0.55);
  const b2 = pt(-0.10, -0.80);
  const c1 = pt( 0.15, -0.80);
  const c2 = pt( 0.35, -0.55);
  const d1 = pt( 0.55, -0.60);
  const d2 = pt( 0.80, -0.35);
  const e  = pt( 0.90,  0.05);
  const f1 = pt( 0.82,  0.40);
  const f2 = pt( 0.55,  0.60);
  const g  = pt( 0.20,  0.65);
  const h1 = pt(-0.10,  0.65);
  const h2 = pt(-0.45,  0.60);
  const i1 = pt(-0.70,  0.45);
  const i2 = pt(-0.90,  0.25);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.bezierCurveTo(a1.x, a1.y, a2.x, a2.y, b1.x, b1.y);
  ctx.bezierCurveTo(b2.x, b2.y, c1.x, c1.y, c2.x, c2.y);
  ctx.bezierCurveTo(d1.x, d1.y, d2.x, d2.y, e.x, e.y);
  ctx.bezierCurveTo(f1.x, f1.y, f2.x, f2.y, g.x, g.y);
  ctx.bezierCurveTo(h1.x, h1.y, h2.x, h2.y, i1.x, i1.y);
  ctx.bezierCurveTo(i2.x, i2.y, s.x, s.y - (i2.y - s.y) * 0.1, s.x, s.y);
  ctx.closePath();
}

/** Same cloud outline but shifted vertically by `dy` (screen px). */
function cloudOffsetPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  hx: Point, hy: Point,
  dy: number,
) {
  cloudTopPath(ctx, cx, cy + dy, hx, hy);
}

export function renderCloud(
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
  const depth = NODE_DEPTH * 0.7 * camera.zoom;
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bxDir = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const byDir = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const hx: Point = { x: (rt.x - lt.x) / 2, y: (rt.y - lt.y) / 2 };
  const hy: Point = { x: (lb.x - lt.x) / 2, y: (lb.y - lt.y) / 2 };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // ── Drop shadow ──
  if (light) {
    cloudOffsetPath(ctx, cx, cy, hx, hy, depth + 4);
    
    
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    
    
    ctx.shadowOffsetY = 0;
  }

  // ── Cloud body (shifted-down copy for depth) ──
  cloudOffsetPath(ctx, cx, cy, hx, hy, depth);
  if (light) {
    const g = ctx.createLinearGradient(cx - hx.x, cy - hx.y + depth, cx + hx.x, cy + hx.y + depth);
    g.addColorStop(0, deepToneMid);
    g.addColorStop(1, darkenHex(deepTone, 0.8));
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(cx - hx.x, cy - hx.y + depth, cx + hx.x, cy + hx.y + depth);
    g.addColorStop(0, darkenHex(node.glowColor, 0.45));
    g.addColorStop(1, darkenHex(node.glowColor, 0.65));
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.3 : 0.15);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // ── Side wall (connect top and bottom outlines on visible side) ──
  // Approximate by drawing a filled region between the bottom-left arc of top and bottom outlines.
  // For simplicity, draw vertical lines at sampled points around the lower-visible half.
  ctx.save();
  ctx.beginPath();
  const segments = 32;
  // Bottom half of cloud (visible underbelly) from right → front → left
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 0.90 - t * 1.80; // sweep u from 0.90 to -0.90
    const v = 0.55 * Math.sin(Math.PI * t); // bulge outward for the visible belly
    const sx = cx + u * hx.x + v * hy.x;
    const sy = cy + u * hx.y + v * hy.y;
    if (i === 0) ctx.moveTo(sx, sy + depth);
    else ctx.lineTo(sx, sy + depth);
  }
  // Back up along the top outline (reversed)
  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const u = 0.90 - t * 1.80;
    const v = 0.55 * Math.sin(Math.PI * t);
    const sx = cx + u * hx.x + v * hy.x;
    const sy = cy + u * hx.y + v * hy.y;
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  if (light) {
    const g = ctx.createLinearGradient(cx, cy, cx, cy + depth);
    g.addColorStop(0, deepToneLit);
    g.addColorStop(1, deepTone);
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(cx, cy, cx, cy + depth);
    g.addColorStop(0, hexToRgba(node.glowColor, 0.55));
    g.addColorStop(1, darkenHex(node.glowColor, 0.50));
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.25 : 0.12) * pulse);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();
  ctx.restore();

  // ── Top cloud face ──
  cloudTopPath(ctx, cx, cy, hx, hy);
  const gTop = ctx.createLinearGradient(
    cx + hy.x, cy + hy.y,
    cx - hy.x, cy - hy.y,
  );
  if (light) {
    gTop.addColorStop(0, deepToneLit);
    gTop.addColorStop(0.5, deepToneMid);
    gTop.addColorStop(1, deepTone);
  } else {
    gTop.addColorStop(0, hexToRgba(node.glowColor, 0.90));
    gTop.addColorStop(0.3, hexToRgba(node.glowColor, 0.62));
    gTop.addColorStop(0.7, darkenHex(node.glowColor, 0.30));
    gTop.addColorStop(1, darkenHex(node.glowColor, 0.50));
  }
  ctx.fillStyle = gTop;
  
  
  ctx.fill();
  

  // ── Top border ──
  cloudTopPath(ctx, cx, cy, hx, hy);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.90 : 0.82));
  ctx.lineWidth = (selected ? 3 : 2.4) * bScale;
  ctx.stroke();

  // ── Outer glow ──
  cloudTopPath(ctx, cx, cy, hx, hy);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.30 : (light ? 0.15 : 0.22));
  ctx.lineWidth = (selected ? 8 : 6) * bScale;
  ctx.stroke();

  // ── Glossy highlight arcs (puffy bumps — glass specular) ──
  ctx.beginPath();
  const hlPt = (u: number, v: number) => ({
    x: cx + u * hx.x + v * hy.x,
    y: cy + u * hx.y + v * hy.y,
  });
  const h1 = hlPt(-0.35, -0.38);
  const h2 = hlPt(0.10, -0.55);
  ctx.moveTo(h1.x, h1.y);
  ctx.quadraticCurveTo(hlPt(-0.10, -0.52).x, hlPt(-0.10, -0.52).y, h2.x, h2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 3.5 * bScale;
  ctx.stroke();

  // Second highlight (broader)
  ctx.beginPath();
  const h3 = hlPt(0.30, -0.35);
  const h4 = hlPt(0.60, -0.18);
  ctx.moveTo(h3.x, h3.y);
  ctx.quadraticCurveTo(hlPt(0.48, -0.35).x, hlPt(0.48, -0.35).y, h4.x, h4.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2.5 * bScale;
  ctx.stroke();

  // Third highlight (front bump)
  ctx.beginPath();
  const h5 = hlPt(-0.15, 0.30);
  const h6 = hlPt(0.25, 0.42);
  ctx.moveTo(h5.x, h5.y);
  ctx.quadraticCurveTo(hlPt(0.05, 0.40).x, hlPt(0.05, 0.40).y, h6.x, h6.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2 * bScale;
  ctx.stroke();

  // Inner glow ring on top face
  cloudTopPath(ctx, cx, cy,
    { x: hx.x * 0.85, y: hx.y * 0.85 },
    { x: hy.x * 0.85, y: hy.y * 0.85 });
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.08);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const topFaceBasisX = bxDir;
  const topFaceBasisY = byDir;
  const textDirection = node.textRotated ? topFaceBasisX : topFaceBasisY;
  const textStackDirection = node.textRotated
    ? { x: topFaceBasisY.x, y: topFaceBasisY.y }
    : { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(topFaceBasisY.x, topFaceBasisY.y, -topFaceBasisX.x, -topFaceBasisX.y, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const textRatios = getTextRatios(node, 0.46);
  const titlePoint = worldToScreen(
      { x: node.x + node.width * textRatios.x, y: node.y + node.height * textRatios.y },
      camera, viewport,
    );
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLength = node.textRotated ? topEdgeLen : leftEdgeLen;
    const nodeTopEdge = textEdgeLength * 0.75;
    ctx.font = `600 ${scaledTitleSize}px Inter, sans-serif`;
    const titleTextWidth = ctx.measureText(node.title).width * 0.87;
    const clampedSize = titleTextWidth > nodeTopEdge
      ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / titleTextWidth)))
      : scaledTitleSize;

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${clampedSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subtitlePoint = {
        x: titlePoint.x + textStackDirection.x * 18,
        y: titlePoint.y + textStackDirection.y * 18,
      };
      drawTransformedText(ctx, node.subtitle, subtitlePoint, textDirection, textStackDirection,
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `${light ? 600 : 500} ${Math.round(clampedSize * 0.8125)}px Inter, sans-serif`);
    }
  }
}

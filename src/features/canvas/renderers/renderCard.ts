import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an isometric info-card / floating panel.
 * Thin depth with a frosted-glass look, header stripe, and content area —
 * inspired by the "Azure Skills" / "Foundry MCP Server" cards from the
 * Microsoft isometric reference image.
 */
export function renderCard(
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
  const depth = NODE_DEPTH * 0.25 * camera.zoom; // thicker glass slab
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bxDir = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const byDir = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  // Depth-extruded corners
  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.30) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.18) : '';

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [lb, rb, rbD, lbD]);
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left face (medium tone) ──
  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  if (light) {
    const gSide = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    gSide.addColorStop(0, darkenHex(deepTone, 0.60));
    gSide.addColorStop(1, darkenHex(deepTone, 0.75));
    ctx.fillStyle = gSide;
  } else {
    const gSide = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    gSide.addColorStop(0, hexToRgba(node.glowColor, 0.45));
    gSide.addColorStop(0.5, darkenHex(node.glowColor, 0.40));
    gSide.addColorStop(1, darkenHex(node.glowColor, 0.60));
    ctx.fillStyle = gSide;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.18);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // Specular on left face
  ctx.beginPath();
  const cLMid1 = { x: lt.x * 0.5 + ltD.x * 0.5, y: lt.y * 0.5 + ltD.y * 0.5 };
  const cLMid2 = { x: lb.x * 0.5 + lbD.x * 0.5, y: lb.y * 0.5 + lbD.y * 0.5 };
  ctx.moveTo(cLMid1.x, cLMid1.y);
  ctx.lineTo(cLMid2.x, cLMid2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // ── Front face (darkest) ──
  drawPolygon(ctx, [lb, rb, rbD, lbD]);
  if (light) {
    const gFront = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    gFront.addColorStop(0, darkenHex(deepTone, 0.55));
    gFront.addColorStop(1, darkenHex(deepTone, 0.70));
    ctx.fillStyle = gFront;
  } else {
    const gFront = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    gFront.addColorStop(0, darkenHex(node.glowColor, 0.45));
    gFront.addColorStop(0.5, darkenHex(node.glowColor, 0.55));
    gFront.addColorStop(1, darkenHex(node.glowColor, 0.70));
    ctx.fillStyle = gFront;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.18);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Top face (card surface — brightest, solid) ──
  drawPolygon(ctx, points);
  const grad = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  if (light) {
    grad.addColorStop(0, lightenHex(deepTone, 0.42));
    grad.addColorStop(0.5, deepToneLit);
    grad.addColorStop(1, deepToneMid);
  } else {
    grad.addColorStop(0, hexToRgba(node.glowColor, 0.85));
    grad.addColorStop(0.3, hexToRgba(node.glowColor, 0.58));
    grad.addColorStop(0.7, darkenHex(node.glowColor, 0.30));
    grad.addColorStop(1, darkenHex(node.glowColor, 0.50));
  }
  ctx.fillStyle = grad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.50) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 14) : (selected ? 30 : 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Specular on top face
  ctx.beginPath();
  const cSpec1 = {
    x: lt.x * 0.6 + rt.x * 0.4,
    y: lt.y * 0.6 + rt.y * 0.4,
  };
  const cSpec2 = {
    x: lb.x * 0.4 + rb.x * 0.6,
    y: lb.y * 0.4 + rb.y * 0.6,
  };
  ctx.moveTo(cSpec1.x, cSpec1.y);
  ctx.lineTo(cSpec2.x, cSpec2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 3.5 * bScale;
  ctx.stroke();

  // ── Header stripe (top 20 % of the card surface) ──
  const hdrFrac = 0.20;
  const hdrLB = {
    x: lt.x + (lb.x - lt.x) * hdrFrac,
    y: lt.y + (lb.y - lt.y) * hdrFrac,
  };
  const hdrRB = {
    x: rt.x + (rb.x - rt.x) * hdrFrac,
    y: rt.y + (rb.y - rt.y) * hdrFrac,
  };
  drawPolygon(ctx, [lt, rt, hdrRB, hdrLB]);
  if (light) {
    ctx.fillStyle = hexToRgba(node.glowColor, 0.18);
  } else {
    ctx.fillStyle = hexToRgba(node.glowColor, 0.12);
  }
  ctx.fill();

  // Header separator line
  ctx.beginPath();
  ctx.moveTo(hdrLB.x, hdrLB.y);
  ctx.lineTo(hdrRB.x, hdrRB.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.22);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // ── Top face border ──
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.82 : 0.68));
  ctx.lineWidth = (selected ? 2.8 : 2) * bScale;
  ctx.stroke();
  // Outer glow
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.14));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Leading edge highlight ──
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.92);
  ctx.lineWidth = 2.4 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.12 : 0.35);
  ctx.shadowBlur = (light ? 2 : 8) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Decorative dots in header (simulate small icons) ──
  const dotCount = 3;
  for (let i = 0; i < dotCount; i++) {
    const t = 0.07 + (i * 0.06);
    const dotX = lt.x + (rt.x - lt.x) * t + (lb.x - lt.x) * hdrFrac * 0.5;
    const dotY = lt.y + (rt.y - lt.y) * t + (lb.y - lt.y) * hdrFrac * 0.5;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 1.8 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(node.glowColor, 0.5 + i * 0.12);
    ctx.fill();
  }

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? bxDir : byDir;
  const textStackDirection = node.textRotated
    ? { x: byDir.x, y: byDir.y }
    : { x: -bxDir.x, y: -bxDir.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(byDir.x, byDir.y, -bxDir.x, -bxDir.y, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    // Title sits below the header area
    const titlePoint = worldToScreen(
      { x: node.x + node.width * 0.5, y: node.y + node.height * 0.48 },
      camera, viewport,
    );
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLength = node.textRotated ? topEdgeLen : leftEdgeLen;
    const nodeTopEdge = textEdgeLength * 0.85;
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

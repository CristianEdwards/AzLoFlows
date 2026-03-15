import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an isometric platform / pedestal — a flat dark base slab with a
 * glowing rim edge. Nodes visually "sit" on top of platforms.
 * Inspired by the Microsoft & e-commerce isometric reference images.
 */
export function renderPlatform(
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
  const depth = NODE_DEPTH * 0.22 * camera.zoom; // very shallow slab
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));
  const cornerR = Math.min(8, (topEdgeLen + leftEdgeLen) * 0.035);

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  // Depth-shifted points
  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [lb, rb, rbD, lbD]);
    ctx.shadowColor = 'rgba(0,0,0,0.30)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left side face ──
  drawRoundedPolygon(ctx, [lt, lb, lbD, ltD], cornerR);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.5) : darkenHex(node.glowColor, 0.55);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.2 : 0.12);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── Front face ──
  drawRoundedPolygon(ctx, [lb, rb, rbD, lbD], cornerR);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.55) : darkenHex(node.glowColor, 0.50);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.2 : 0.12);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── Right side face ──
  drawRoundedPolygon(ctx, [rt, rb, rbD, rtD], cornerR);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.6) : darkenHex(node.glowColor, 0.65);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.08);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── Top face (the platform surface) ──
  drawRoundedPolygon(ctx, points, cornerR);
  const gTop = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  if (light) {
    gTop.addColorStop(0, lightenHex(deepTone, 0.15));
    gTop.addColorStop(1, deepTone);
  } else {
    gTop.addColorStop(0, hexToRgba(node.glowColor, 0.65));
    gTop.addColorStop(0.5, hexToRgba(node.glowColor, 0.40));
    gTop.addColorStop(1, darkenHex(node.glowColor, 0.40));
  }
  ctx.fillStyle = gTop;
  ctx.fill();

  // ── Raised inner platform (second tier) ──
  const insetFrac = 0.15;
  const innerLT = {
    x: lt.x + (rt.x - lt.x) * insetFrac + (lb.x - lt.x) * insetFrac,
    y: lt.y + (rt.y - lt.y) * insetFrac + (lb.y - lt.y) * insetFrac,
  };
  const innerRT = {
    x: rt.x - (rt.x - lt.x) * insetFrac + (rb.x - rt.x) * insetFrac,
    y: rt.y - (rt.y - lt.y) * insetFrac + (rb.y - rt.y) * insetFrac,
  };
  const innerRB = {
    x: rb.x - (rb.x - lb.x) * insetFrac - (rb.x - rt.x) * insetFrac,
    y: rb.y - (rb.y - lb.y) * insetFrac - (rb.y - rt.y) * insetFrac,
  };
  const innerLB = {
    x: lb.x + (rb.x - lb.x) * insetFrac - (lb.x - lt.x) * insetFrac,
    y: lb.y + (rb.y - lb.y) * insetFrac - (lb.y - lt.y) * insetFrac,
  };
  const innerDepth = depth * 0.6;
  const iLTu = { x: innerLT.x, y: innerLT.y - innerDepth };
  const iRTu = { x: innerRT.x, y: innerRT.y - innerDepth };
  const iRBu = { x: innerRB.x, y: innerRB.y - innerDepth };
  const iLBu = { x: innerLB.x, y: innerLB.y - innerDepth };

  // Inner platform left face
  drawPolygon(ctx, [iLTu, iLBu, innerLB, innerLT]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.55) : darkenHex(node.glowColor, 0.50);
  ctx.fill();

  // Inner platform front face
  drawPolygon(ctx, [iLBu, iRBu, innerRB, innerLB]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.60) : darkenHex(node.glowColor, 0.45);
  ctx.fill();

  // Inner platform top face
  drawPolygon(ctx, [iLTu, iRTu, iRBu, iLBu]);
  const gInner = ctx.createLinearGradient(iLTu.x, iLTu.y, iRBu.x, iRBu.y);
  if (light) {
    gInner.addColorStop(0, lightenHex(deepTone, 0.20));
    gInner.addColorStop(1, deepTone);
  } else {
    gInner.addColorStop(0, hexToRgba(node.glowColor, 0.80));
    gInner.addColorStop(0.5, hexToRgba(node.glowColor, 0.50));
    gInner.addColorStop(1, darkenHex(node.glowColor, 0.35));
  }
  ctx.fillStyle = gInner;
  ctx.fill();

  // Specular on inner top face
  ctx.beginPath();
  const iSpec1 = {
    x: iLTu.x * 0.55 + iRTu.x * 0.45,
    y: iLTu.y * 0.55 + iRTu.y * 0.45,
  };
  const iSpec2 = {
    x: iLBu.x * 0.45 + iRBu.x * 0.55,
    y: iLBu.y * 0.45 + iRBu.y * 0.55,
  };
  ctx.moveTo(iSpec1.x, iSpec1.y);
  ctx.lineTo(iSpec2.x, iSpec2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 3 * bScale;
  ctx.stroke();

  // Inner platform border with glow
  drawRoundedPolygon(ctx, [iLTu, iRTu, iRBu, iLBu], cornerR * 0.7);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.90 : (light ? 0.65 : 0.50));
  ctx.lineWidth = (selected ? 2.5 : 1.8) * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.25 : 0.45);
  ctx.shadowBlur = (light ? 5 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Glow ring between tiers ──
  drawPolygon(ctx, [innerLT, innerRT, innerRB, innerLB]);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.50);
  ctx.lineWidth = 1.5 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.20 : 0.40);
  ctx.shadowBlur = (light ? 4 : 8) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Glowing rim on the top edge ──
  // Left edge (leading)
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : 0.85);
  ctx.lineWidth = (selected ? 3 : 2.2) * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.3 : 0.6);
  ctx.shadowBlur = (light ? 6 : 14) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Top-left edge
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(rt.x, rt.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.88 : 0.5);
  ctx.lineWidth = (selected ? 2.5 : 1.5) * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.2 : 0.4);
  ctx.shadowBlur = (light ? 4 : 8) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Bottom-left (front) edge with glow
  ctx.beginPath();
  ctx.moveTo(lb.x, lb.y);
  ctx.lineTo(rb.x, rb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.75 : 0.35);
  ctx.lineWidth = (selected ? 2.2 : 1.2) * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.25);
  ctx.shadowBlur = (light ? 3 : 6) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Outer glow border ──
  drawRoundedPolygon(ctx, points, cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.22 : (light ? 0.08 : 0.12));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Grid lines on surface ──
  for (let i = 1; i <= 2; i++) {
    const t = i / 3;
    ctx.beginPath();
    ctx.moveTo(lt.x + (lb.x - lt.x) * t, lt.y + (lb.y - lt.y) * t);
    ctx.lineTo(rt.x + (rb.x - rt.x) * t, rt.y + (rb.y - rt.y) * t);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.06 : 0.04);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lt.x + (rt.x - lt.x) * t, lt.y + (rt.y - lt.y) * t);
    ctx.lineTo(lb.x + (rb.x - lb.x) * t, lb.y + (rb.y - lb.y) * t);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.06 : 0.04);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();
  }

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? bx : by;
  const textStackDirection = node.textRotated
    ? { x: by.x, y: by.y }
    : { x: -bx.x, y: -bx.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(by.x, by.y, -bx.x, -bx.y, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePoint = worldToScreen({ x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 }, camera, viewport);
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(nodeTitleSize * camera.zoom);

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = {
        x: titlePoint.x + textStackDirection.x * 18,
        y: titlePoint.y + textStackDirection.y * 18,
      };
      drawTransformedText(ctx, node.subtitle, subPt, textDirection, textStackDirection,
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `${light ? 600 : 500} ${Math.round(scaledSize * 0.8125)}px Inter, sans-serif`);
    }
  }
}

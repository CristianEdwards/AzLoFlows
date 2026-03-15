import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a multi-layered isometric stack — 3 stacked slabs with glowing
 * separator lines between them. Inspired by the layered cube platforms in
 * the e-commerce reference image (image 4).
 */
export function renderStack(
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

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.25) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.15) : '';

  const layers = 3;
  const layerDepth = NODE_DEPTH * 0.32 * camera.zoom;
  const gapH = 6 * camera.zoom; // visible gap between layers (wider for glow)
  const totalDepth = layers * layerDepth + (layers - 1) * gapH;

  // ── Drop shadow ──
  if (light) {
    const shLT = { x: lt.x, y: lt.y + totalDepth };
    const shLB = { x: lb.x, y: lb.y + totalDepth };
    const shRB = { x: rb.x, y: rb.y + totalDepth };
    drawPolygon(ctx, [lb, rb, shRB, shLB]);
    ctx.shadowColor = 'rgba(0,0,0,0.30)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // Draw each layer from bottom to top
  for (let layer = layers - 1; layer >= 0; layer--) {
    const yOff = layer * (layerDepth + gapH);
    // Layer inset: bottom layers are slightly wider for a tapered look
    const inset = layer * 0.03;
    const insetPx = topEdgeLen * inset;

    // Top face corners for this layer
    const llt = { x: lt.x + bx.x * insetPx + by.x * insetPx, y: lt.y + yOff + bx.y * insetPx + by.y * insetPx };
    const lrt = { x: rt.x - bx.x * insetPx + by.x * insetPx, y: rt.y + yOff - bx.y * insetPx + by.y * insetPx };
    const lrb = { x: rb.x - bx.x * insetPx - by.x * insetPx, y: rb.y + yOff - bx.y * insetPx - by.y * insetPx };
    const llb = { x: lb.x + bx.x * insetPx - by.x * insetPx, y: lb.y + yOff + bx.y * insetPx - by.y * insetPx };

    // Depth-shifted
    const lltD = { x: llt.x, y: llt.y + layerDepth };
    const llbD = { x: llb.x, y: llb.y + layerDepth };
    const lrbD = { x: lrb.x, y: lrb.y + layerDepth };
    const lrtD = { x: lrt.x, y: lrt.y + layerDepth };

    const layerAlpha = 0.6 + layer * 0.15; // darker at bottom
    const layerLightFactor = 1 - layer * 0.12;

    // Left face
    drawPolygon(ctx, [llt, llb, llbD, lltD]);
    if (light) {
      ctx.fillStyle = darkenHex(deepTone, 0.65 + layer * 0.05);
    } else {
      ctx.fillStyle = hexToRgba(faceFill, 0.18 * layerAlpha);
    }
    ctx.fill();
    ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.2 : 0.08) * pulse);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();

    // Front face
    drawPolygon(ctx, [llb, lrb, lrbD, llbD]);
    if (light) {
      const g = ctx.createLinearGradient(llb.x, llb.y, lrbD.x, lrbD.y);
      g.addColorStop(0, darkenHex(deepTone, 0.6 + layer * 0.05));
      g.addColorStop(1, darkenHex(deepTone, 0.75 + layer * 0.05));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = hexToRgba(faceFill, 0.32 * layerAlpha);
    }
    ctx.fill();
    ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.2 : 0.08) * pulse);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();

    // Right face
    drawPolygon(ctx, [lrt, lrb, lrbD, lrtD]);
    if (light) {
      ctx.fillStyle = darkenHex(deepTone, 0.75 + layer * 0.05);
    } else {
      const gR = ctx.createLinearGradient(lrt.x, lrt.y, lrbD.x, lrbD.y);
      gR.addColorStop(0, hexToRgba(faceFill, 0.18 * layerAlpha));
      gR.addColorStop(1, hexToRgba(faceFill, 0.06 * layerAlpha));
      ctx.fillStyle = gR;
    }
    ctx.fill();

    // Top face
    drawPolygon(ctx, [llt, lrt, lrb, llb]);
    const gTop = ctx.createLinearGradient(llt.x, llt.y, lrb.x, lrb.y);
    if (light) {
      gTop.addColorStop(0, lightenHex(deepTone, 0.22 * layerLightFactor));
      gTop.addColorStop(0.5, lightenHex(deepTone, 0.12 * layerLightFactor));
      gTop.addColorStop(1, deepTone);
    } else {
      gTop.addColorStop(0, hexToRgba(faceFill, 0.85 * layerAlpha));
      gTop.addColorStop(0.3, hexToRgba(faceFill, 0.52 * layerAlpha));
      gTop.addColorStop(0.7, hexToRgba(faceFill, 0.28 * layerAlpha));
      gTop.addColorStop(1, hexToRgba(faceFill, 0.14 * layerAlpha));
    }
    ctx.fillStyle = gTop;
    if (layer === 0) {
      ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.40 : 0.55) * pulse);
      ctx.shadowBlur = light ? (selected ? 24 : 16) : (selected ? 32 : 22);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glass specular highlight on top face
    ctx.beginPath();
    const sSpec1 = {
      x: llt.x * 0.55 + lrt.x * 0.45,
      y: llt.y * 0.55 + lrt.y * 0.45,
    };
    const sSpec2 = {
      x: llb.x * 0.45 + lrb.x * 0.55,
      y: llb.y * 0.45 + lrb.y * 0.55,
    };
    ctx.moveTo(sSpec1.x, sSpec1.y);
    ctx.lineTo(sSpec2.x, sSpec2.y);
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.10)' : `rgba(255,255,255,${0.07 * layerAlpha})`;
    ctx.lineWidth = 3 * bScale;
    ctx.stroke();

    // Top face border
    drawPolygon(ctx, [llt, lrt, lrb, llb]);
    ctx.strokeStyle = hexToRgba(node.glowColor, (layer === 0 ? (selected ? 0.98 : (light ? 0.88 : 0.78)) : (light ? 0.50 : 0.38)));
    ctx.lineWidth = (layer === 0 ? (selected ? 3 : 2.2) : 1.4) * bScale;
    ctx.stroke();

    // ── Glowing separator line on front face between layers ──
    if (layer < layers - 1) {
      const glowY = llt.y + layerDepth + gapH * 0.5;
      const glL = { x: llb.x, y: llb.y + layerDepth + gapH * 0.3 };
      const glR = { x: lrb.x, y: lrb.y + layerDepth + gapH * 0.3 };
      ctx.beginPath();
      ctx.moveTo(glL.x, glL.y);
      ctx.lineTo(glR.x, glR.y);
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.5 : 0.7);
      ctx.lineWidth = 1.5 * bScale;
      ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.3 : 0.6);
      ctx.shadowBlur = 6 * bScale;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Left-side glow line
      const glLt = { x: llt.x, y: llt.y + layerDepth + gapH * 0.3 };
      const glLb = { x: llb.x, y: llb.y + layerDepth + gapH * 0.3 };
      ctx.beginPath();
      ctx.moveTo(glLt.x, glLt.y);
      ctx.lineTo(glLb.x, glLb.y);
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.5);
      ctx.lineWidth = 1 * bScale;
      ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.2 : 0.4);
      ctx.shadowBlur = 4 * bScale;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // ── Outer glow on top layer ──
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.15));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Leading edge glow (top layer) ──
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.5 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.45);
  ctx.shadowBlur = (light ? 3 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Icon + text on top layer ──
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

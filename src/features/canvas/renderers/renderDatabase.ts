import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import { getTextRatios } from '@/lib/geometry/textPosition';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a stacked 3-D donut/gauge rings in isometric space, representing a Database shape.
 */
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

  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const outerR = Math.min(topEdgeLen, leftEdgeLen) * 0.44;
  const ringW = outerR * 0.30;
  const innerR = outerR - ringW;
  
  // Increased height per cylinder
  const depth = NODE_DEPTH * 0.65 * camera.zoom; 

  const numLayers = 3;
  // Adding small gap (10% of depth) for styling separation
  const spacing = depth * 1.1;

  const fillFrac = 0.72 + Math.sin(node.zIndex * 1.7) * 0.15;
  const startAngle = -Math.PI * 0.5;
  const endAngle = startAngle + Math.PI * 2 * fillFrac;
  const segments = 48;

  // Render from furthest (bottom) to nearest (top)
  for (let layer = numLayers - 1; layer >= 0; layer--) {
    const layerYOff = layer * spacing - ((numLayers * spacing) / 3); 
    
    // Position helper for this specific layer
    const isoRingPt = (theta: number, r: number, yOffLocal = 0) => ({
      x: cx + bx.x * Math.cos(theta) * r + by.x * Math.sin(theta) * r,
      y: cy + bx.y * Math.cos(theta) * r + by.y * Math.sin(theta) * r + yOffLocal + layerYOff,
    });

    // Drop shadow (only for bottom-most layer)
    if (layer === numLayers - 1 && light) {
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const p = isoRingPt(a, outerR, depth);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill();
      ctx.shadowOffsetY = 0;
    }

    // Outer rim depth
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
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

    // Bottom face bounds of the arc (inner hole cutout)
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const p = isoRingPt(a, outerR, depth);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (let i = segments; i >= 0; i--) {
      const a = (i / segments) * Math.PI * 2;
      const p = isoRingPt(a, innerR, depth);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = light ? darkenHex(deepTone, 0.55) : hexToRgba(faceFill, 0.08);
    ctx.fill();

    // Top face
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
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.20 : 0.10);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();

    // Filled arc
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
    ctx.fill();

    ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.70 : 0.55));
    ctx.lineWidth = (selected ? 2 : 1.2) * bScale;
    ctx.stroke();

    // Depth faces for arc
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
  }

  // Draw node title underneath
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail && node.title !== 'New Node') {
    const { x: rx, y: ry } = getTextRatios(node, 0.50);
    const titlePt = {
      x: lt.x + (rt.x - lt.x) * rx + (lb.x - lt.x) * ry,
      y: lt.y + (rt.y - lt.y) * rx + (lb.y - lt.y) * ry + (numLayers * spacing) * 0.8 + 10 * camera.zoom
    };

    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, bx, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.90)' : hexToRgba(node.glowColor, 0.95),
      `600 ${scaledSize}px Inter, sans-serif`);
  }
}

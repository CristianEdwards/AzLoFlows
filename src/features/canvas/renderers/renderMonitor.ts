import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a volumetric desktop monitor in isometric.
 * The isoQuad is the thin top edge of the monitor body.
 * The front face (spanning node.width × depth) is the SCREEN.
 * A stand (neck + base) renders below the monitor body.
 */
export function renderMonitor(
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

  // Basis vectors along iso axes (normalised)
  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  /* ── Monitor body depth (screen height) ── */
  const depth = node.width * 0.6 * camera.zoom;

  // Monitor body: standard depth extrusion downward from isoQuad
  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  /* ── Stand geometry ── */
  const standNeckH = 16 * camera.zoom;
  const standBaseH = 5 * camera.zoom;
  // Neck runs from front-center of monitor bottom edge downward
  const neckTop = { x: (lbD.x + rbD.x) * 0.5, y: (lbD.y + rbD.y) * 0.5 };
  const neckBot = { x: neckTop.x, y: neckTop.y + standNeckH };
  // Stand base: flat quad below neck
  const standHW = topEdgeLen * 0.32;
  const standHD = leftEdgeLen * 0.28;
  const sbl  = { x: neckBot.x - bx.x * standHW - by.x * standHD, y: neckBot.y - bx.y * standHW - by.y * standHD };
  const sbr  = { x: neckBot.x + bx.x * standHW - by.x * standHD, y: neckBot.y + bx.y * standHW - by.y * standHD };
  const sbrf = { x: neckBot.x + bx.x * standHW + by.x * standHD, y: neckBot.y + bx.y * standHW + by.y * standHD };
  const sblf = { x: neckBot.x - bx.x * standHW + by.x * standHD, y: neckBot.y - bx.y * standHW + by.y * standHD };
  const sbld  = { x: sbl.x,  y: sbl.y  + standBaseH };
  const sbrfd = { x: sbrf.x, y: sbrf.y + standBaseH };
  const sblfd = { x: sblf.x, y: sblf.y + standBaseH };

  /* ── Render (back → front, bottom → top) ── */

  // 0. Drop shadow
  if (light) {
    drawPolygon(ctx, [sbl, sbr, sbrf, sblf]);
    
    
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    
    
    ctx.shadowOffsetY = 0;
  }

  // 1. Stand base – top face
  drawPolygon(ctx, [sbl, sbr, sbrf, sblf]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.55) : hexToRgba(faceFill, 0.22);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.2);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();
  // Stand base – left face
  drawPolygon(ctx, [sbl, sblf, sblfd, sbld]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.7) : hexToRgba(faceFill, 0.12);
  ctx.fill();
  ctx.stroke();
  // Stand base – front face
  drawPolygon(ctx, [sblf, sbrf, sbrfd, sblfd]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.65) : hexToRgba(faceFill, 0.15);
  ctx.fill();
  ctx.stroke();

  // 2. Stand neck
  ctx.beginPath();
  ctx.moveTo(neckTop.x, neckTop.y);
  ctx.lineTo(neckBot.x, neckBot.y);
  ctx.strokeStyle = light ? darkenHex(deepTone, 0.5) : hexToRgba(faceFill, 0.4);
  ctx.lineWidth = 4 * bScale;
  ctx.stroke();

  // 3. Left face (side of monitor – narrow, spans node.height)
  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.75);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.15);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.2);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // 4. Front face (THE SCREEN – wide, spans node.width × depth)
  const screenFace = [lb, rb, rbD, lbD];
  drawPolygon(ctx, screenFace);
  const screenGrad = ctx.createLinearGradient(lb.x, lb.y, lbD.x, lbD.y);
  if (light) {
    screenGrad.addColorStop(0, deepToneLit);
    screenGrad.addColorStop(0.35, deepToneMid);
    screenGrad.addColorStop(1, deepTone);
  } else {
    screenGrad.addColorStop(0, hexToRgba(faceFill, 0.78));
    screenGrad.addColorStop(0.35, hexToRgba(faceFill, 0.50));
    screenGrad.addColorStop(1, hexToRgba(faceFill, 0.18));
  }
  ctx.fillStyle = screenGrad;
  
  
  ctx.fill();
  

  // Screen border
  drawPolygon(ctx, screenFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();
  // Outer glow
  drawPolygon(ctx, screenFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // Screen bezel inset
  const bz = 3 * bScale;
  const bzLB = { x: lb.x + bx.x * bz + 0, y: lb.y + bx.y * bz + bz };
  const bzRB = { x: rb.x - bx.x * bz + 0, y: rb.y - bx.y * bz + bz };
  const bzRD = { x: rbD.x - bx.x * bz, y: rbD.y - bx.y * bz - bz };
  const bzLD = { x: lbD.x + bx.x * bz, y: lbD.y + bx.y * bz - bz };
  drawPolygon(ctx, [bzLB, bzRB, bzRD, bzLD]);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // Reflection line
  const reflY = 0.12;
  const rl = { x: lb.x + (lbD.x - lb.x) * reflY + (rb.x - lb.x) * 0.08, y: lb.y + (lbD.y - lb.y) * reflY + (rb.y - lb.y) * 0.08 };
  const rr = { x: lb.x + (lbD.x - lb.x) * reflY + (rb.x - lb.x) * 0.92, y: lb.y + (lbD.y - lb.y) * reflY + (rb.y - lb.y) * 0.92 };
  ctx.beginPath();
  ctx.moveTo(rl.x, rl.y);
  ctx.lineTo(rr.x, rr.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // Power LED
  const ledPos = { x: (lbD.x + rbD.x) * 0.5, y: (lbD.y + rbD.y) * 0.5 - 5 * bScale };
  ctx.beginPath();
  ctx.arc(ledPos.x, ledPos.y, 2 * bScale, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(node.glowColor, 0.9);
  
  
  ctx.fill();
  

  // 5. Top face (thin strip on top of the monitor body)
  drawPolygon(ctx, points);
  if (light) {
    ctx.fillStyle = lightenHex(deepTone, 0.28);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.32);
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.5 : 0.35);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // Leading edge highlight (top-left edge of the screen)
  ctx.beginPath();
  ctx.moveTo(lb.x, lb.y);
  ctx.lineTo(lbD.x, lbD.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.5 * bScale;
  
  
  ctx.stroke();
  

  /* ── Icon + text on the screen face ── */
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  // Screen face basis: horizontal = bx direction, vertical = downward on screen
  const screenCX = (lb.x + rb.x + lbD.x + rbD.x) / 4;
  const screenCY = (lb.y + rb.y + lbD.y + rbD.y) / 4;
  const screenBasisX = bx; // along the width edge

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, depth / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 1.3;
    ctx.save();
    ctx.translate(screenCX, screenCY - depth * 0.08);
    ctx.transform(screenBasisX.x, screenBasisX.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.75;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titleY = screenCY + depth * 0.2;
    const textRatios = getTextRatios(node, 0.48);
    const screenW = topEdgeLen;
    const screenH = depth;
    const rx = (textRatios.x - 0.5) * screenW * 0.8;
    const ry = (textRatios.y - 0.48) * screenH * 0.6;
    const titlePt = { x: screenCX + rx, y: titleY + ry };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.9);

    drawTransformedText(ctx, node.title, titlePt, screenBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = { x: titlePt.x, y: titlePt.y + scaledSize * 1.2 };
      drawTransformedText(ctx, node.subtitle, subPt, screenBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.8)}px Inter, sans-serif`);
    }
  }
}

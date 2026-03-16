import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/**
 * Renders an isometric shield shape — a pointed-bottom security/protection
 * emblem with 3D depth. The shield outline is inscribed within the isoQuad,
 * with a pointed bottom vertex.
 */
export function renderShield(
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
  const depth = NODE_DEPTH * 0.5 * camera.zoom;
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

  // Shield outline on the top face: flat top edge, curved sides meeting at bottom point
  // Use isoQuad midpoints for proportional placement
  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;

  // Shield vertices (5 points)
  const sTopL: Point = { x: lt.x + (lb.x - lt.x) * 0.05, y: lt.y + (lb.y - lt.y) * 0.05 };
  const sTopR: Point = { x: rt.x + (rb.x - rt.x) * 0.05, y: rt.y + (rb.y - rt.y) * 0.05 };
  const sMidL: Point = { x: lt.x + (lb.x - lt.x) * 0.55, y: lt.y + (lb.y - lt.y) * 0.55 };
  const sMidR: Point = { x: rt.x + (rb.x - rt.x) * 0.55, y: rt.y + (rb.y - rt.y) * 0.55 };
  const sBot: Point = { x: (lb.x + rb.x) * 0.5, y: (lb.y + rb.y) * 0.5 + leftEdgeLen * 0.05 };

  // Depth-shifted versions
  const sTopLD = { x: sTopL.x, y: sTopL.y + depth };
  const sTopRD = { x: sTopR.x, y: sTopR.y + depth };
  const sMidLD = { x: sMidL.x, y: sMidL.y + depth };
  const sMidRD = { x: sMidR.x, y: sMidR.y + depth };
  const sBotD = { x: sBot.x, y: sBot.y + depth };

  function shieldPath() {
    ctx.beginPath();
    ctx.moveTo(sTopL.x, sTopL.y);
    ctx.lineTo(sTopR.x, sTopR.y);
    ctx.lineTo(sMidR.x, sMidR.y);
    ctx.quadraticCurveTo(
      (sMidR.x + sBot.x) * 0.5 + bx.x * topEdgeLen * 0.05,
      (sMidR.y + sBot.y) * 0.5 + bx.y * topEdgeLen * 0.05,
      sBot.x, sBot.y,
    );
    ctx.quadraticCurveTo(
      (sMidL.x + sBot.x) * 0.5 - bx.x * topEdgeLen * 0.05,
      (sMidL.y + sBot.y) * 0.5 - bx.y * topEdgeLen * 0.05,
      sMidL.x, sMidL.y,
    );
    ctx.closePath();
  }

  // ── Drop shadow ──
  if (light) {
    shieldPath();
    
    
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    
    
    ctx.shadowOffsetY = 0;
  }

  // ── Left side face ──
  ctx.beginPath();
  ctx.moveTo(sTopL.x, sTopL.y);
  ctx.lineTo(sMidL.x, sMidL.y);
  ctx.lineTo(sMidLD.x, sMidLD.y);
  ctx.lineTo(sTopLD.x, sTopLD.y);
  ctx.closePath();
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.75);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.18);
  }
  ctx.fill();

  // ── Front-left face (sMidL → sBot + depth) ──
  ctx.beginPath();
  ctx.moveTo(sMidL.x, sMidL.y);
  ctx.quadraticCurveTo(
    (sMidL.x + sBot.x) * 0.5 - bx.x * topEdgeLen * 0.05,
    (sMidL.y + sBot.y) * 0.5 - bx.y * topEdgeLen * 0.05,
    sBot.x, sBot.y,
  );
  ctx.lineTo(sBotD.x, sBotD.y);
  ctx.lineTo(sMidLD.x, sMidLD.y);
  ctx.closePath();
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.7);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.28);
  }
  ctx.fill();

  // ── Front-right face (sBot → sMidR + depth) ──
  ctx.beginPath();
  ctx.moveTo(sBot.x, sBot.y);
  ctx.quadraticCurveTo(
    (sMidR.x + sBot.x) * 0.5 + bx.x * topEdgeLen * 0.05,
    (sMidR.y + sBot.y) * 0.5 + bx.y * topEdgeLen * 0.05,
    sMidR.x, sMidR.y,
  );
  ctx.lineTo(sMidRD.x, sMidRD.y);
  ctx.lineTo(sBotD.x, sBotD.y);
  ctx.closePath();
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.65);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.22);
  }
  ctx.fill();

  // ── Right side face ──
  ctx.beginPath();
  ctx.moveTo(sMidR.x, sMidR.y);
  ctx.lineTo(sTopR.x, sTopR.y);
  ctx.lineTo(sTopRD.x, sTopRD.y);
  ctx.lineTo(sMidRD.x, sMidRD.y);
  ctx.closePath();
  if (light) {
    ctx.fillStyle = darkenHex(deepTone, 0.80);
  } else {
    ctx.fillStyle = hexToRgba(faceFill, 0.14);
  }
  ctx.fill();

  // ── Top face (shield surface) ──
  shieldPath();
  const grad = ctx.createLinearGradient(sTopL.x, sTopL.y, sBot.x, sBot.y);
  if (light) {
    grad.addColorStop(0, deepToneLit);
    grad.addColorStop(0.4, deepToneMid);
    grad.addColorStop(1, deepTone);
  } else {
    grad.addColorStop(0, hexToRgba(faceFill, 0.82));
    grad.addColorStop(0.4, hexToRgba(faceFill, 0.48));
    grad.addColorStop(1, hexToRgba(faceFill, 0.22));
  }
  ctx.fillStyle = grad;
  
  
  ctx.fill();
  

  // ── Top face border ──
  shieldPath();
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  // ── Outer glow ──
  shieldPath();
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Inner shield line (decorative) ──
  const inset = 0.12;
  const iTopL = { x: sTopL.x + (cx - sTopL.x) * inset, y: sTopL.y + (cy - sTopL.y) * inset };
  const iTopR = { x: sTopR.x + (cx - sTopR.x) * inset, y: sTopR.y + (cy - sTopR.y) * inset };
  const iMidL = { x: sMidL.x + (cx - sMidL.x) * inset, y: sMidL.y + (cy - sMidL.y) * inset };
  const iMidR = { x: sMidR.x + (cx - sMidR.x) * inset, y: sMidR.y + (cy - sMidR.y) * inset };
  const iBot = { x: sBot.x + (cx - sBot.x) * inset * 0.6, y: sBot.y + (cy - sBot.y) * inset * 0.6 };

  ctx.beginPath();
  ctx.moveTo(iTopL.x, iTopL.y);
  ctx.lineTo(iTopR.x, iTopR.y);
  ctx.lineTo(iMidR.x, iMidR.y);
  ctx.quadraticCurveTo((iMidR.x + iBot.x) * 0.5, (iMidR.y + iBot.y) * 0.5, iBot.x, iBot.y);
  ctx.quadraticCurveTo((iMidL.x + iBot.x) * 0.5, (iMidL.y + iBot.y) * 0.5, iMidL.x, iMidL.y);
  ctx.closePath();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.2 : 0.12);
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // ── Leading edge glow ──
  ctx.beginPath();
  ctx.moveTo(sTopL.x, sTopL.y);
  ctx.lineTo(sMidL.x, sMidL.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.5 * bScale;
  
  
  ctx.stroke();
  

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const topFaceBasisX = bx;
  const topFaceBasisY = by;
  const textDirection = node.textRotated ? topFaceBasisX : topFaceBasisY;
  const textStackDirection = node.textRotated
    ? { x: topFaceBasisY.x, y: topFaceBasisY.y }
    : { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  const shieldCX = (sTopL.x + sTopR.x + sBot.x) / 3;
  const shieldCY = (sTopL.y + sTopR.y + sBot.y) / 3;

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom * 0.9;
    ctx.save();
    ctx.translate(shieldCX, shieldCY - 4 * camera.zoom);
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
    const titlePoint = { x: shieldCX, y: shieldCY + 8 * camera.zoom };
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(nodeTitleSize * camera.zoom * 0.85);

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${scaledSize}px Inter, sans-serif`);
  }
}

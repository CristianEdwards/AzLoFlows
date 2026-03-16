import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/**
 * Renders an isometric hexagonal prism.
 * The hex outline is inscribed in the isoQuad with 6 vertices,
 * and the body extrudes downward with 3D depth faces.
 * Common in network topology and tech infrastructure diagrams.
 */
export function renderHexagon(
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
  const depth = NODE_DEPTH * 0.65 * camera.zoom;
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

  // Hex vertices inscribed in the isoQuad (pointy-top orientation)
  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const hx = { x: (rt.x - lt.x) / 2, y: (rt.y - lt.y) / 2 };
  const hy = { x: (lb.x - lt.x) / 2, y: (lb.y - lt.y) / 2 };

  // 6 hex vertices (pointy top/bottom)
  const hex: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 6) + (i * Math.PI / 3); // 30° offset for pointy top
    const u = Math.cos(angle);
    const v = Math.sin(angle);
    hex.push({
      x: cx + u * hx.x + v * hy.x,
      y: cy + u * hx.y + v * hy.y,
    });
  }
  // Depth-shifted hex
  const hexD = hex.map(p => ({ x: p.x, y: p.y + depth }));

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, hex);
    
    
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    
    
    ctx.shadowOffsetY = 0;
  }

  // ── Visible side faces (bottom 3 edges of hex: indices 2→3, 3→4, 4→5) ──
  // We draw the 3 faces that face "toward the viewer" (bottom half of hex)
  const sideFaces = [
    [hex[2], hex[3], hexD[3], hexD[2]], // left-bottom
    [hex[3], hex[4], hexD[4], hexD[3]], // front-bottom
    [hex[4], hex[5], hexD[5], hexD[4]], // right-bottom
  ];
  const sideAlpha = [0.22, 0.35, 0.18];

  for (let f = 0; f < sideFaces.length; f++) {
    drawPolygon(ctx, sideFaces[f]);
    if (light) {
      const g = ctx.createLinearGradient(sideFaces[f][0].x, sideFaces[f][0].y, sideFaces[f][2].x, sideFaces[f][2].y);
      g.addColorStop(0, lightenHex(deepTone, 0.08));
      g.addColorStop(1, darkenHex(deepTone, 0.7 + f * 0.05));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = hexToRgba(faceFill, sideAlpha[f]);
    }
    ctx.fill();
    ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.30 : 0.12) * pulse);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();
  }

  // ── Top face ──
  drawPolygon(ctx, hex);
  const gradient = ctx.createLinearGradient(hex[0].x, hex[0].y, hex[3].x, hex[3].y);
  if (light) {
    gradient.addColorStop(0, deepToneLit);
    gradient.addColorStop(0.5, deepToneMid);
    gradient.addColorStop(1, deepTone);
  } else {
    gradient.addColorStop(0, hexToRgba(faceFill, 0.82));
    gradient.addColorStop(0.5, hexToRgba(faceFill, 0.48));
    gradient.addColorStop(1, hexToRgba(faceFill, 0.22));
  }
  ctx.fillStyle = gradient;
  
  
  ctx.fill();
  

  // ── Top face border ──
  drawPolygon(ctx, hex);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.88 : 0.78));
  ctx.lineWidth = (selected ? 3.2 : 2.4) * bScale;
  ctx.stroke();

  // ── Outer glow ──
  drawPolygon(ctx, hex);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Inner hexagon line (decorative) ──
  const innerHex = hex.map(p => ({
    x: p.x + (cx - p.x) * 0.2,
    y: p.y + (cy - p.y) * 0.2,
  }));
  drawPolygon(ctx, innerHex);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.12 : 0.06);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // ── Leading edge glow (top-left edge hex[0]→hex[5]) ──
  ctx.beginPath();
  ctx.moveTo(hex[0].x, hex[0].y);
  ctx.lineTo(hex[5].x, hex[5].y);
  ctx.lineTo(hex[4].x, hex[4].y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.5 * bScale;
  
  
  ctx.stroke();
  

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? bx : by;
  const textStackDirection = node.textRotated
    ? { x: by.x, y: by.y }
    : { x: -bx.x, y: -bx.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom * 0.9;
    ctx.save();
    ctx.translate(cx, cy - 4 * camera.zoom);
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
    const titlePoint = { x: cx, y: cy + 8 * camera.zoom };
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(nodeTitleSize * camera.zoom * 0.85);

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

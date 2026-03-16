import { GRID_SIZE, DEFAULT_FONT_SIZE, AREA_ICON_SCALE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, darkenHex } from '@/lib/rendering/tokens';
import type { AreaEntity, CameraState, LabelAnchorCorner } from '@/types/document';

/** Offset ratios and icon-stack direction multiplier per corner. */
function anchorLayout(corner: LabelAnchorCorner) {
  switch (corner) {
    case 'top-left':     return { xR: 0.18, yR: 0.14, stackSign: 1 };
    case 'top-right':    return { xR: 0.82, yR: 0.14, stackSign: 1 };
    case 'bottom-right': return { xR: 0.82, yR: 0.86, stackSign: -1 };
    case 'bottom-left':
    default:             return { xR: 0.18, yR: 0.86, stackSign: -1 };
  }
}

export function renderArea(
  ctx: CanvasRenderingContext2D,
  area: AreaEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const points = isoQuad(area.x, area.y, area.width, area.height, camera, viewport);
  const glow = 0.65 + Math.sin(time * 0.001 + area.zIndex) * 0.15;
  const bottomLeft = points[3];
  const bottomRight = points[2];
  const topLeft = points[0];
  const topRight = points[1];
  const topEdgeLength = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y) || 1;
  const leftEdgeLength = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y) || 1;
  const topFaceBasisX = {
    x: (topRight.x - topLeft.x) / topEdgeLength,
    y: (topRight.y - topLeft.y) / topEdgeLength,
  };
  const topFaceBasisY = {
    x: (bottomLeft.x - topLeft.x) / leftEdgeLength,
    y: (bottomLeft.y - topLeft.y) / leftEdgeLength,
  };
  const textDirection = topFaceBasisY;
  const textStackDirection = { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  // Flat fill
  if (light) {
    // Paint opaque white base so colours aren't washed out by the grey canvas
    drawPolygon(ctx, points);
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fill();
  }
  drawPolygon(ctx, points);
  const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
  gradient.addColorStop(0, hexToRgba(area.fill, light ? 0.85 : 0.76));
  gradient.addColorStop(0.5, hexToRgba(area.fill, light ? 0.60 : 0.34));
  gradient.addColorStop(1, hexToRgba(area.fill, light ? 0.42 : 0.2));
  ctx.fillStyle = gradient;
  
  
  ctx.fill();
  

  // Border
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(area.borderColor, selected ? 0.98 : (light ? 0.92 : 0.85));
  ctx.lineWidth = selected ? 16 : 12;
  ctx.stroke();

  // Outer glow border
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(area.glowColor, selected ? 0.18 : (light ? 0.06 : 0.10));
  ctx.lineWidth = selected ? 22 : 18;
  ctx.stroke();

  // Grid lines
  ctx.save();
  drawPolygon(ctx, points);
  ctx.clip();
  ctx.strokeStyle = hexToRgba(area.glowColor, light ? 0.12 : 0.05);
  ctx.lineWidth = light ? 0.9 : 0.7;
  const step = GRID_SIZE;
  for (let x = area.x + step; x < area.x + area.width; x += step) {
    const start = worldToScreen({ x, y: area.y }, camera, viewport);
    const end = worldToScreen({ x, y: area.y + area.height }, camera, viewport);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  for (let y = area.y + step; y < area.y + area.height; y += step) {
    const start = worldToScreen({ x: area.x, y }, camera, viewport);
    const end = worldToScreen({ x: area.x + area.width, y }, camera, viewport);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();

  // Icon + label positioned at the chosen corner of the isometric diamond
  const hasIcon = area.icon && nodeIconCatalog[area.icon];
  const { xR, yR, stackSign } = anchorLayout(area.labelAnchor ?? 'bottom-left');
  const anchorWorld = { x: area.x + area.width * xR, y: area.y + area.height * yR };
  const areaFontSize = area.fontSize ?? DEFAULT_FONT_SIZE;

  // Clamp font size so text never overflows the container's screen-space bounds.
  const availableWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y) * 0.85;
  const testFont = `700 ${areaFontSize}px Rajdhani, sans-serif`;
  ctx.font = testFont;
  const textWidth = ctx.measureText(area.label).width;
  const clampedFontSize = textWidth > availableWidth
    ? Math.floor(areaFontSize * (availableWidth / textWidth))
    : areaFontSize;

  // Draw area icon
  if (hasIcon) {
    const iconDef = nodeIconCatalog[area.icon!];
    const iconSize = Math.min(area.width, area.height) * AREA_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(anchorWorld, camera, viewport);
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(
      topFaceBasisY.x, topFaceBasisY.y,
      -topFaceBasisX.x, -topFaceBasisX.y,
      0, 0,
    );
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 1.0 : 0.6;
    ctx.fillStyle = light ? '#ffffff' : hexToRgba(area.borderColor, 1.0);
    for (const d of iconDef.paths) {
      ctx.fill(new Path2D(d));
    }
    ctx.restore();
  }

  // Position label offset from icon (direction depends on corner) or at anchor if no icon
  const iconOffsetPx = hasIcon ? Math.min(area.width, area.height) * 0.14 * camera.zoom * 0.7 : 0;
  const labelScreen = worldToScreen(anchorWorld, camera, viewport);
  const label = {
    x: labelScreen.x + textStackDirection.x * iconOffsetPx * stackSign,
    y: labelScreen.y + textStackDirection.y * iconOffsetPx * stackSign,
  };

  drawTransformedText(ctx, area.label, label, textDirection, textStackDirection, '#ffffff', `700 ${clampedFontSize}px Rajdhani, sans-serif`);
}

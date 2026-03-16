import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import type { TextEntity, CameraState } from '@/types/document';

export function renderText(
  ctx: CanvasRenderingContext2D,
  text: TextEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  // Compute isometric basis vectors using a small reference quad
  const refQuad = isoQuad(text.x, text.y, 100, 100, camera, viewport);
  const topLeft = refQuad[0];
  const topRight = refQuad[1];
  const bottomLeft = refQuad[3];
  const topEdgeLength = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y) || 1;
  const leftEdgeLength = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y) || 1;
  const basisXDefault = {
    x: (bottomLeft.x - topLeft.x) / leftEdgeLength,
    y: (bottomLeft.y - topLeft.y) / leftEdgeLength,
  };
  const basisYDefault = {
    x: -(topRight.x - topLeft.x) / topEdgeLength,
    y: -(topRight.y - topLeft.y) / topEdgeLength,
  };

  const basisX = text.rotated ? { x: (topRight.x - topLeft.x) / topEdgeLength, y: (topRight.y - topLeft.y) / topEdgeLength } : basisXDefault;
  const basisY = text.rotated ? { x: (bottomLeft.x - topLeft.x) / leftEdgeLength, y: (bottomLeft.y - topLeft.y) / leftEdgeLength } : basisYDefault;

  const origin = worldToScreen({ x: text.x, y: text.y }, camera, viewport);
  const scaledFontSize = Math.round(text.fontSize * camera.zoom);
  const font = `700 ${scaledFontSize}px Rajdhani, sans-serif`;

  const effectiveColor = light ? '#0d0d1a' : '#ffffff';

  if (selected) {
    const lines = text.label.split('\n');
    const lineHeight = scaledFontSize;
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = -totalHeight / 2;
    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.transform(basisX.x, basisX.y, basisY.x, basisY.y, 0, 0);
    
    
    ctx.fillStyle = effectiveColor;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, startY + i * lineHeight);
    }
    
    ctx.restore();
  }

  drawTransformedText(ctx, text.label, origin, basisX, basisY, effectiveColor, font);
}

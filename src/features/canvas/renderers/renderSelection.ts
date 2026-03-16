import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawPolygon } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba } from '@/lib/rendering/tokens';
import type { AreaEntity, CameraState, NodeEntity, PipeEntity } from '@/types/document';

export function renderSelectionOutline(
  ctx: CanvasRenderingContext2D,
  entity: AreaEntity | NodeEntity | PipeEntity,
  camera: CameraState,
  viewport: ViewportSize,
): void {
  const points = isoQuad(entity.x, entity.y, entity.width, entity.height, camera, viewport);
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba('#d8f7ff', 0.95);
  ctx.lineWidth = 1.25;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}

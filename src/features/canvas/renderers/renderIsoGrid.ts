import { GRID_SIZE } from '@/lib/geometry/grid';
import { worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import type { CameraState } from '@/types/document';

export function renderIsoGrid(ctx: CanvasRenderingContext2D, camera: CameraState, viewport: ViewportSize, theme: 'dark' | 'light' = 'dark'): void {
  // Compute world-space range from viewport instead of hardcoded ±2400
  const invZoom = 1 / camera.zoom;
  const worldMinX = -camera.x * invZoom - viewport.width * invZoom;
  const worldMaxX = -camera.x * invZoom + viewport.width * 2 * invZoom;
  const worldMinY = -camera.y * invZoom - viewport.height * invZoom;
  const worldMaxY = -camera.y * invZoom + viewport.height * 2 * invZoom;
  const startX = Math.floor(worldMinX / GRID_SIZE) * GRID_SIZE;
  const endX = Math.ceil(worldMaxX / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(worldMinY / GRID_SIZE) * GRID_SIZE;
  const endY = Math.ceil(worldMaxY / GRID_SIZE) * GRID_SIZE;
  const major = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
  const minor = theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.02)';

  for (let x = startX, column = 0; x <= endX; x += GRID_SIZE, column += 1) {
    const start = worldToScreen({ x, y: startY }, camera, viewport);
    const end = worldToScreen({ x, y: endY }, camera, viewport);
    ctx.strokeStyle = column % 4 === 0 ? major : minor;
    ctx.lineWidth = column % 4 === 0 ? 0.8 : 0.55;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  for (let y = startY, row = 0; y <= endY; y += GRID_SIZE, row += 1) {
    const start = worldToScreen({ x: startX, y }, camera, viewport);
    const end = worldToScreen({ x: endX, y }, camera, viewport);
    ctx.strokeStyle = row % 4 === 0 ? major : minor;
    ctx.lineWidth = row % 4 === 0 ? 0.8 : 0.55;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

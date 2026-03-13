import { GRID_SIZE } from '@/lib/geometry/grid';
import { worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import type { CameraState } from '@/types/document';

export function renderIsoGrid(ctx: CanvasRenderingContext2D, camera: CameraState, viewport: ViewportSize, theme: 'dark' | 'light' = 'dark'): void {
  const range = 2400;
  const major = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
  const minor = theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.02)';

  for (let x = -range, column = 0; x <= range; x += GRID_SIZE, column += 1) {
    const start = worldToScreen({ x, y: -range }, camera, viewport);
    const end = worldToScreen({ x, y: range }, camera, viewport);
    ctx.strokeStyle = column % 4 === 0 ? major : minor;
    ctx.lineWidth = column % 4 === 0 ? 0.8 : 0.55;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  for (let y = -range, row = 0; y <= range; y += GRID_SIZE, row += 1) {
    const start = worldToScreen({ x: -range, y }, camera, viewport);
    const end = worldToScreen({ x: range, y }, camera, viewport);
    ctx.strokeStyle = row % 4 === 0 ? major : minor;
    ctx.lineWidth = row % 4 === 0 ? 0.8 : 0.55;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}
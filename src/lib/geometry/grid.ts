import { GRID_SIZE } from '@/lib/config';
import type { Point } from '@/types/document';

export { GRID_SIZE };

export function snapToGrid(point: Point): Point {
  return {
    x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
  };
}

export function snapValue(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}
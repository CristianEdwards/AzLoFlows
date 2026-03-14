import { ISO_ANGLE_DEG, ISO_Y_SCALE, ISO_SCALE } from '@/lib/config';
import type { CameraState, Point } from '@/types/document';

const ISO_ANGLE = (ISO_ANGLE_DEG * Math.PI) / 180;
const ISO_COS = Math.cos(ISO_ANGLE);
const ISO_SIN = Math.sin(ISO_ANGLE);

export interface ViewportSize {
  width: number;
  height: number;
}

export function projectIso(point: Point): Point {
  return {
    x: (point.x * ISO_COS - point.y * ISO_SIN) * ISO_SCALE,
    y: (point.x * ISO_SIN + point.y * ISO_COS) * ISO_Y_SCALE * ISO_SCALE,
  };
}

export function unprojectIso(point: Point): Point {
  const px = point.x / ISO_SCALE;
  const py = point.y / (ISO_Y_SCALE * ISO_SCALE);
  return {
    x: px * ISO_COS + py * ISO_SIN,
    y: -px * ISO_SIN + py * ISO_COS,
  };
}

export function worldToScreen(point: Point, camera: CameraState, viewport: ViewportSize): Point {
  const projected = projectIso(point);
  return {
    x: viewport.width * 0.5 + camera.x + projected.x * camera.zoom,
    y: viewport.height * 0.5 + camera.y + projected.y * camera.zoom,
  };
}

export function screenToWorld(point: Point, camera: CameraState, viewport: ViewportSize): Point {
  const projected = {
    x: (point.x - viewport.width * 0.5 - camera.x) / camera.zoom,
    y: (point.y - viewport.height * 0.5 - camera.y) / camera.zoom,
  };
  return unprojectIso(projected);
}

export function isoQuad(x: number, y: number, width: number, height: number, camera: CameraState, viewport: ViewportSize): Point[] {
  return [
    worldToScreen({ x, y }, camera, viewport),
    worldToScreen({ x: x + width, y }, camera, viewport),
    worldToScreen({ x: x + width, y: y + height }, camera, viewport),
    worldToScreen({ x, y: y + height }, camera, viewport),
  ];
}

/**
 * Build an L-shaped screen-space path that travels along isometric axes.
 * Decomposes the delta between start and end into isoX and isoY components,
 * then routes along one axis first, then the other.
 */
export function buildIsoPath(start: Point, end: Point, camera: CameraState): Point[] {
  const isoXDir = { x: ISO_COS * ISO_SCALE * camera.zoom, y: ISO_SIN * ISO_Y_SCALE * ISO_SCALE * camera.zoom };
  const isoYDir = { x: -ISO_SIN * ISO_SCALE * camera.zoom, y: ISO_COS * ISO_Y_SCALE * ISO_SCALE * camera.zoom };

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Solve: dx = a * isoXDir.x + b * isoYDir.x
  //        dy = a * isoXDir.y + b * isoYDir.y
  const det = isoXDir.x * isoYDir.y - isoXDir.y * isoYDir.x;
  if (Math.abs(det) < 1e-6) {
    return [start, end];
  }
  const a = (dx * isoYDir.y - dy * isoYDir.x) / det;

  const mid = { x: start.x + a * isoXDir.x, y: start.y + a * isoXDir.y };

  // Skip degenerate segments
  const distToMid = Math.hypot(mid.x - start.x, mid.y - start.y);
  const distMidEnd = Math.hypot(end.x - mid.x, end.y - mid.y);
  if (distToMid < 2) return [start, end];
  if (distMidEnd < 2) return [start, end];

  return [start, mid, end];
}
import type { Point } from '@/types/document';

/** Radius of the hop arc in pixels */
export const HOP_RADIUS = 8;

/** Minimum distance between two hop centers — prevents overlapping arcs. */
const MIN_HOP_SPACING = HOP_RADIUS * 3;

export interface Crossing {
  /** Point on the "upper" path where the crossing occurs */
  point: Point;
  /** Distance along the upper path (0..totalLength) */
  t: number;
  /** Angle of the upper path segment at the crossing (radians) */
  angle: number;
}

/**
 * Find all crossings between two polyline paths.
 * Returns crossings expressed on `pathA` (the "upper" connector).
 */
export function findPathCrossings(pathA: Point[], pathB: Point[]): Crossing[] {
  const crossings: Crossing[] = [];
  let distA = 0;

  for (let i = 0; i < pathA.length - 1; i++) {
    const a1 = pathA[i];
    const a2 = pathA[i + 1];
    const segLenA = Math.hypot(a2.x - a1.x, a2.y - a1.y);
    if (segLenA < 0.5) { distA += segLenA; continue; }
    const angleA = Math.atan2(a2.y - a1.y, a2.x - a1.x);

    for (let j = 0; j < pathB.length - 1; j++) {
      const b1 = pathB[j];
      const b2 = pathB[j + 1];
      const ix = segmentIntersection(a1, a2, b1, b2);
      if (ix) {
        const tLocal = Math.hypot(ix.x - a1.x, ix.y - a1.y);
        crossings.push({ point: ix, t: distA + tLocal, angle: angleA });
      }
    }
    distA += segLenA;
  }

  // Remove overlapping crossings (keep first in path order)
  crossings.sort((a, b) => a.t - b.t);
  const filtered: Crossing[] = [];
  for (const c of crossings) {
    if (filtered.length === 0 || c.t - filtered[filtered.length - 1].t >= MIN_HOP_SPACING) {
      filtered.push(c);
    }
  }
  return filtered;
}

/**
 * Segment-segment intersection. Returns the intersection point or null.
 * Uses parameterized form: P = a1 + t*(a2-a1), Q = b1 + u*(b2-b1).
 */
function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const dx1 = a2.x - a1.x;
  const dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x;
  const dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null; // Parallel or coincident

  const dx3 = b1.x - a1.x;
  const dy3 = b1.y - a1.y;
  const t = (dx3 * dy2 - dy3 * dx2) / denom;
  const u = (dx3 * dy1 - dy3 * dx1) / denom;

  // Exclude endpoints (t/u strictly between 0 and 1) to avoid false crossings at shared anchors
  if (t <= 0.01 || t >= 0.99 || u <= 0.01 || u >= 0.99) return null;

  return { x: a1.x + t * dx1, y: a1.y + t * dy1 };
}

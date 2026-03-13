import { describe, it, expect } from 'vitest';
import { projectIso, unprojectIso, worldToScreen, screenToWorld, isoQuad } from '@/lib/geometry/iso';
import { snapToGrid, snapValue, GRID_SIZE } from '@/lib/geometry/grid';
import { normalizeBounds, containsNode, containsArea, containsText } from '@/lib/geometry/selection';
import type { CameraState } from '@/types/document';
import type { ViewportSize } from '@/lib/geometry/iso';

/* ── Helpers ── */
const cam: CameraState = { x: 0, y: 0, zoom: 1 };
const vp: ViewportSize = { width: 800, height: 600 };

/* ================================================================== */
/*  iso.ts                                                             */
/* ================================================================== */
describe('projectIso / unprojectIso', () => {
  it('origin projects to origin', () => {
    const p = projectIso({ x: 0, y: 0 });
    expect(p.x).toBeCloseTo(0, 8);
    expect(p.y).toBeCloseTo(0, 8);
  });

  it('round-trips through project → unproject', () => {
    const original = { x: 120, y: -45 };
    const rt = unprojectIso(projectIso(original));
    expect(rt.x).toBeCloseTo(original.x, 4);
    expect(rt.y).toBeCloseTo(original.y, 4);
  });

  it('round-trips for negative coordinates', () => {
    const original = { x: -200, y: 150 };
    const rt = unprojectIso(projectIso(original));
    expect(rt.x).toBeCloseTo(original.x, 4);
    expect(rt.y).toBeCloseTo(original.y, 4);
  });
});

describe('worldToScreen / screenToWorld', () => {
  it('round-trips at default camera', () => {
    const world = { x: 100, y: 50 };
    const screen = worldToScreen(world, cam, vp);
    const back = screenToWorld(screen, cam, vp);
    expect(back.x).toBeCloseTo(world.x, 4);
    expect(back.y).toBeCloseTo(world.y, 4);
  });

  it('round-trips at zoomed & offset camera', () => {
    const zoomCam: CameraState = { x: -120, y: 60, zoom: 1.8 };
    const world = { x: -30, y: 80 };
    const screen = worldToScreen(world, zoomCam, vp);
    const back = screenToWorld(screen, zoomCam, vp);
    expect(back.x).toBeCloseTo(world.x, 4);
    expect(back.y).toBeCloseTo(world.y, 4);
  });

  it('world origin maps to viewport centre at default camera', () => {
    const screen = worldToScreen({ x: 0, y: 0 }, cam, vp);
    expect(screen.x).toBeCloseTo(vp.width / 2, 4);
    expect(screen.y).toBeCloseTo(vp.height / 2, 4);
  });
});

describe('isoQuad', () => {
  it('returns exactly 4 points', () => {
    const quad = isoQuad(0, 0, 100, 100, cam, vp);
    expect(quad).toHaveLength(4);
  });

  it('first point matches worldToScreen of (x, y)', () => {
    const quad = isoQuad(40, 60, 120, 80, cam, vp);
    const ws = worldToScreen({ x: 40, y: 60 }, cam, vp);
    expect(quad[0].x).toBeCloseTo(ws.x, 8);
    expect(quad[0].y).toBeCloseTo(ws.y, 8);
  });
});

/* ================================================================== */
/*  grid.ts                                                            */
/* ================================================================== */
describe('snapToGrid', () => {
  it('snaps a point to nearest grid intersection', () => {
    const result = snapToGrid({ x: 55, y: 18 });
    expect(result.x).toBe(GRID_SIZE * Math.round(55 / GRID_SIZE));
    expect(result.y).toBe(GRID_SIZE * Math.round(18 / GRID_SIZE));
  });

  it('already-snapped points stay unchanged', () => {
    const result = snapToGrid({ x: GRID_SIZE * 3, y: GRID_SIZE * -2 });
    expect(result.x).toBe(GRID_SIZE * 3);
    expect(result.y).toBe(GRID_SIZE * -2);
  });
});

describe('snapValue', () => {
  it('snaps a scalar', () => {
    expect(snapValue(61)).toBe(GRID_SIZE * Math.round(61 / GRID_SIZE));
  });
});

/* ================================================================== */
/*  selection.ts                                                       */
/* ================================================================== */
describe('normalizeBounds', () => {
  it('normalizes inverted rectangle', () => {
    const b = normalizeBounds({ x: 100, y: 200 }, { x: 50, y: 150 });
    expect(b.x).toBe(50);
    expect(b.y).toBe(150);
    expect(b.width).toBe(50);
    expect(b.height).toBe(50);
  });

  it('handles zero-size selection', () => {
    const b = normalizeBounds({ x: 10, y: 10 }, { x: 10, y: 10 });
    expect(b.width).toBe(0);
    expect(b.height).toBe(0);
  });
});

describe('containsNode / containsArea / containsText', () => {
  const bounds = { x: 0, y: 0, width: 200, height: 200 };

  it('node inside bounds returns true', () => {
    const node = { x: 50, y: 50, width: 40, height: 40 } as any;
    expect(containsNode(bounds, node)).toBe(true);
  });

  it('node outside bounds returns false', () => {
    const node = { x: 300, y: 300, width: 40, height: 40 } as any;
    expect(containsNode(bounds, node)).toBe(false);
  });

  it('area inside bounds returns true', () => {
    const area = { x: 10, y: 10, width: 100, height: 100 } as any;
    expect(containsArea(bounds, area)).toBe(true);
  });

  it('text inside bounds returns true', () => {
    const text = { x: 100, y: 100 } as any;
    expect(containsText(bounds, text)).toBe(true);
  });

  it('text outside bounds returns false', () => {
    const text = { x: 300, y: 300 } as any;
    expect(containsText(bounds, text)).toBe(false);
  });
});

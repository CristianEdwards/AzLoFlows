import { NODE_DEPTH, PIPE_DEPTH } from '@/lib/config';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawPolygon } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba } from '@/lib/rendering/tokens';
import type { AreaEntity, CameraState, NodeEntity, PipeEntity, Point } from '@/types/document';

/** Linearly interpolate two points. */
function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** A resolved segment of a pipe: a range [tStart, tEnd] at a given screen-Y elevation offset. */
interface PipeSegment {
  tStart: number;
  tEnd: number;
  elevPx: number; // screen-space upward offset (negative Y in screen coords)
}

/** Compute resolved segments from optional risers, sorted by tStart. */
function buildSegments(pipe: PipeEntity, zoom: number): PipeSegment[] {
  const risers = pipe.risers;
  if (!risers || risers.length === 0) return [{ tStart: 0, tEnd: 1, elevPx: 0 }];

  // Sort risers by start, clamp to [0,1]
  const sorted = risers
    .map((r) => ({ s: Math.max(0, Math.min(1, r.start)), e: Math.max(0, Math.min(1, r.end)), elev: r.elevation * zoom }))
    .filter((r) => r.e > r.s)
    .sort((a, b) => a.s - b.s);

  const segs: PipeSegment[] = [];
  let cursor = 0;
  for (const r of sorted) {
    if (r.s > cursor) segs.push({ tStart: cursor, tEnd: r.s, elevPx: 0 });
    segs.push({ tStart: r.s, tEnd: r.e, elevPx: r.elev });
    cursor = r.e;
  }
  if (cursor < 1) segs.push({ tStart: cursor, tEnd: 1, elevPx: 0 });
  return segs;
}

export function renderPipe(
  ctx: CanvasRenderingContext2D,
  pipe: PipeEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  obstacles: { nodes: NodeEntity[]; areas: AreaEntity[] },
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const points = isoQuad(pipe.x, pipe.y, pipe.width, pipe.height, camera, viewport);
  const topLeft = points[0];
  const topRight = points[1];
  const bottomRight = points[2];
  const bottomLeft = points[3];

  const depth = PIPE_DEPTH * camera.zoom;
  const color = pipe.color;
  const glow = selected ? 0.9 : 0.6;

  // Build obstacle clipping (unchanged)
  const obstacleQuads: Point[][] = [];
  const nodeDepth = NODE_DEPTH * camera.zoom;
  for (const node of obstacles.nodes) {
    const q = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
    obstacleQuads.push([
      { x: q[0].x, y: q[0].y - nodeDepth },
      { x: q[1].x, y: q[1].y - nodeDepth },
      { x: q[1].x, y: q[1].y + nodeDepth },
      q[2],
      q[3],
      { x: q[0].x, y: q[0].y + nodeDepth },
    ]);
  }

  ctx.save();
  if (obstacleQuads.length > 0) {
    ctx.beginPath();
    ctx.rect(0, 0, viewport.width, viewport.height);
    for (const quad of obstacleQuads) {
      ctx.moveTo(quad[quad.length - 1].x, quad[quad.length - 1].y);
      for (let i = quad.length - 2; i >= 0; i--) {
        ctx.lineTo(quad[i].x, quad[i].y);
      }
      ctx.closePath();
    }
    ctx.clip('evenodd');
  }

  const segments = buildSegments(pipe, camera.zoom);

  // Helper: compute floor and roof corners for a segment slice
  function segCorners(seg: PipeSegment) {
    const fTL = lerp(topLeft, topRight, seg.tStart);
    const fTR = lerp(topLeft, topRight, seg.tEnd);
    const fBR = lerp(bottomLeft, bottomRight, seg.tEnd);
    const fBL = lerp(bottomLeft, bottomRight, seg.tStart);
    const e = seg.elevPx;
    const rTL = { x: fTL.x, y: fTL.y - depth - e };
    const rTR = { x: fTR.x, y: fTR.y - depth - e };
    const rBR = { x: fBR.x, y: fBR.y - depth - e };
    const rBL = { x: fBL.x, y: fBL.y - depth - e };
    // Floor shifts down by elevation too (channel sits elevated)
    const eTL = { x: fTL.x, y: fTL.y - e };
    const eTR = { x: fTR.x, y: fTR.y - e };
    const eBR = { x: fBR.x, y: fBR.y - e };
    const eBL = { x: fBL.x, y: fBL.y - e };
    return { eTL, eTR, eBR, eBL, rTL, rTR, rBR, rBL };
  }

  // Draw each segment back-to-front (ascending tStart rendered first for proper overlap)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const c = segCorners(seg);

    // White base in light mode
    if (light) {
      for (const face of [
        [c.eTL, c.eTR, c.eBR, c.eBL],
        [c.eTL, c.rTL, c.rBL, c.eBL],
        [c.eBR, c.rBR, c.rTR, c.eTR],
        [c.rTL, c.rTR, c.rBR, c.rBL],
      ]) {
        drawPolygon(ctx, face);
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.fill();
      }
    }

    // Bottom face
    drawPolygon(ctx, [c.eTL, c.eTR, c.eBR, c.eBL]);
    ctx.fillStyle = hexToRgba(color, light ? 0.62 : 0.08);
    ctx.fill();

    // Left side wall (along iso-Y at tStart)
    drawPolygon(ctx, [c.eTL, c.rTL, c.rBL, c.eBL]);
    ctx.fillStyle = hexToRgba(color, (light ? 0.70 : 0.12) * glow);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, selected ? 0.85 : (light ? 0.90 : 0.4));
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.stroke();

    // Right side wall (along iso-Y at tEnd)
    drawPolygon(ctx, [c.eBR, c.rBR, c.rTR, c.eTR]);
    ctx.fillStyle = hexToRgba(color, (light ? 0.65 : 0.10) * glow);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, selected ? 0.85 : (light ? 0.90 : 0.4));
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.stroke();

    // Top face (roof)
    drawPolygon(ctx, [c.rTL, c.rTR, c.rBR, c.rBL]);
    ctx.fillStyle = hexToRgba(color, (light ? 0.55 : 0.06) * glow);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, selected ? 0.95 : (light ? 0.72 : 0.5));
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.stroke();

    // Bottom face border
    drawPolygon(ctx, [c.eTL, c.eTR, c.eBR, c.eBL]);
    ctx.strokeStyle = hexToRgba(color, selected ? 0.8 : (light ? 0.55 : 0.3));
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();

    // Vertical edges
    ctx.strokeStyle = hexToRgba(color, selected ? 0.98 : (light ? 0.72 : 0.5));
    ctx.lineWidth = selected ? 2 : 1.2;
    for (const [a, b] of [[c.eTL, c.rTL], [c.eTR, c.rTR], [c.eBR, c.rBR], [c.eBL, c.rBL]] as [Point, Point][]) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Transition walls between this segment and the next (different elevations)
    if (i < segments.length - 1) {
      const nextSeg = segments[i + 1];
      const nc = segCorners(nextSeg);
      if (Math.abs(seg.elevPx - nextSeg.elevPx) > 0.5) {
        // Front connecting wall (along iso-X at the boundary between segments)
        // Use tEnd of current = tStart of next — same iso-Y line
        const wallPoly = [c.eTR, c.rTR, nc.rTL, nc.eTL];
        drawPolygon(ctx, wallPoly);
        ctx.fillStyle = hexToRgba(color, (light ? 0.68 : 0.10) * glow);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, selected ? 0.85 : (light ? 0.90 : 0.4));
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.stroke();

        // Back connecting wall (other iso-Y boundary)
        const wallPoly2 = [c.eBR, c.rBR, nc.rBL, nc.eBL];
        drawPolygon(ctx, wallPoly2);
        ctx.fillStyle = hexToRgba(color, (light ? 0.60 : 0.08) * glow);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, selected ? 0.85 : (light ? 0.90 : 0.4));
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

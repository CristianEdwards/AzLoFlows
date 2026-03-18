import { NODE_DEPTH, PIPE_DEPTH } from '@/lib/config';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import { drawPolygon } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba } from '@/lib/rendering/tokens';
import type { AreaEntity, CameraState, NodeEntity, PipeEntity, Point } from '@/types/document';

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

  const rTopLeft = { x: topLeft.x, y: topLeft.y - depth };
  const rTopRight = { x: topRight.x, y: topRight.y - depth };
  const rBottomRight = { x: bottomRight.x, y: bottomRight.y - depth };
  const rBottomLeft = { x: bottomLeft.x, y: bottomLeft.y - depth };

  const color = pipe.color;
  const glow = selected ? 0.9 : 0.6;

  // Build a clipping region that excludes node quads (not areas)
  const obstacleQuads: Point[][] = [];
  const nodeDepth = NODE_DEPTH * camera.zoom;
  for (const node of obstacles.nodes) {
    const q = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
    // Include 3D volume: floor quad expanded upward by node depth
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
    // Outer rectangle (canvas bounds) — clockwise
    ctx.rect(0, 0, viewport.width, viewport.height);
    // Cut out each obstacle — counter-clockwise
    for (const quad of obstacleQuads) {
      ctx.moveTo(quad[quad.length - 1].x, quad[quad.length - 1].y);
      for (let i = quad.length - 2; i >= 0; i--) {
        ctx.lineTo(quad[i].x, quad[i].y);
      }
      ctx.closePath();
    }
    ctx.clip('evenodd');
  }

  // In light mode, paint white base on every face for colour opacity
  if (light) {
    for (const face of [
      [topLeft, topRight, bottomRight, bottomLeft],
      [topLeft, rTopLeft, rBottomLeft, bottomLeft],
      [bottomRight, rBottomRight, rTopRight, topRight],
      [rTopLeft, rTopRight, rBottomRight, rBottomLeft],
    ]) {
      drawPolygon(ctx, face);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fill();
    }
  }

  // Bottom face
  drawPolygon(ctx, [topLeft, topRight, bottomRight, bottomLeft]);
  ctx.fillStyle = hexToRgba(color, light ? 0.62 : 0.08);
  ctx.fill();

  // Left side wall
  drawPolygon(ctx, [topLeft, rTopLeft, rBottomLeft, bottomLeft]);
  ctx.fillStyle = hexToRgba(color, (light ? 0.70 : 0.12) * glow);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(color, selected ? 0.85 : (light ? 0.90 : 0.4));
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();

  // Right side wall
  drawPolygon(ctx, [bottomRight, rBottomRight, rTopRight, topRight]);
  ctx.fillStyle = hexToRgba(color, (light ? 0.65 : 0.10) * glow);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(color, selected ? 0.85 : (light ? 0.90 : 0.4));
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();

  // Top face (roof)
  drawPolygon(ctx, [rTopLeft, rTopRight, rBottomRight, rBottomLeft]);
  ctx.fillStyle = hexToRgba(color, (light ? 0.55 : 0.06) * glow);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(color, selected ? 0.95 : (light ? 0.72 : 0.5));
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();

  // Bottom face border
  drawPolygon(ctx, [topLeft, topRight, bottomRight, bottomLeft]);
  ctx.strokeStyle = hexToRgba(color, selected ? 0.8 : (light ? 0.55 : 0.3));
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke();

  // Vertical edges
  ctx.strokeStyle = hexToRgba(color, selected ? 0.98 : (light ? 0.72 : 0.5));
  ctx.lineWidth = selected ? 2 : 1.2;
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(rTopLeft.x, rTopLeft.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(topRight.x, topRight.y);
  ctx.lineTo(rTopRight.x, rTopRight.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(rBottomRight.x, rBottomRight.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bottomLeft.x, bottomLeft.y);
  ctx.lineTo(rBottomLeft.x, rBottomLeft.y);
  ctx.stroke();

  ctx.restore();
}

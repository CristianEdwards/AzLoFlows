import type { Point } from '@/types/document';

export function drawPolyline(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
}

export function drawPolygon(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}

/** Like drawPolygon but with rounded corners using arcTo. */
export function drawRoundedPolygon(ctx: CanvasRenderingContext2D, points: Point[], radius: number): void {
  const n = points.length;
  if (n < 3) return;
  ctx.beginPath();
  const last = points[n - 1];
  const first = points[0];
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < n; i++) {
    ctx.arcTo(points[i].x, points[i].y, points[(i + 1) % n].x, points[(i + 1) % n].y, radius);
  }
  ctx.closePath();
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawArrowHead(ctx: CanvasRenderingContext2D, from: Point, to: Point, size = 10): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - 0.35), to.y - size * Math.sin(angle - 0.35));
  ctx.lineTo(to.x - size * Math.cos(angle + 0.35), to.y - size * Math.sin(angle + 0.35));
  ctx.closePath();
}

export function drawAngledText(
  ctx: CanvasRenderingContext2D,
  text: string,
  origin: Point,
  angle: number,
  color: string,
  font: string,
): void {
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function drawTransformedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  origin: Point,
  basisX: Point,
  basisY: Point,
  color: string,
  font: string,
): void {
  const lines = text.split('\n');
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.transform(basisX.x, basisX.y, basisY.x, basisY.y, 0, 0);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pxMatch = font.match(/(\d+)px/);
  const lineHeight = pxMatch ? parseInt(pxMatch[1], 10) : 24;
  const totalHeight = (lines.length - 1) * lineHeight;
  const startY = -totalHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 0, startY + i * lineHeight);
  }
  ctx.restore();
}
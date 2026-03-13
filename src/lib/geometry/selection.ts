import type { AreaEntity, NodeEntity, PipeEntity, Point, TextEntity } from '@/types/document';

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeBounds(start: Point, end: Point): SelectionBounds {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function containsNode(bounds: SelectionBounds, node: NodeEntity): boolean {
  const center = { x: node.x + node.width * 0.5, y: node.y + node.height * 0.5 };
  return pointInBounds(bounds, center);
}

export function containsArea(bounds: SelectionBounds, area: AreaEntity): boolean {
  const center = { x: area.x + area.width * 0.5, y: area.y + area.height * 0.5 };
  return pointInBounds(bounds, center);
}

export function containsText(bounds: SelectionBounds, text: TextEntity): boolean {
  return pointInBounds(bounds, { x: text.x, y: text.y });
}

export function containsPipe(bounds: SelectionBounds, pipe: PipeEntity): boolean {
  const center = { x: pipe.x + pipe.width * 0.5, y: pipe.y + pipe.height * 0.5 };
  return pointInBounds(bounds, center);
}

function pointInBounds(bounds: SelectionBounds, point: Point): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}
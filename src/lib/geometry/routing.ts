import { getAnchorPoint } from '@/lib/geometry/anchors';
import type { ConnectorEntity, NodeEntity, Point } from '@/types/document';

export function buildConnectorPath(connector: ConnectorEntity, source: NodeEntity, target: NodeEntity, nodes: NodeEntity[] = []): Point[] {
  const start = getAnchorPoint(source, connector.sourceAnchor);
  const end = getAnchorPoint(target, connector.targetAnchor);

  if (connector.waypoints.length === 0) {
    const others = nodes.filter((node) => node.id !== source.id && node.id !== target.id);
    const straightPath = [start, end];
    const straightCollides = others.some((node) => intersectsNode(straightPath, node));
    if (!straightCollides) {
      return [start, end];
    }
  }

  const drop = 64;
  const bendY = connector.waypoints.length > 0
    ? Math.max(start.y, end.y) + drop
    : findClearLane(start, end, nodes.filter((node) => node.id !== source.id && node.id !== target.id), drop);

  const points: Point[] = [
    start,
    { x: start.x, y: bendY },
  ];

  for (const waypoint of connector.waypoints) {
    points.push(waypoint);
  }

  points.push(
    { x: end.x, y: bendY },
    end,
  );

  return normalizePath(points);
}

function findClearLane(start: Point, end: Point, obstacles: NodeEntity[], drop: number): number {
  let bendY = Math.max(start.y, end.y) + drop;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const path = [
      start,
      { x: start.x, y: bendY },
      { x: end.x, y: bendY },
      end,
    ];
    const collides = obstacles.some((node) => intersectsNode(path, node));
    if (!collides) {
      return bendY;
    }
    bendY += 48;
  }
  return bendY;
}

function intersectsNode(path: Point[], node: NodeEntity): boolean {
  for (let index = 1; index < path.length; index += 1) {
    if (segmentIntersectsRect(path[index - 1], path[index], node)) {
      return true;
    }
  }
  return false;
}

function segmentIntersectsRect(start: Point, end: Point, node: NodeEntity): boolean {
  const minX = node.x - 16;
  const maxX = node.x + node.width + 16;
  const minY = node.y - 16;
  const maxY = node.y + node.height + 16;

  if (start.x === end.x) {
    const x = start.x;
    const segMinY = Math.min(start.y, end.y);
    const segMaxY = Math.max(start.y, end.y);
    return x >= minX && x <= maxX && segMaxY >= minY && segMinY <= maxY;
  }

  if (start.y === end.y) {
    const y = start.y;
    const segMinX = Math.min(start.x, end.x);
    const segMaxX = Math.max(start.x, end.x);
    return y >= minY && y <= maxY && segMaxX >= minX && segMinX <= maxX;
  }

  return false;
}

function normalizePath(points: Point[]): Point[] {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }
    const prev = points[index - 1];
    return prev.x !== point.x || prev.y !== point.y;
  });
}
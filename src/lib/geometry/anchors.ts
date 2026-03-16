import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import type { AnchorId, AnchorSide, CameraState, NodeEntity, Point } from '@/types/document';

export const TOP_ANCHOR_COUNT = 5;
export const BOTTOM_ANCHOR_COUNT = 5;
export const SIDE_ANCHOR_COUNT = 5;

const anchorCounts: Record<AnchorSide, number> = {
  top: TOP_ANCHOR_COUNT,
  right: SIDE_ANCHOR_COUNT,
  bottom: BOTTOM_ANCHOR_COUNT,
  left: SIDE_ANCHOR_COUNT,
};

export function getAnchorPoint(node: NodeEntity, anchorId: AnchorId): Point {
  const normalizedAnchor = normalizeAnchor(anchorId);
  const { side, index } = parseAnchorId(normalizedAnchor);
  
  if (node.shape === 'standingNode') {
    // For standing nodes, force all anchors to the "bottom line" footprint in world space.
    // The visual base corresponds to the line from (node.x, node.y) to (node.x, node.y + node.height)
    const step = node.height / 6;
    return { x: node.x, y: node.y + step * (index + 1) };
  }

  if (side === 'top') {
    const step = node.width / (TOP_ANCHOR_COUNT + 1);
    return { x: node.x + step * (index + 1), y: node.y };
  }
  if (side === 'bottom') {
    const step = node.width / (BOTTOM_ANCHOR_COUNT + 1);
    return { x: node.x + step * (index + 1), y: node.y + node.height };
  }
  const step = node.height / (SIDE_ANCHOR_COUNT + 1);
  if (side === 'left') {
    return { x: node.x, y: node.y + step * (index + 1) };
  }
  return { x: node.x + node.width, y: node.y + step * (index + 1) };
}

export function getNodeAnchors(node: NodeEntity): Array<{ id: AnchorId; point: Point; side: AnchorSide }> {
  return (Object.entries(anchorCounts) as Array<[AnchorSide, number]>).flatMap(([side, count]) =>
    Array.from({ length: count }, (_, index) => {
      const id = `${side}-${index}` as AnchorId;
      return {
        id,
        point: getAnchorPoint(node, id),
        side,
      };
    }),
  );
}

export function getClosestAnchor(node: NodeEntity, point: Point): AnchorId {
  const anchors = getNodeAnchors(node);
  let best = anchors[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    const distance = Math.hypot(point.x - anchor.point.x, point.y - anchor.point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = anchor;
    }
  }
  return best.id;
}

export function getClosestBottomAnchor(node: NodeEntity, point: Point): AnchorId {
  const anchors = getNodeAnchors(node).filter((anchor) => anchor.side === 'bottom');
  let best = anchors[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    const distance = Math.hypot(point.x - anchor.point.x, point.y - anchor.point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = anchor;
    }
  }
  return best.id;
}

function normalizeAnchor(anchorId: AnchorId | string): AnchorId {
  if (isValidAnchorId(anchorId)) {
    return anchorId;
  }
  const legacyMap: Record<string, AnchorId> = {
    'top-0': 'top-1',
    'top-1': 'top-3',
    'right-0': 'right-0',
    'right-1': 'right-1',
    'right-2': 'right-2',
    'right-3': 'right-3',
    'right-4': 'right-4',
    'left-0': 'left-0',
    'left-1': 'left-1',
    'left-2': 'left-2',
    'left-3': 'left-3',
    'left-4': 'left-4',
  };
  return legacyMap[anchorId] ?? 'bottom-2';
}

export function parseAnchorId(anchorId: AnchorId): { side: AnchorSide; index: number } {
  const [side, indexText] = anchorId.split('-') as [AnchorSide, string];
  return { side, index: Number(indexText) };
}

export function isValidAnchorId(anchorId: string): anchorId is AnchorId {
  const [side, indexText] = anchorId.split('-');
  if (side !== 'top' && side !== 'right' && side !== 'bottom' && side !== 'left') {
    return false;
  }
  const index = Number(indexText);
  return Number.isInteger(index) && index >= 0 && index < anchorCounts[side];
}

export function getScreenAnchorPoint(node: NodeEntity, anchorId: AnchorId, camera: CameraState, viewport: ViewportSize): Point {
  const { side, index } = parseAnchorId(anchorId);
  const t = (index + 1) / 6;

  if (node.shape === 'standingNode') {
    // Force all anchors to visually align with the bottom-most boundary line of the 2D plane
    const bBL = worldToScreen({ x: node.x, y: node.y }, camera, viewport);
    const bBR = worldToScreen({ x: node.x, y: node.y + node.height }, camera, viewport);
    return lerp(bBL, bBR, t);
  }

  const points = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
  const topLeft = points[0];
  const topRight = points[1];
  const bottomRight = points[2];
  const bottomLeft = points[3];
  const depth = 34 * camera.zoom;
  const leftTopDepth = { x: topLeft.x, y: topLeft.y + depth };
  const frontLeftBottom = { x: bottomLeft.x, y: bottomLeft.y + depth };
  const frontRightBottom = { x: bottomRight.x, y: bottomRight.y + depth };
  const rightTopDepth = { x: topRight.x, y: topRight.y + depth };
  
  if (side === 'top') return lerp(leftTopDepth, rightTopDepth, t);
  if (side === 'bottom') return lerp(frontLeftBottom, frontRightBottom, t);
  if (side === 'left') return lerp(leftTopDepth, frontLeftBottom, t);
  return lerp(rightTopDepth, frontRightBottom, t);
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
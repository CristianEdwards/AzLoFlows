import { NODE_DEPTH, HIT_PADDING, TEXT_HIT_RADIUS, CONNECTOR_HIT_RADIUS, CONNECTOR_STUB, ISO_ANGLE_DEG, ISO_Y_SCALE, ISO_SCALE } from '@/lib/config';
import { buildConnectorPath } from '@/lib/geometry/routing';
import { getScreenAnchorPoint, parseAnchorId } from '@/lib/geometry/anchors';
import { buildIsoPath, isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import type { AreaEntity, CameraState, ConnectorEntity, DiagramDocument, NodeEntity, PipeEntity, Point, SelectionState, TextEntity } from '@/types/document';

export function hitTestNode(nodes: NodeEntity[], point: Point): NodeEntity | null {
  const candidates = nodes.filter((n) => inRect(point, n.x - HIT_PADDING, n.y - HIT_PADDING, n.width + HIT_PADDING * 2, n.height + HIT_PADDING * 2));
  if (candidates.length <= 1) return candidates[0] ?? null;
  return closestByCenter(candidates, point);
}

export function hitTestArea(areas: AreaEntity[], point: Point): AreaEntity | null {
  const sorted = [...areas].sort((a, b) => b.zIndex - a.zIndex);
  return sorted.find((area) => inRect(point, area.x, area.y, area.width, area.height)) ?? null;
}

export function hitTestText(texts: TextEntity[], point: Point): TextEntity | null {
  const hitRadius = TEXT_HIT_RADIUS;
  const sorted = [...texts].sort((a, b) => b.zIndex - a.zIndex);
  return sorted.find((text) => Math.abs(point.x - text.x) < hitRadius && Math.abs(point.y - text.y) < hitRadius) ?? null;
}

export function hitTestPipe(pipes: PipeEntity[], point: Point): PipeEntity | null {
  const candidates = pipes.filter((p) => inRect(point, p.x - HIT_PADDING, p.y - HIT_PADDING, p.width + HIT_PADDING * 2, p.height + HIT_PADDING * 2));
  if (candidates.length <= 1) return candidates[0] ?? null;
  return closestByCenter(candidates, point);
}

export function hitTestConnector(connectors: ConnectorEntity[], nodes: NodeEntity[], point: Point): ConnectorEntity | null {
  const sorted = [...connectors].sort((a, b) => b.zIndex - a.zIndex);
  for (const connector of sorted) {
    const source = nodes.find((node) => node.id === connector.sourceId);
    const target = nodes.find((node) => node.id === connector.targetId);
    if (!source || !target) {
      continue;
    }
    const path = buildConnectorPath(connector, source, target);
    for (let index = 1; index < path.length; index += 1) {
      if (distanceToSegment(point, path[index - 1], path[index]) < CONNECTOR_HIT_RADIUS) {
        return connector;
      }
    }
  }
  return null;
}

/** Screen-space connector hit test — matches the actual rendered isometric path. */
export function hitTestConnectorScreen(
  connectors: ConnectorEntity[],
  nodes: NodeEntity[],
  screenPoint: Point,
  camera: CameraState,
  viewport: ViewportSize,
): ConnectorEntity | null {
  const _ANG = (ISO_ANGLE_DEG * Math.PI) / 180;
  const _C = Math.cos(_ANG);
  const _S = Math.sin(_ANG);
  const ixR = { x: _C * ISO_SCALE, y: _S * ISO_Y_SCALE * ISO_SCALE };
  const iyR = { x: -_S * ISO_SCALE, y: _C * ISO_Y_SCALE * ISO_SCALE };
  const ixL = Math.hypot(ixR.x, ixR.y);
  const iyL = Math.hypot(iyR.x, iyR.y);
  const ixU = { x: ixR.x / ixL, y: ixR.y / ixL };
  const iyU = { x: iyR.x / iyL, y: iyR.y / iyL };
  const STUB = CONNECTOR_STUB;

  function stubOffset(side: string): Point {
    switch (side) {
      case 'top': return { x: -iyU.x * STUB, y: -iyU.y * STUB };
      case 'bottom': return { x: iyU.x * STUB, y: iyU.y * STUB };
      case 'left': return { x: -ixU.x * STUB, y: -ixU.y * STUB };
      case 'right': return { x: ixU.x * STUB, y: ixU.y * STUB };
      default: return { x: 0, y: 0 };
    }
  }

  let best: ConnectorEntity | null = null;
  let bestDist = CONNECTOR_HIT_RADIUS;

  for (const connector of connectors) {
    const source = nodes.find((n) => n.id === connector.sourceId);
    const target = nodes.find((n) => n.id === connector.targetId);
    if (!source || !target) continue;

    const start = getScreenAnchorPoint(source, connector.sourceAnchor, camera, viewport);
    const end = getScreenAnchorPoint(target, connector.targetAnchor, camera, viewport);
    const sOff = stubOffset(parseAnchorId(connector.sourceAnchor).side);
    const tOff = stubOffset(parseAnchorId(connector.targetAnchor).side);
    const sourceStub = { x: start.x + sOff.x, y: start.y + sOff.y };
    const targetStub = { x: end.x + tOff.x, y: end.y + tOff.y };

    const screenPath: Point[] = [start, sourceStub];
    if (connector.waypoints.length > 0) {
      const screenWaypoints = connector.waypoints.map((wp) => worldToScreen(wp, camera, viewport));
      let prev = sourceStub;
      for (const wp of screenWaypoints) {
        const seg = buildIsoPath(prev, wp, camera);
        screenPath.push(...seg.slice(1));
        prev = wp;
      }
      const lastSeg = buildIsoPath(prev, targetStub, camera);
      screenPath.push(...lastSeg.slice(1));
    } else {
      const mainSeg = buildIsoPath(sourceStub, targetStub, camera);
      screenPath.push(...mainSeg.slice(1));
    }
    screenPath.push(end);

    for (let i = 1; i < screenPath.length; i++) {
      const d = distanceToSegment(screenPoint, screenPath[i - 1], screenPath[i]);
      if (d < bestDist) {
        bestDist = d;
        best = connector;
      }
    }
  }
  return best;
}

export function selectionLabel(selection: SelectionState, document: DiagramDocument): string {
  if (!selection.type || selection.ids.length === 0) {
    return 'Nothing selected';
  }

  if (selection.ids.length > 1) {
    return `${selection.ids.length} ${selection.type}s selected`;
  }

  const [id] = selection.ids;
  if (selection.type === 'node') {
    return document.nodes.find((node) => node.id === id)?.title ?? 'Node';
  }

  if (selection.type === 'area') {
    return document.areas.find((area) => area.id === id)?.label ?? 'Area';
  }

  if (selection.type === 'text') {
    return document.texts.find((text) => text.id === id)?.label ?? 'Text';
  }

  if (selection.type === 'pipe') {
    return 'Pipe';
  }

  return document.connectors.find((connector) => connector.id === id)?.label || 'Connector';
}

function inRect(point: Point, x: number, y: number, width: number, height: number): boolean {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

function closestByCenter(entities: { x: number; y: number; width: number; height: number }[], point: Point) {
  return entities.reduce((best, e) => {
    const d = Math.hypot(point.x - (e.x + e.width / 2), point.y - (e.y + e.height / 2));
    const bd = Math.hypot(point.x - (best.x + best.width / 2), point.y - (best.y + best.height / 2));
    return d < bd ? e : best;
  });
}

export function hitTestNodeScreen(nodes: NodeEntity[], screenPoint: Point, camera: CameraState, viewport: ViewportSize): NodeEntity | null {
  const depth = NODE_DEPTH * camera.zoom;
  const sorted = [...nodes].sort((a, b) => b.zIndex - a.zIndex);
  return sorted.find((node) => {
    const quad = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
    const topLeft = quad[0];
    const topRight = quad[1];
    const bottomRight = quad[2];
    const bottomLeft = quad[3];
    const silhouette = [
      topLeft,
      topRight,
      { x: topRight.x, y: topRight.y + depth },
      { x: bottomRight.x, y: bottomRight.y + depth },
      { x: bottomLeft.x, y: bottomLeft.y + depth },
      { x: topLeft.x, y: topLeft.y + depth },
    ];
    return pointInPolygon(screenPoint, silhouette);
  }) ?? null;
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > point.y) !== (yj > point.y) && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const projection = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, projection));
  const px = start.x + clamped * dx;
  const py = start.y + clamped * dy;
  return Math.hypot(point.x - px, point.y - py);
}
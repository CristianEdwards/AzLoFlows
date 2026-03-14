import { getClosestAnchor, getNodeAnchors, getScreenAnchorPoint } from '@/lib/geometry/anchors';
import { buildIsoPath, isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import type { ResizeHandle } from '@/lib/geometry/resize';
import type { AnchorId, CameraState, DiagramDocument, SelectionState } from '@/types/document';

interface CanvasOverlayProps {
  document: DiagramDocument;
  selection: SelectionState;
  camera: CameraState;
  viewport: ViewportSize;
  hoveredNodeId: string | null;
  marqueeRect: { x: number; y: number; width: number; height: number } | null;
  connectorDraft: { sourceId: string; sourceAnchor: AnchorId; currentWorld: { x: number; y: number } } | null;
  reconnectDraft: { connectorId: string; end: 'source' | 'target'; fixedNodeId: string; fixedAnchor: AnchorId; currentWorld: { x: number; y: number } } | null;
  onResizeHandlePointerDown: (handle: ResizeHandle, event: React.PointerEvent<SVGCircleElement>) => void;
  onWaypointPointerDown: (index: number, event: React.PointerEvent<SVGCircleElement>) => void;
  onAnchorPointerDown: (nodeId: string, anchorId: AnchorId, event: React.PointerEvent<SVGCircleElement>) => void;
  onConnectorEndpointPointerDown: (connectorId: string, end: 'source' | 'target', event: React.PointerEvent<SVGCircleElement>) => void;
  alignGuides: { axis: 'x' | 'y'; value: number }[];
}

export default function CanvasOverlay({ document, selection, camera, viewport, hoveredNodeId, marqueeRect, connectorDraft, reconnectDraft, onResizeHandlePointerDown, onWaypointPointerDown, onAnchorPointerDown, onConnectorEndpointPointerDown, alignGuides }: CanvasOverlayProps) {
  const selectedNode = selection.type === 'node' && selection.ids.length === 1 ? document.nodes.find((node) => node.id === selection.ids[0]) : null;
  const selectedArea = selection.type === 'area' && selection.ids.length === 1 ? document.areas.find((area) => area.id === selection.ids[0]) : null;
  const selectedPipe = selection.type === 'pipe' && selection.ids.length === 1 ? (document.pipes ?? []).find((pipe) => pipe.id === selection.ids[0]) : null;
  const selectedConnector = selection.type === 'connector' && selection.ids.length === 1 ? document.connectors.find((connector) => connector.id === selection.ids[0]) : null;

  const resizableEntity = selectedNode ?? selectedArea ?? selectedPipe ?? null;
  const selectionPolygon = resizableEntity
    ? isoQuad(resizableEntity.x, resizableEntity.y, resizableEntity.width, resizableEntity.height, camera, viewport)
    : null;

  const cornerHandles = selectionPolygon
    ? [
        { handle: 'nw' as const, point: selectionPolygon[0] },
        { handle: 'ne' as const, point: selectionPolygon[1] },
        { handle: 'se' as const, point: selectionPolygon[2] },
        { handle: 'sw' as const, point: selectionPolygon[3] },
      ]
    : [];

  const connectorPath = selectedConnector
    ? (() => {
        const source = document.nodes.find((node) => node.id === selectedConnector.sourceId);
        const target = document.nodes.find((node) => node.id === selectedConnector.targetId);
        if (!source || !target) {
          return null;
        }
        const start = getScreenAnchorPoint(source, selectedConnector.sourceAnchor, camera, viewport);
        const end = getScreenAnchorPoint(target, selectedConnector.targetAnchor, camera, viewport);
        return buildIsoPath(start, end, camera);
      })()
    : null;

  const waypointHandles = selectedConnector ? selectedConnector.waypoints.map((point) => worldToScreen(point, camera, viewport)) : [];

  const connectorEndpoints = selectedConnector && !reconnectDraft
    ? (() => {
        const source = document.nodes.find((n) => n.id === selectedConnector.sourceId);
        const target = document.nodes.find((n) => n.id === selectedConnector.targetId);
        if (!source || !target) return [];
        return [
          { end: 'source' as const, point: getScreenAnchorPoint(source, selectedConnector.sourceAnchor, camera, viewport) },
          { end: 'target' as const, point: getScreenAnchorPoint(target, selectedConnector.targetAnchor, camera, viewport) },
        ];
      })()
    : [];

  const anchorNodes = document.nodes.filter((node) => {
    if (reconnectDraft) {
      return node.id === hoveredNodeId;
    }
    if (connectorDraft) {
      return node.id === connectorDraft.sourceId || node.id === hoveredNodeId;
    }
    return node.id === hoveredNodeId || node.id === selectedNode?.id;
  });
  const snappedTarget = connectorDraft && hoveredNodeId && hoveredNodeId !== connectorDraft.sourceId
    ? (() => {
        const node = document.nodes.find((item) => item.id === hoveredNodeId);
        if (!node) {
          return null;
        }
        const anchorId = getClosestAnchor(node, connectorDraft.currentWorld);
        const anchor = getNodeAnchors(node).find((item) => item.id === anchorId);
        return anchor ? { nodeId: node.id, anchorId, point: anchor.point } : null;
      })()
    : null;
  const reconnectSnap = reconnectDraft && hoveredNodeId && hoveredNodeId !== reconnectDraft.fixedNodeId
    ? (() => {
        const node = document.nodes.find((item) => item.id === hoveredNodeId);
        if (!node) return null;
        const anchorId = getClosestAnchor(node, reconnectDraft.currentWorld);
        const anchor = getNodeAnchors(node).find((item) => item.id === anchorId);
        return anchor ? { nodeId: node.id, anchorId, point: anchor.point } : null;
      })()
    : null;
  const anchorHandles = anchorNodes.flatMap((node) =>
    getNodeAnchors(node)
      .map((anchor) => ({
        nodeId: node.id,
        anchorId: anchor.id,
        side: anchor.side,
        point: getScreenAnchorPoint(node, anchor.id, camera, viewport),
        color: node.glowColor,
        active: connectorDraft?.sourceId === node.id && connectorDraft.sourceAnchor === anchor.id,
        target: (snappedTarget?.nodeId === node.id && snappedTarget.anchorId === anchor.id) ||
               (reconnectSnap?.nodeId === node.id && reconnectSnap.anchorId === anchor.id),
      })),
  );
  const draftStart = connectorDraft ? document.nodes.find((node) => node.id === connectorDraft.sourceId) : null;
  const draftLine = connectorDraft && draftStart
    ? [
        getScreenAnchorPoint(draftStart, connectorDraft.sourceAnchor, camera, viewport),
        snappedTarget
          ? getScreenAnchorPoint(
              document.nodes.find((node) => node.id === snappedTarget.nodeId) ?? draftStart,
              snappedTarget.anchorId,
              camera,
              viewport,
            )
          : worldToScreen(connectorDraft.currentWorld, camera, viewport),
      ]
    : null;

  const reconnectLine = reconnectDraft
    ? (() => {
        const fixedNode = document.nodes.find((n) => n.id === reconnectDraft.fixedNodeId);
        if (!fixedNode) return null;
        const fixedPoint = getScreenAnchorPoint(fixedNode, reconnectDraft.fixedAnchor, camera, viewport);
        const movingPoint = reconnectSnap
          ? getScreenAnchorPoint(
              document.nodes.find((n) => n.id === reconnectSnap.nodeId) ?? fixedNode,
              reconnectSnap.anchorId,
              camera,
              viewport,
            )
          : worldToScreen(reconnectDraft.currentWorld, camera, viewport);
        return [fixedPoint, movingPoint];
      })()
    : null;

  return (
    <svg className="canvas-overlay" viewBox={`0 0 ${viewport.width} ${viewport.height}`} role="presentation">
      {marqueeRect ? <rect className="canvas-overlay__marquee" x={marqueeRect.x} y={marqueeRect.y} width={marqueeRect.width} height={marqueeRect.height} /> : null}
      {selectionPolygon ? <polygon className="canvas-overlay__selection" points={selectionPolygon.map((point) => `${point.x},${point.y}`).join(' ')} /> : null}
      {cornerHandles.map((item) => (
        <circle key={item.handle} className="canvas-overlay__handle" cx={item.point.x} cy={item.point.y} r="7" onPointerDown={(event) => onResizeHandlePointerDown(item.handle, event)} />
      ))}
      {anchorHandles.map((item) => (
        <g key={`${item.nodeId}-${item.anchorId}`}>
          <defs>
            <radialGradient id={`anchor-glow-${item.nodeId}-${item.anchorId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={item.color} stopOpacity={item.active || item.target ? 0.95 : 0.9} />
              <stop offset="45%" stopColor={item.color} stopOpacity={item.active || item.target ? 0.32 : 0.22} />
              <stop offset="100%" stopColor={item.color} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            className="canvas-overlay__anchor-hit"
            cx={item.point.x}
            cy={item.point.y}
            r="8"
            onPointerDown={(event) => onAnchorPointerDown(item.nodeId, item.anchorId, event)}
          />
          <circle
            cx={item.point.x}
            cy={item.point.y}
            r={item.target ? '10' : '8'}
            fill={`url(#anchor-glow-${item.nodeId}-${item.anchorId})`}
            opacity={item.active || item.target ? 1 : 0.9}
          />
          <circle
            className={`canvas-overlay__anchor canvas-overlay__anchor--${item.side}${item.active || item.target ? ' is-active' : ''}`}
            cx={item.point.x}
            cy={item.point.y}
            r={item.target ? '4.5' : '3.75'}
            fill={item.color}
            stroke={item.color}
            fillOpacity={item.active || item.target ? 0.98 : 0.42}
            strokeOpacity={item.active || item.target ? 1 : 0.9}
            onPointerDown={(event) => onAnchorPointerDown(item.nodeId, item.anchorId, event)}
          />
        </g>
      ))}
      {connectorPath ? <polyline className="canvas-overlay__connector-line" points={connectorPath.map((point) => `${point.x},${point.y}`).join(' ')} /> : null}
      {draftLine ? <polyline className="canvas-overlay__draft-line" points={draftLine.map((point) => `${point.x},${point.y}`).join(' ')} /> : null}
      {reconnectLine ? <polyline className="canvas-overlay__draft-line" points={reconnectLine.map((point) => `${point.x},${point.y}`).join(' ')} /> : null}
      {connectorEndpoints.map((item) => (
        <circle
          key={item.end}
          className="canvas-overlay__endpoint"
          cx={item.point.x}
          cy={item.point.y}
          r="8"
          onPointerDown={(event) => onConnectorEndpointPointerDown(selectedConnector!.id, item.end, event)}
        />
      ))}
      {waypointHandles.map((point, index) => (
        <circle key={`${index}-${point.x}-${point.y}`} className="canvas-overlay__waypoint" cx={point.x} cy={point.y} r="7" onPointerDown={(event) => onWaypointPointerDown(index, event)} />
      ))}
      {alignGuides.map((guide, i) => {
        const EXTENT = 4000;
        if (guide.axis === 'x') {
          const p1 = worldToScreen({ x: guide.value, y: -EXTENT }, camera, viewport);
          const p2 = worldToScreen({ x: guide.value, y: EXTENT }, camera, viewport);
          return <line key={`guide-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0,200,255,0.45)" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none" />;
        }
        const p1 = worldToScreen({ x: -EXTENT, y: guide.value }, camera, viewport);
        const p2 = worldToScreen({ x: EXTENT, y: guide.value }, camera, viewport);
        return <line key={`guide-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(0,200,255,0.45)" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none" />;
      })}
    </svg>
  );
}



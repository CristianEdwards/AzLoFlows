import { CULL_MARGIN } from '@/lib/config';
import { isVisible } from '@/lib/visibility';
import { renderArea } from '@/features/canvas/renderers/renderArea';
import { renderBackground } from '@/features/canvas/renderers/renderBackground';
import { renderConnector, buildConnectorSmoothPath } from '@/features/canvas/renderers/renderConnector';
import { renderIsoGrid } from '@/features/canvas/renderers/renderIsoGrid';
import { renderNode } from '@/features/canvas/renderers/renderNode';
import { renderPipe } from '@/features/canvas/renderers/renderPipe';
import { renderSelectionOutline } from '@/features/canvas/renderers/renderSelection';
import { renderText } from '@/features/canvas/renderers/renderText';
import { isoQuad, type ViewportSize } from '@/lib/geometry/iso';
import type { DiagramDocument, SelectionState, CameraState, TagFilter, Point } from '@/types/document';

interface RenderSceneArgs {
  ctx: CanvasRenderingContext2D;
  viewport: ViewportSize;
  document: DiagramDocument;
  selection: SelectionState;
  camera: CameraState;
  time: number;
  tagFilter: TagFilter;
  theme: 'dark' | 'light';
}

function isOnScreen(
  entity: { x: number; y: number; width: number; height: number },
  camera: CameraState,
  viewport: ViewportSize,
): boolean {
  const quad = isoQuad(entity.x, entity.y, entity.width, entity.height, camera, viewport);
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return maxX >= -CULL_MARGIN && minX <= viewport.width + CULL_MARGIN && maxY >= -CULL_MARGIN && minY <= viewport.height + CULL_MARGIN;
}

export function renderScene({ ctx, viewport, document, selection, camera, time, tagFilter, theme }: RenderSceneArgs): void {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  renderBackground(ctx, viewport, theme);
  renderIsoGrid(ctx, camera, viewport, theme);

  // Build a unified render list sorted by global zIndex
  type RenderItem =
    | { kind: 'area'; entity: typeof document.areas[number] }
    | { kind: 'connector'; entity: typeof document.connectors[number] }
    | { kind: 'node'; entity: typeof document.nodes[number] }
    | { kind: 'pipe'; entity: NonNullable<typeof document.pipes>[number] }
    | { kind: 'text'; entity: NonNullable<typeof document.texts>[number] };

  const items: RenderItem[] = [];
  const visibleNodes = document.nodes.filter((e) => isVisible(e.tags, tagFilter));
  const visibleAreas = document.areas.filter((e) => isVisible(e.tags, tagFilter));
  for (const e of visibleAreas) if (isOnScreen(e, camera, viewport)) items.push({ kind: 'area', entity: e });
  for (const e of document.connectors) if (isVisible(e.tags, tagFilter)) items.push({ kind: 'connector', entity: e }); // connectors span between nodes, skip culling
  for (const e of visibleNodes) if (isOnScreen(e, camera, viewport)) items.push({ kind: 'node', entity: e });
  for (const e of (document.pipes ?? [])) if (isVisible(e.tags, tagFilter) && isOnScreen(e, camera, viewport)) items.push({ kind: 'pipe', entity: e });
  for (const e of (document.texts ?? [])) if (isVisible(e.tags, tagFilter) && isOnScreen({ x: e.x - e.fontSize * 4, y: e.y - e.fontSize, width: e.fontSize * 12, height: e.fontSize * 4 }, camera, viewport)) items.push({ kind: 'text', entity: e });
  items.sort((a, b) => a.entity.zIndex - b.entity.zIndex);

  // Pre-compute smooth paths for all visible connectors (for crossing detection)
  const connectorPaths = new Map<string, Point[]>();
  for (const item of items) {
    if (item.kind !== 'connector') continue;
    const source = document.nodes.find((n) => n.id === item.entity.sourceId);
    const target = document.nodes.find((n) => n.id === item.entity.targetId);
    if (source && target) {
      connectorPaths.set(item.entity.id, buildConnectorSmoothPath(item.entity, source, target, camera, viewport));
    }
  }

  const renderedConnectorPaths: Point[][] = [];
  for (const item of items) {
    switch (item.kind) {
      case 'area':
        renderArea(ctx, item.entity, selection.type === 'area' && selection.ids.includes(item.entity.id), camera, viewport, time, theme);
        break;
      case 'connector': {
        const source = document.nodes.find((node) => node.id === item.entity.sourceId);
        const target = document.nodes.find((node) => node.id === item.entity.targetId);
        if (source && target) {
          renderConnector(ctx, item.entity, source, target, selection.type === 'connector' && selection.ids.includes(item.entity.id), visibleNodes, visibleAreas, camera, viewport, time, theme, renderedConnectorPaths);
          const path = connectorPaths.get(item.entity.id);
          if (path) renderedConnectorPaths.push(path);
        }
        break;
      }
      case 'node':
        renderNode(ctx, item.entity, selection.type === 'node' && selection.ids.includes(item.entity.id), camera, viewport, time, theme);
        break;
      case 'pipe':
        renderPipe(ctx, item.entity, selection.type === 'pipe' && selection.ids.includes(item.entity.id), camera, viewport, { nodes: visibleNodes, areas: visibleAreas }, theme);
        break;
      case 'text':
        renderText(ctx, item.entity, selection.type === 'text' && selection.ids.includes(item.entity.id), camera, viewport, theme);
        break;
    }
  }

  // Selection outlines drawn last (always on top)
  if (selection.type === 'area') {
    for (const area of document.areas.filter((item) => selection.ids.includes(item.id) && isVisible(item.tags, tagFilter))) {
      renderSelectionOutline(ctx, area, camera, viewport);
    }
  }

  if (selection.type === 'node') {
    for (const node of document.nodes.filter((item) => selection.ids.includes(item.id) && isVisible(item.tags, tagFilter))) {
      renderSelectionOutline(ctx, node, camera, viewport);
    }
  }

  if (selection.type === 'pipe') {
    for (const pipe of (document.pipes ?? []).filter((item) => selection.ids.includes(item.id) && isVisible(item.tags, tagFilter))) {
      renderSelectionOutline(ctx, pipe, camera, viewport);
    }
  }
}

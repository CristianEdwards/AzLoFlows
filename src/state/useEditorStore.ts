import { create } from 'zustand';
import { MIN_ZOOM, MAX_ZOOM } from '@/lib/config';
import { hitTestArea, hitTestConnector, hitTestNode, hitTestPipe, hitTestText } from '@/lib/geometry/bounds';
import { snapToGrid } from '@/lib/geometry/grid';
import { resizeRectFromHandle, type ResizeHandle } from '@/lib/geometry/resize';
import { containsArea, containsNode, containsPipe, containsText, type SelectionBounds } from '@/lib/geometry/selection';
import { companionPalette, hexToRgba, palette } from '@/lib/rendering/tokens';
import { cloneDocument, withCommittedHistory, type HistoryState } from '@/state/history';
import type {
  AreaEntity,
  CameraState,
  ConnectorEntity,
  ConnectorStyle,
  DiagramDocument,
  EntityType,
  FlowSource,
  FlowType,
  NodeEntity,
  NodeShape,
  PickerDef,
  PipeEntity,
  ScenarioId,
  TextEntity,
  AnchorId,
  Point,
  SelectionState,
  ToastMessage,
  ToolMode,
} from '@/types/document';
import { DOCUMENT_VERSION } from '@/types/document';
import { getDocScenarios } from '@/types/document';
import { loadDocument, normalizeDocument } from '@/lib/serialization/storage';

type ClipboardPayload =
  | { type: 'area'; entities: AreaEntity[] }
  | { type: 'node'; entities: NodeEntity[] }
  | { type: 'connector'; entities: ConnectorEntity[] }
  | { type: 'text'; entities: TextEntity[] }
  | { type: 'pipe'; entities: PipeEntity[] };

interface EditorStore {
  document: DiagramDocument;
  selection: SelectionState;
  camera: CameraState;
  snapEnabled: boolean;
  presentMode: boolean;
  preferredColor: string;
  tool: ToolMode;
  toasts: ToastMessage[];
  history: HistoryState;
  activeScenario: ScenarioId | null;
  theme: 'dark' | 'light';
  activeFlowSources: Set<FlowSource>;
  activeFlowTypes: Set<FlowType>;
  clipboard: ClipboardPayload | null;
  toggleTheme: () => void;
  setActiveScenario: (id: ScenarioId | null) => void;
  toggleFlowSource: (source: FlowSource) => void;
  toggleFlowType: (type: FlowType) => void;
  setCamera: (patch: Partial<CameraState>) => void;
  setTool: (tool: ToolMode) => void;
  toggleSnap: () => void;
  togglePresentMode: () => void;
  setPreferredColor: (color: string) => void;
  renameDocument: (name: string) => void;
  newDocument: () => void;
  importDocument: (document: DiagramDocument) => void;
  selectEntities: (type: EntityType | null, ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  addShape: (shape: 'area' | 'node' | 'text' | 'pipe', point: Point, templateOverrides?: { title?: string; subtitle?: string; fill?: string; glowColor?: string; icon?: string; shape?: NodeShape }) => void;
  updateArea: (id: string, patch: Partial<AreaEntity>) => void;
  updateNode: (id: string, patch: Partial<NodeEntity>) => void;
  updateConnector: (id: string, patch: Partial<ConnectorEntity>) => void;
  updateText: (id: string, patch: Partial<TextEntity>) => void;
  updatePipe: (id: string, patch: Partial<PipeEntity>) => void;
  moveSelection: (delta: Point, raw?: boolean) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  connectSelectedNodes: () => void;
  createConnectorBetween: (sourceId: string, sourceAnchor: AnchorId, targetId: string, targetAnchor: AnchorId) => void;
  addConnectorWaypoint: () => void;
  removeLastConnectorWaypoint: () => void;
  moveConnectorWaypoint: (index: number, point: Point) => void;
  resizeSelection: (handle: ResizeHandle, point: Point) => void;
  selectWithinRect: (bounds: SelectionBounds, additive?: boolean) => void;
  selectAtPoint: (point: Point, additive?: boolean) => void;
  setNodeArea: (nodeId: string, areaId?: string) => void;
  commitHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
  pushToast: (message: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
  bringToFront: () => void;
  sendToBack: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  batchUpdate: (patch: { glowColor?: string; fontSize?: number; tags?: string[] }) => void;
  updateDocumentDefs: (patch: { scenarios?: PickerDef[]; flowSources?: PickerDef[]; flowTypes?: PickerDef[] }) => void;
  fitToScreen: (viewportWidth: number, viewportHeight: number) => void;
  zoomToSelection: (viewportWidth: number, viewportHeight: number) => void;
}

const defaultCamera: CameraState = { x: 0, y: 40, zoom: 1 };

function createBaseDocument(): DiagramDocument {
  return loadDocument() ?? createEmptyDocument();
}

function createEmptyDocument(): DiagramDocument {
  return {
    version: DOCUMENT_VERSION,
    id: crypto.randomUUID(),
    name: 'Untitled Diagram',
    areas: [],
    nodes: [],
    connectors: [],
    texts: [],
    pipes: [],
  };
}

function globalMaxZIndex(document: DiagramDocument): number {
  let max = 0;
  for (const a of document.areas) max = Math.max(max, a.zIndex);
  for (const n of document.nodes) max = Math.max(max, n.zIndex);
  for (const c of document.connectors) max = Math.max(max, c.zIndex);
  for (const t of (document.texts ?? [])) max = Math.max(max, t.zIndex);
  for (const p of (document.pipes ?? [])) max = Math.max(max, p.zIndex);
  return max;
}

function globalMinZIndex(document: DiagramDocument): number {
  let min = Infinity;
  for (const a of document.areas) min = Math.min(min, a.zIndex);
  for (const n of document.nodes) min = Math.min(min, n.zIndex);
  for (const c of document.connectors) min = Math.min(min, c.zIndex);
  for (const t of (document.texts ?? [])) min = Math.min(min, t.zIndex);
  for (const p of (document.pipes ?? [])) min = Math.min(min, p.zIndex);
  return min === Infinity ? 0 : min;
}

function nextZIndex(document: DiagramDocument): number {
  return globalMaxZIndex(document) + 1;
}

function createToast(message: string, tone: ToastMessage['tone'] = 'info'): ToastMessage {
  return { id: crypto.randomUUID(), message, tone };
}

function companionFor(color: string): string {
  const mapping: Record<string, string> = {
    [palette.cyan]: companionPalette.cyan,
    [palette.pink]: companionPalette.pink,
    [palette.green]: companionPalette.green,
    [palette.darkGreen]: companionPalette.darkGreen,
    [palette.purple]: companionPalette.purple,
    [palette.blue]: companionPalette.blue,
    [palette.orange]: companionPalette.orange,
    [palette.gold]: companionPalette.gold,
    [palette.red]: companionPalette.red,
    [palette.teal]: companionPalette.teal,
    [palette.amber]: companionPalette.amber,
    [palette.indigo]: companionPalette.indigo,
    [palette.coral]: companionPalette.coral,
    [palette.lime]: companionPalette.lime,
  };
  return mapping[color] ?? hexToRgba(color, 0.28);
}

function findContainingAreaId(node: Pick<NodeEntity, 'x' | 'y' | 'width' | 'height'>, areas: AreaEntity[]): string | undefined {
  const center = { x: node.x + node.width * 0.5, y: node.y + node.height * 0.5 };
  const containing = areas
    .filter((area) => center.x >= area.x && center.x <= area.x + area.width && center.y >= area.y && center.y <= area.y + area.height)
    .sort((left, right) => right.zIndex - left.zIndex);
  return containing[0]?.id;
}

function getParentLayout(node: Pick<NodeEntity, 'x' | 'y' | 'width' | 'height'>, area?: AreaEntity): NodeEntity['parentLayout'] {
  if (!area) {
    return undefined;
  }
  return {
    xRatio: area.width === 0 ? 0 : (node.x - area.x) / area.width,
    yRatio: area.height === 0 ? 0 : (node.y - area.y) / area.height,
  };
}

function clampNodeToArea(node: NodeEntity, area: AreaEntity): NodeEntity {
  const padding = 16;
  const maxX = area.x + Math.max(padding, area.width - node.width - padding);
  const maxY = area.y + Math.max(padding, area.height - node.height - padding);
  const x = Math.min(Math.max(node.x, area.x + padding), maxX);
  const y = Math.min(Math.max(node.y, area.y + padding), maxY);
  return {
    ...node,
    x,
    y,
    parentAreaId: area.id,
    parentLayout: getParentLayout({ ...node, x, y }, area),
  };
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  document: createBaseDocument(),
  selection: { type: null, ids: [] },
  camera: defaultCamera,
  snapEnabled: true,
  presentMode: false,
  preferredColor: palette.cyan,
  tool: 'select',
  toasts: [],
  history: { past: [], future: [] },
  activeScenario: null,
  theme: 'dark',
  activeFlowSources: new Set<FlowSource>(),
  activeFlowTypes: new Set<FlowType>(),
  clipboard: null,
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setActiveScenario: (id) => set({ activeScenario: id, activeFlowSources: new Set<FlowSource>(), activeFlowTypes: new Set<FlowType>() }),
  toggleFlowSource: (source) => set((state) => {
    const next = new Set(state.activeFlowSources);
    if (next.has(source)) next.delete(source); else next.add(source);
    const arcScenario = state.activeScenario === 'no-proxy-arc' || state.activeScenario === 'proxy-arc';
    if (arcScenario && !next.has('hosts')) { next.delete('arb'); next.delete('aks'); }
    return { activeFlowSources: next, activeFlowTypes: next.size > 0 ? state.activeFlowTypes : new Set<FlowType>() };
  }),
  toggleFlowType: (type) => set((state) => {
    const next = new Set(state.activeFlowTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    return { activeFlowTypes: next };
  }),
  setCamera: (patch) => {
    set((state) => ({ camera: { ...state.camera, ...patch } }));
  },
  setTool: (tool) => set({ tool }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  togglePresentMode: () => set((state) => ({ presentMode: !state.presentMode })),
  setPreferredColor: (color) => set({ preferredColor: color }),
  commitHistorySnapshot: () => {
    set((state) => ({ history: withCommittedHistory(state.history, state.document) }));
  },
  renameDocument: (name) => {
    set((state) => ({
      history: withCommittedHistory(state.history, state.document),
      document: { ...cloneDocument(state.document), name },
    }));
  },
  newDocument: () => {
    const document = createEmptyDocument();
    set({
      document,
      selection: { type: null, ids: [] },
      history: { past: [], future: [] },
      camera: defaultCamera,
      presentMode: false,
      toasts: [createToast('Created a new empty diagram', 'success')],
    });
  },
  importDocument: (document) => {
    const normalized = normalizeDocument(document);
    const scenarios = getDocScenarios(normalized);
    const autoScenario = scenarios.length === 1 ? scenarios[0].id : null;
    set({
      document: normalized,
      selection: { type: null, ids: [] },
      history: { past: [], future: [] },
      activeScenario: autoScenario,
      activeFlowSources: new Set<FlowSource>(),
      activeFlowTypes: new Set<FlowType>(),
      toasts: [createToast('Imported diagram JSON', 'success')],
    });
  },
  selectEntities: (type, ids, additive = false) => {
    set((state) => {
      if (!type || ids.length === 0) {
        return { selection: { type: null, ids: [] } };
      }

      if (!additive || state.selection.type !== type) {
        return { selection: { type, ids } };
      }

      const merged = [...new Set([...state.selection.ids, ...ids])];
      return { selection: { type, ids: merged } };
    });
  },
  clearSelection: () => set({ selection: { type: null, ids: [] } }),
  addShape: (shape, point, templateOverrides) => {
    set((state) => {
      const document = cloneDocument(state.document);
      const nextPoint = state.snapEnabled ? snapToGrid(point) : point;
      if (shape === 'area') {
        document.areas.push({
          id: crypto.randomUUID(),
          type: 'area',
          x: nextPoint.x,
          y: nextPoint.y,
          width: 240,
          height: 180,
          label: 'New Area',
          fill: companionFor(state.preferredColor),
          borderColor: state.preferredColor,
          glowColor: state.preferredColor,
          locked: false,
          zIndex: nextZIndex(document),
        });
      } else if (shape === 'text') {
        const newText: TextEntity = {
          id: crypto.randomUUID(),
          type: 'text',
          x: nextPoint.x,
          y: nextPoint.y,
          label: 'Label',
          fontSize: 24,
          color: '#e7f6ff',
          zIndex: nextZIndex(document),
        };
        document.texts.push(newText);
      } else if (shape === 'pipe') {
        const newPipe: PipeEntity = {
          id: crypto.randomUUID(),
          type: 'pipe',
          x: nextPoint.x,
          y: nextPoint.y,
          width: 200,
          height: 60,
          color: state.preferredColor,
          zIndex: nextZIndex(document),
        };
        if (!document.pipes) document.pipes = [];
        document.pipes.push(newPipe);
      } else {
        document.nodes.push({
          id: crypto.randomUUID(),
          type: 'node',
          shape: templateOverrides?.shape,
          x: nextPoint.x,
          y: nextPoint.y,
          width: 140,
          height: 96,
          title: templateOverrides?.title ?? 'New Node',
          subtitle: templateOverrides?.subtitle ?? 'Editable',
          fill: templateOverrides?.fill ?? companionFor(state.preferredColor),
          glowColor: templateOverrides?.glowColor ?? state.preferredColor,
          icon: templateOverrides?.icon,
          parentAreaId: undefined,
          parentLayout: undefined,
          zIndex: nextZIndex(document),
        });
      }

      return {
        document,
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast(`Added ${shape}`, 'success')],
      };
    });
  },
  updateArea: (id, patch) => {
    set((state) => ({
      history: withCommittedHistory(state.history, state.document),
      document: {
        ...cloneDocument(state.document),
        areas: state.document.areas.map((area) => (area.id === id ? { ...area, ...patch } : area)),
      },
    }));
  },
  updateNode: (id, patch) => {
    set((state) => ({
      history: withCommittedHistory(state.history, state.document),
      document: {
        ...cloneDocument(state.document),
        nodes: state.document.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
      },
    }));
  },
  updateConnector: (id, patch) => {
    set((state) => ({
      history: withCommittedHistory(state.history, state.document),
      document: {
        ...cloneDocument(state.document),
        connectors: state.document.connectors.map((connector) => (connector.id === id ? { ...connector, ...patch } : connector)),
      },
    }));
  },
  updateText: (id, patch) => {
    set((state) => ({
      history: withCommittedHistory(state.history, state.document),
      document: {
        ...cloneDocument(state.document),
        texts: (state.document.texts ?? []).map((text) => (text.id === id ? { ...text, ...patch } : text)),
      },
    }));
  },
  updatePipe: (id, patch) => {
    set((state) => ({
      history: withCommittedHistory(state.history, state.document),
      document: {
        ...cloneDocument(state.document),
        pipes: (state.document.pipes ?? []).map((pipe) => (pipe.id === id ? { ...pipe, ...patch } : pipe)),
      },
    }));
  },
  moveSelection: (delta, raw) => {
    set((state) => {
      if (!state.selection.type || state.selection.ids.length === 0) {
        return state;
      }

      const document = cloneDocument(state.document);
      const nextDelta = (!raw && state.snapEnabled) ? snapToGrid(delta) : delta;

      if (state.selection.type === 'node') {
        document.nodes = document.nodes.map((node) => (
          state.selection.ids.includes(node.id)
            ? { ...node, x: node.x + nextDelta.x, y: node.y + nextDelta.y }
            : node
        ));
      }

      if (state.selection.type === 'area') {
        document.areas = document.areas.map((area) => (
          state.selection.ids.includes(area.id) && !area.locked
            ? { ...area, x: area.x + nextDelta.x, y: area.y + nextDelta.y }
            : area
        ));
      }

      if (state.selection.type === 'text') {
        document.texts = (document.texts ?? []).map((text) => (
          state.selection.ids.includes(text.id)
            ? { ...text, x: text.x + nextDelta.x, y: text.y + nextDelta.y }
            : text
        ));
      }

      if (state.selection.type === 'pipe') {
        document.pipes = (document.pipes ?? []).map((pipe) => (
          state.selection.ids.includes(pipe.id)
            ? { ...pipe, x: pipe.x + nextDelta.x, y: pipe.y + nextDelta.y }
            : pipe
        ));
      }

      return { document };
    });
  },
  deleteSelection: () => {
    set((state) => {
      if (!state.selection.type || state.selection.ids.length === 0) {
        return state;
      }

      const document = cloneDocument(state.document);
      if (state.selection.type === 'node') {
        document.nodes = document.nodes.filter((node) => !state.selection.ids.includes(node.id));
        document.connectors = document.connectors.filter(
          (connector) => !state.selection.ids.includes(connector.sourceId) && !state.selection.ids.includes(connector.targetId),
        );
      } else if (state.selection.type === 'area') {
        document.areas = document.areas.filter((area) => !state.selection.ids.includes(area.id));
      } else if (state.selection.type === 'text') {
        document.texts = (document.texts ?? []).filter((text) => !state.selection.ids.includes(text.id));
      } else if (state.selection.type === 'pipe') {
        document.pipes = (document.pipes ?? []).filter((pipe) => !state.selection.ids.includes(pipe.id));
      } else {
        document.connectors = document.connectors.filter((connector) => !state.selection.ids.includes(connector.id));
      }

      return {
        document,
        selection: { type: null, ids: [] },
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast('Deleted selection', 'info')],
      };
    });
  },
  duplicateSelection: () => {
    set((state) => {
      if (!state.selection.type || state.selection.ids.length === 0) {
        return state;
      }

      const document = cloneDocument(state.document);
      const offset = { x: 40, y: 40 };
      if (state.selection.type === 'node') {
        const nextNodes = document.nodes
          .filter((node) => state.selection.ids.includes(node.id))
          .map((node) => ({ ...node, id: crypto.randomUUID(), x: node.x + offset.x, y: node.y + offset.y, zIndex: nextZIndex(document) }));
        document.nodes.push(...nextNodes);
      }
      if (state.selection.type === 'area') {
        const nextAreas = document.areas
          .filter((area) => state.selection.ids.includes(area.id))
          .map((area) => ({ ...area, id: crypto.randomUUID(), x: area.x + offset.x, y: area.y + offset.y, zIndex: nextZIndex(document) }));
        document.areas.push(...nextAreas);
      }
      if (state.selection.type === 'text') {
        const nextTexts = (document.texts ?? [])
          .filter((text) => state.selection.ids.includes(text.id))
          .map((text) => ({ ...text, id: crypto.randomUUID(), x: text.x + offset.x, y: text.y + offset.y, zIndex: nextZIndex(document) }));
        if (!document.texts) document.texts = [];
        document.texts.push(...nextTexts);
      }
      if (state.selection.type === 'pipe') {
        const nextPipes = (document.pipes ?? [])
          .filter((pipe) => state.selection.ids.includes(pipe.id))
          .map((pipe) => ({ ...pipe, id: crypto.randomUUID(), x: pipe.x + offset.x, y: pipe.y + offset.y, zIndex: nextZIndex(document) }));
        if (!document.pipes) document.pipes = [];
        document.pipes.push(...nextPipes);
      }

      return {
        document,
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast('Duplicated selection', 'success')],
      };
    });
  },
  connectSelectedNodes: () => {
    set((state) => {
      if (state.selection.type !== 'node' || state.selection.ids.length !== 2) {
        return {
          toasts: [...state.toasts, createToast('Select exactly two nodes to create a connector', 'error')],
        };
      }

      const document = cloneDocument(state.document);
      const [sourceId, targetId] = state.selection.ids;
      const connector: ConnectorEntity = {
        id: crypto.randomUUID(),
        type: 'connector',
        sourceId,
        targetId,
        sourceAnchor: 'bottom-1',
        targetAnchor: 'bottom-2',
        color: state.preferredColor,
        label: 'Flow',
        style: 'animated',
        waypoints: [],
        zIndex: nextZIndex(document),
      };
      document.connectors.push(connector);

      return {
        document,
        history: withCommittedHistory(state.history, state.document),
        selection: { type: 'connector', ids: [connector.id] },
        toasts: [...state.toasts, createToast('Created connector', 'success')],
      };
    });
  },
  createConnectorBetween: (sourceId, sourceAnchor, targetId, targetAnchor) => {
    set((state) => {
      const document = cloneDocument(state.document);
      const connector: ConnectorEntity = {
        id: crypto.randomUUID(),
        type: 'connector',
        sourceId,
        targetId,
        sourceAnchor,
        targetAnchor,
        color: state.preferredColor,
        label: 'Flow',
        style: 'animated',
        waypoints: [],
        zIndex: nextZIndex(document),
      };
      document.connectors.push(connector);
      return {
        document,
        selection: { type: 'connector', ids: [connector.id] },
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast('Created anchor-based connector', 'success')],
      };
    });
  },
  addConnectorWaypoint: () => {
    set((state) => {
      if (state.selection.type !== 'connector' || state.selection.ids.length !== 1) {
        return state;
      }
      const document = cloneDocument(state.document);
      const connector = document.connectors.find((item) => item.id === state.selection.ids[0]);
      const source = connector ? document.nodes.find((node) => node.id === connector.sourceId) : null;
      const target = connector ? document.nodes.find((node) => node.id === connector.targetId) : null;
      if (!connector || !source || !target) {
        return state;
      }
      connector.waypoints.push({
        x: (source.x + source.width * 0.5 + target.x + target.width * 0.5) * 0.5,
        y: Math.max(source.y + source.height, target.y + target.height) + 80,
      });
      return {
        document,
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast('Added connector bend point', 'success')],
      };
    });
  },
  removeLastConnectorWaypoint: () => {
    set((state) => {
      if (state.selection.type !== 'connector' || state.selection.ids.length !== 1) {
        return state;
      }
      const document = cloneDocument(state.document);
      const connector = document.connectors.find((item) => item.id === state.selection.ids[0]);
      if (!connector || connector.waypoints.length === 0) {
        return state;
      }
      connector.waypoints.pop();
      return {
        document,
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast('Removed connector bend point', 'info')],
      };
    });
  },
  moveConnectorWaypoint: (index, point) => {
    set((state) => {
      if (state.selection.type !== 'connector' || state.selection.ids.length !== 1) {
        return state;
      }
      const document = cloneDocument(state.document);
      const connector = document.connectors.find((item) => item.id === state.selection.ids[0]);
      if (!connector || !connector.waypoints[index]) {
        return state;
      }
      connector.waypoints[index] = state.snapEnabled ? snapToGrid(point) : point;
      return { document };
    });
  },
  resizeSelection: (handle, point) => {
    set((state) => {
      if (state.selection.ids.length !== 1 || !state.selection.type || state.selection.type === 'connector' || state.selection.type === 'text') {
        return state;
      }
      const document = cloneDocument(state.document);
      if (state.selection.type === 'node') {
        document.nodes = document.nodes.map((node) => {
          if (node.id !== state.selection.ids[0]) {
            return node;
          }
          return { ...node, ...resizeRectFromHandle(node, handle, point, state.snapEnabled, 40, 30) };
        });
      }
      if (state.selection.type === 'area') {
        document.areas = document.areas.map((area) => {
          if (area.id !== state.selection.ids[0] || area.locked) {
            return area;
          }
          return { ...area, ...resizeRectFromHandle(area, handle, point, state.snapEnabled, 60, 40) };
        });
      }
      if (state.selection.type === 'pipe') {
        document.pipes = (document.pipes ?? []).map((pipe) => {
          if (pipe.id !== state.selection.ids[0]) {
            return pipe;
          }
          return { ...pipe, ...resizeRectFromHandle(pipe, handle, point, state.snapEnabled, 40, 20) };
        });
      }
      return { document };
    });
  },
  selectWithinRect: (bounds, additive = false) => {
    set((state) => {
      const nodeIds = state.document.nodes.filter((node) => containsNode(bounds, node)).map((node) => node.id);
      if (nodeIds.length > 0) {
        if (!additive || state.selection.type !== 'node') {
          return { selection: { type: 'node', ids: nodeIds } };
        }
        return { selection: { type: 'node', ids: [...new Set([...state.selection.ids, ...nodeIds])] } };
      }
      const areaIds = state.document.areas.filter((area) => containsArea(bounds, area)).map((area) => area.id);
      if (areaIds.length > 0) {
        if (!additive || state.selection.type !== 'area') {
          return { selection: { type: 'area', ids: areaIds } };
        }
        return { selection: { type: 'area', ids: [...new Set([...state.selection.ids, ...areaIds])] } };
      }
      const textIds = (state.document.texts ?? []).filter((text) => containsText(bounds, text)).map((text) => text.id);
      if (textIds.length > 0) {
        if (!additive || state.selection.type !== 'text') {
          return { selection: { type: 'text', ids: textIds } };
        }
        return { selection: { type: 'text', ids: [...new Set([...state.selection.ids, ...textIds])] } };
      }
      const pipeIds = (state.document.pipes ?? []).filter((pipe) => containsPipe(bounds, pipe)).map((pipe) => pipe.id);
      if (pipeIds.length > 0) {
        if (!additive || state.selection.type !== 'pipe') {
          return { selection: { type: 'pipe', ids: pipeIds } };
        }
        return { selection: { type: 'pipe', ids: [...new Set([...state.selection.ids, ...pipeIds])] } };
      }
      return { selection: { type: null, ids: [] } };
    });
  },
  selectAtPoint: (point, additive = false) => {
    const { document } = get();
    const node = hitTestNode(document.nodes, point);
    if (node) {
      get().selectEntities('node', [node.id], additive);
      return;
    }

    const connector = hitTestConnector(document.connectors, document.nodes, point);
    if (connector) {
      get().selectEntities('connector', [connector.id], additive);
      return;
    }

    const text = hitTestText(document.texts ?? [], point);
    if (text) {
      get().selectEntities('text', [text.id], additive);
      return;
    }

    const pipe = hitTestPipe(document.pipes ?? [], point);
    if (pipe) {
      get().selectEntities('pipe', [pipe.id], additive);
      return;
    }

    const area = hitTestArea(document.areas, point);
    if (area) {
      get().selectEntities('area', [area.id], additive);
      return;
    }

    get().clearSelection();
  },
  setNodeArea: (nodeId, areaId) => {
    set((state) => {
      const document = cloneDocument(state.document);
      const area = areaId ? document.areas.find((item) => item.id === areaId) : undefined;
      document.nodes = document.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }
        if (!area) {
          return { ...node, parentAreaId: undefined, parentLayout: undefined };
        }
        return clampNodeToArea(node, area);
      });
      return {
        document,
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast(area ? 'Attached node to area' : 'Detached node from area', 'success')],
      };
    });
  },
  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) {
        return state;
      }

      const previous = state.history.past[state.history.past.length - 1];
      return {
        document: cloneDocument(previous),
        selection: { type: null, ids: [] },
        history: {
          past: state.history.past.slice(0, -1),
          future: [cloneDocument(state.document), ...state.history.future],
        },
      };
    });
  },
  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) {
        return state;
      }

      const [next, ...future] = state.history.future;
      return {
        document: cloneDocument(next),
        selection: { type: null, ids: [] },
        history: {
          past: [...state.history.past, cloneDocument(state.document)],
          future,
        },
      };
    });
  },
  pushToast: (message, tone = 'info') => {
    const toast = createToast(message, tone);
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  bringToFront: () => {
    set((state) => {
      const { selection } = state;
      if (!selection.type || selection.ids.length === 0) return state;
      const document = cloneDocument(state.document);
      const maxZ = globalMaxZIndex(document);
      const ids = new Set(selection.ids);
      const update = <T extends { id: string; zIndex: number }>(items: T[]) =>
        items.map((item) => ids.has(item.id) ? { ...item, zIndex: maxZ + 1 } : item);
      if (selection.type === 'area') document.areas = update(document.areas);
      else if (selection.type === 'node') document.nodes = update(document.nodes);
      else if (selection.type === 'connector') document.connectors = update(document.connectors);
      else if (selection.type === 'text') document.texts = update(document.texts);
      else if (selection.type === 'pipe') document.pipes = update(document.pipes ?? []);
      return { document, history: withCommittedHistory(state.history, state.document) };
    });
  },
  sendToBack: () => {
    set((state) => {
      const { selection } = state;
      if (!selection.type || selection.ids.length === 0) return state;
      const document = cloneDocument(state.document);
      const minZ = globalMinZIndex(document);
      const ids = new Set(selection.ids);
      const update = <T extends { id: string; zIndex: number }>(items: T[]) =>
        items.map((item) => ids.has(item.id) ? { ...item, zIndex: minZ - 1 } : item);
      if (selection.type === 'area') document.areas = update(document.areas);
      else if (selection.type === 'node') document.nodes = update(document.nodes);
      else if (selection.type === 'connector') document.connectors = update(document.connectors);
      else if (selection.type === 'text') document.texts = update(document.texts);
      else if (selection.type === 'pipe') document.pipes = update(document.pipes ?? []);
      return { document, history: withCommittedHistory(state.history, state.document) };
    });
  },
  copySelection: () => {
    const { selection, document } = get();
    if (!selection.type || selection.ids.length === 0) return;
    const ids = new Set(selection.ids);
    let payload: ClipboardPayload | null = null;
    if (selection.type === 'area') payload = { type: 'area', entities: structuredClone(document.areas.filter((e) => ids.has(e.id))) };
    else if (selection.type === 'node') payload = { type: 'node', entities: structuredClone(document.nodes.filter((e) => ids.has(e.id))) };
    else if (selection.type === 'connector') payload = { type: 'connector', entities: structuredClone(document.connectors.filter((e) => ids.has(e.id))) };
    else if (selection.type === 'text') payload = { type: 'text', entities: structuredClone((document.texts ?? []).filter((e) => ids.has(e.id))) };
    else if (selection.type === 'pipe') payload = { type: 'pipe', entities: structuredClone((document.pipes ?? []).filter((e) => ids.has(e.id))) };
    if (payload && payload.entities.length > 0) {
      set({ clipboard: payload });
      get().pushToast(`Copied ${payload.entities.length} ${payload.type}(s)`, 'info');
    }
  },
  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.entities.length === 0) return;
    set((state) => {
      const document = cloneDocument(state.document);
      const offset = { x: 40, y: 40 };
      const newIds: string[] = [];
      for (const entity of clipboard.entities) {
        const newId = crypto.randomUUID();
        newIds.push(newId);
        const shifted = { ...structuredClone(entity), id: newId, zIndex: nextZIndex(document) };
        if ('x' in shifted) (shifted as { x: number }).x += offset.x;
        if ('y' in shifted) (shifted as { y: number }).y += offset.y;
        if (clipboard.type === 'area') document.areas.push(shifted as AreaEntity);
        else if (clipboard.type === 'node') document.nodes.push(shifted as NodeEntity);
        else if (clipboard.type === 'text') document.texts.push(shifted as TextEntity);
        else if (clipboard.type === 'pipe') document.pipes.push(shifted as PipeEntity);
      }
      return {
        document,
        selection: { type: clipboard.type as EntityType, ids: newIds },
        history: withCommittedHistory(state.history, state.document),
        toasts: [...state.toasts, createToast(`Pasted ${newIds.length} item(s)`, 'success')],
      };
    });
  },
  batchUpdate: (patch) => {
    set((state) => {
      const { selection } = state;
      if (!selection.type || selection.ids.length < 2) return state;
      const document = cloneDocument(state.document);
      const ids = new Set(selection.ids);
      const applyPatch = <T extends { id: string }>(e: T): T => {
        const updates: Partial<{ glowColor: string; fontSize: number; tags: string[] }> = {};
        if (patch.glowColor != null) updates.glowColor = patch.glowColor;
        if (patch.fontSize != null) updates.fontSize = patch.fontSize;
        if (patch.tags != null) updates.tags = patch.tags;
        return { ...e, ...updates };
      };
      if (selection.type === 'area') document.areas = document.areas.map((e) => ids.has(e.id) ? applyPatch(e) : e);
      else if (selection.type === 'node') document.nodes = document.nodes.map((e) => ids.has(e.id) ? applyPatch(e) : e);
      else if (selection.type === 'connector') document.connectors = document.connectors.map((e) => ids.has(e.id) ? applyPatch(e) : e);
      else if (selection.type === 'text') document.texts = (document.texts ?? []).map((e) => ids.has(e.id) ? applyPatch(e) : e);
      else if (selection.type === 'pipe') document.pipes = (document.pipes ?? []).map((e) => ids.has(e.id) ? applyPatch(e) : e);
      return { document, history: withCommittedHistory(state.history, state.document) };
    });
  },
  updateDocumentDefs: (patch) => {
    set((state) => {
      const document = { ...state.document, ...patch };
      return { document, history: withCommittedHistory(state.history, state.document) };
    });
  },
  fitToScreen: (viewportWidth, viewportHeight) => {
    const { document } = get();
    const xs: number[] = [];
    const ys: number[] = [];
    for (const a of document.areas) { xs.push(a.x, a.x + a.width); ys.push(a.y, a.y + a.height); }
    for (const n of document.nodes) { xs.push(n.x, n.x + n.width); ys.push(n.y, n.y + n.height); }
    for (const t of document.texts ?? []) { xs.push(t.x - 60, t.x + 60); ys.push(t.y - 20, t.y + 20); }
    for (const p of document.pipes ?? []) { xs.push(p.x, p.x + p.width); ys.push(p.y, p.y + p.height); }
    if (xs.length === 0) return;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 80;
    const zoom = Math.min((viewportWidth - padding * 2) / contentW, (viewportHeight - padding * 2) / contentH, MAX_ZOOM);
    const clampedZoom = Math.max(MIN_ZOOM, zoom);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    set({
      camera: { x: -cx * clampedZoom + viewportWidth / 2, y: -cy * clampedZoom + viewportHeight / 2, zoom: clampedZoom },
    });
    get().pushToast('Fit to screen', 'info');
  },
  zoomToSelection: (viewportWidth, viewportHeight) => {
    const { document, selection } = get();
    if (!selection.type || selection.ids.length === 0) {
      get().fitToScreen(viewportWidth, viewportHeight);
      return;
    }
    const ids = new Set(selection.ids);
    const xs: number[] = [];
    const ys: number[] = [];
    if (selection.type === 'area') for (const a of document.areas) { if (ids.has(a.id)) { xs.push(a.x, a.x + a.width); ys.push(a.y, a.y + a.height); } }
    if (selection.type === 'node') for (const n of document.nodes) { if (ids.has(n.id)) { xs.push(n.x, n.x + n.width); ys.push(n.y, n.y + n.height); } }
    if (selection.type === 'text') for (const t of document.texts ?? []) { if (ids.has(t.id)) { xs.push(t.x - 60, t.x + 60); ys.push(t.y - 20, t.y + 20); } }
    if (selection.type === 'pipe') for (const p of document.pipes ?? []) { if (ids.has(p.id)) { xs.push(p.x, p.x + p.width); ys.push(p.y, p.y + p.height); } }
    if (xs.length === 0) return;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;
    const padding = 120;
    const zoom = Math.min((viewportWidth - padding * 2) / contentW, (viewportHeight - padding * 2) / contentH, MAX_ZOOM);
    const clampedZoom = Math.max(MIN_ZOOM, zoom);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    set({
      camera: { x: -cx * clampedZoom + viewportWidth / 2, y: -cy * clampedZoom + viewportHeight / 2, zoom: clampedZoom },
    });
  },
}));

export function getSelectedEntity<T extends AreaEntity | NodeEntity | ConnectorEntity | TextEntity | PipeEntity>(
  collection: T[],
  selection: SelectionState,
): T | null {
  if (selection.ids.length !== 1) {
    return null;
  }
  return collection.find((item) => item.id === selection.ids[0]) ?? null;
}

export function getConnectorStyleOptions(): ConnectorStyle[] {
  return ['solid', 'dashed', 'animated'];
}

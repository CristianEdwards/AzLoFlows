import { isValidAnchorId } from '@/lib/geometry/anchors';
import type { AnchorId, DiagramDocument, NodeEntity } from '@/types/document';
import { DOCUMENT_VERSION } from '@/types/document';

const STORAGE_KEY = 'isoflows.diagram.document';
const RECENT_KEY = 'isoflows.recent';
const MAX_RECENT = 10;

export interface RecentEntry {
  id: string;
  name: string;
  savedAt: number;
}

export function saveDocument(document: DiagramDocument): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  trackRecent(document);
}

function trackRecent(document: DiagramDocument): void {
  const list = loadRecent();
  const entry: RecentEntry = { id: document.id, name: document.name, savedAt: Date.now() };
  const updated = [entry, ...list.filter((e) => e.id !== document.id)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadDocument(): DiagramDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function normalizeDocument(input: unknown): DiagramDocument {
  const value = input as Partial<DiagramDocument> | null;
  const areas = Array.isArray(value?.areas) ? value!.areas : [];
  const nodes = Array.isArray(value?.nodes) ? value!.nodes.map(normalizeNode) : [];
  const connectors = Array.isArray(value?.connectors)
    ? value!.connectors.map((connector) => ({
        ...connector,
        type: 'connector' as const,
        sourceAnchor: normalizeAnchor((connector as { sourceAnchor?: unknown }).sourceAnchor, 'bottom-1'),
        targetAnchor: normalizeAnchor((connector as { targetAnchor?: unknown }).targetAnchor, 'bottom-2'),
        waypoints: Array.isArray((connector as { waypoints?: unknown[] }).waypoints)
          ? ((connector as { waypoints?: Array<{ x?: number; y?: number }> }).waypoints ?? []).map((point) => ({ x: Number(point.x ?? 0), y: Number(point.y ?? 0) }))
          : [],
      }))
    : [];
  const texts = Array.isArray((value as { texts?: unknown })?.texts) ? (value as { texts: unknown[] }).texts : [];
  const pipes = Array.isArray((value as { pipes?: unknown })?.pipes) ? (value as { pipes: unknown[] }).pipes : [];

  return {
    version: DOCUMENT_VERSION,
    id: typeof value?.id === 'string' ? value.id : crypto.randomUUID(),
    name: typeof value?.name === 'string' ? value.name : 'Recovered Diagram',
    areas: areas as DiagramDocument['areas'],
    nodes,
    connectors: connectors as DiagramDocument['connectors'],
    texts: texts as DiagramDocument['texts'],
    pipes: pipes as DiagramDocument['pipes'],
    scenarios: Array.isArray(value?.scenarios) ? value!.scenarios : undefined,
    flowSources: Array.isArray(value?.flowSources) ? value!.flowSources : undefined,
    flowTypes: Array.isArray(value?.flowTypes) ? value!.flowTypes : undefined,
  };
}

function normalizeNode(node: unknown): NodeEntity {
  const value = node as Partial<NodeEntity>;
  return {
    id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
    type: 'node',
    x: Number(value.x ?? 0),
    y: Number(value.y ?? 0),
    width: Number(value.width ?? 140),
    height: Number(value.height ?? 96),
    title: typeof value.title === 'string' ? value.title : 'Node',
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : '',
    fill: typeof value.fill === 'string' ? value.fill : '#1f3f77',
    glowColor: typeof value.glowColor === 'string' ? value.glowColor : '#4d8dff',
    parentAreaId: typeof value.parentAreaId === 'string' ? value.parentAreaId : undefined,
    parentLayout:
      value.parentLayout && typeof value.parentLayout.xRatio === 'number' && typeof value.parentLayout.yRatio === 'number'
        ? { xRatio: value.parentLayout.xRatio, yRatio: value.parentLayout.yRatio }
        : undefined,
    textRotated: value.textRotated === true ? true : undefined,
    icon: typeof value.icon === 'string' ? value.icon : undefined,
    zIndex: Number(value.zIndex ?? 1),
    tags: Array.isArray(value.tags) ? value.tags.filter((t): t is string => typeof t === 'string') : undefined,
  };
}

function normalizeAnchor(value: unknown, fallback: AnchorId): AnchorId {
  if (typeof value === 'string' && isValidAnchorId(value)) {
    return value as AnchorId;
  }
  if (typeof value === 'number') {
    const numericMap: Record<number, AnchorId> = {
      0: 'bottom-0',
      1: 'bottom-1',
      2: 'bottom-2',
      3: 'bottom-3',
      4: 'bottom-4',
    };
    return numericMap[value] ?? fallback;
  }
  if (typeof value === 'string') {
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
    return legacyMap[value] ?? fallback;
  }
  return fallback;
}
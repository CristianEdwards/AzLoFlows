export type EntityType = 'area' | 'node' | 'connector' | 'text' | 'pipe';
export type NodeShape =
  | 'box'
  | 'serverRack'
  | 'card'
  | 'platform'
  | 'browser'
  | 'browser2'
  | 'dashboard'
  | 'storage'
  | 'chartPanel'
  | 'analyticsPanel'
  | 'standingNode';
export type ConnectorStyle = 'solid' | 'dashed' | 'animated';
export type ToolMode = 'select' | 'pan';
export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';
export type LabelAnchorCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export type AnchorId = `${AnchorSide}-${number}`;

export type ScenarioId = string;
export type FlowSource = string;
export type FlowType = string;

export interface PickerDef {
  id: string;
  label: string;
}

export const SCENARIOS: PickerDef[] = [
  { id: 'no-proxy-no-arc', label: 'No Proxy, No Arc' },
  { id: 'proxy-no-arc', label: 'Proxy, No Arc' },
  { id: 'no-proxy-arc', label: 'No Proxy, Arc' },
  { id: 'proxy-arc', label: 'Proxy + Arc' },
];

export const FLOW_SOURCES: PickerDef[] = [
  { id: 'hosts', label: 'Hosts' },
  { id: 'arb', label: 'ARB' },
  { id: 'aks', label: 'AKS' },
  { id: 'vms', label: 'VMs' },
];

export const FLOW_TYPES: PickerDef[] = [
  { id: 'http-non-allowed-https', label: 'HTTP & 3rd party endpoints' },
  { id: 'azure-public-endpoint', label: 'Arc gateway allowed endpoints' },
  { id: 'azure-private-endpoint', label: 'Azure Private Endpoint' },
  { id: 'bypass', label: 'Bypass' },
  { id: 'non-allowed-arc-gw-azure-public', label: 'Non allowed Azure public endpoints' },
];

/** Flow-type IDs to hide for each scenario (e.g. 'bypass' makes no sense without a proxy/arc-gw). */
export const SCENARIO_FLOW_TYPE_EXCLUSIONS: Record<string, string[]> = {
  'no-proxy-no-arc': ['bypass'],
};

/** Flow-type IDs to hide for each traffic source. */
export const SOURCE_FLOW_TYPE_EXCLUSIONS: Record<string, string[]> = {};

export interface SourceDependency {
  source: string;
  requires: string;
  scenarios?: string[];
}

export interface FlowSourceRules {
  mutualExclusionGroups?: string[][];
  dependencies?: SourceDependency[];
}

export const DEFAULT_FLOW_SOURCE_RULES: FlowSourceRules = {
  mutualExclusionGroups: [],
  dependencies: [
    { source: 'arb', requires: 'hosts', scenarios: ['no-proxy-arc', 'proxy-arc'] },
    { source: 'aks', requires: 'hosts', scenarios: ['no-proxy-arc', 'proxy-arc'] },
  ],
};

export interface TagFilter {
  scenario: ScenarioId | null;
  sources: Set<FlowSource>;
  types: Set<FlowType>;
}

/** Return the display label for a flow type, looking up in provided definitions first. */
export function flowTypeLabel(ftId: FlowType, _scenario: ScenarioId | null, flowTypeDefs?: PickerDef[]): string {
  const defs = flowTypeDefs ?? FLOW_TYPES;
  const base = defs.find((f) => f.id === ftId);
  return base?.label ?? ftId;
}

export interface Point {
  x: number;
  y: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface AreaEntity {
  id: string;
  type: 'area';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fill: string;
  borderColor: string;
  glowColor: string;
  locked: boolean;
  fontSize?: number;
  icon?: string;
  labelAnchor?: LabelAnchorCorner;
  zIndex: number;
  tags?: string[];
  notes?: string;
}

export interface NodeEntity {
  id: string;
  type: 'node';
  shape?: NodeShape;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  fill: string;
  glowColor: string;
  icon?: string;
  parentAreaId?: string;
  parentLayout?: {
    xRatio: number;
    yRatio: number;
  };
  textRotated?: boolean;
    textPosition?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    fontSize?: number;
  zIndex: number;
  tags?: string[];
  notes?: string;
}

export interface ConnectorEntity {
  id: string;
  type: 'connector';
  sourceId: string;
  targetId: string;
  sourceAnchor: AnchorId;
  targetAnchor: AnchorId;
  color: string;
  label: string;
  style: ConnectorStyle;
  waypoints: Point[];
  tunnel?: boolean;
  zIndex: number;
  tags?: string[];
  notes?: string;
}

export interface TextEntity {
  id: string;
  type: 'text';
  x: number;
  y: number;
  label: string;
  fontSize: number;
  color: string;
  rotated?: boolean;
  zIndex: number;
  tags?: string[];
  notes?: string;
}

export interface PipeEntity {
  id: string;
  type: 'pipe';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  zIndex: number;
  tags?: string[];
  notes?: string;
}

export const DOCUMENT_VERSION = 1;

export interface DiagramDocument {
  version: number;
  id: string;
  name: string;
  areas: AreaEntity[];
  nodes: NodeEntity[];
  connectors: ConnectorEntity[];
  texts: TextEntity[];
  pipes: PipeEntity[];
  scenarios?: PickerDef[];
  flowSources?: PickerDef[];
  flowTypes?: PickerDef[];
  scenarioFlowTypeExclusions?: Record<string, string[]>;
  sourceFlowTypeExclusions?: Record<string, string[]>;
  flowSourceRules?: FlowSourceRules;
}

/** Return the scenario/flow definitions for a document, falling back to globals. */
export function getDocScenarios(doc: DiagramDocument): PickerDef[] { return doc.scenarios ?? SCENARIOS; }
export function getDocFlowSources(doc: DiagramDocument): PickerDef[] { return doc.flowSources ?? FLOW_SOURCES; }
export function getDocFlowTypes(doc: DiagramDocument): PickerDef[] { return doc.flowTypes ?? FLOW_TYPES; }
export function getDocFlowTypeExclusions(doc: DiagramDocument): Record<string, string[]> { return doc.scenarioFlowTypeExclusions ?? SCENARIO_FLOW_TYPE_EXCLUSIONS; }
export function getDocSourceFlowTypeExclusions(doc: DiagramDocument): Record<string, string[]> { return doc.sourceFlowTypeExclusions ?? SOURCE_FLOW_TYPE_EXCLUSIONS; }
export function getDocFlowSourceRules(doc: DiagramDocument): FlowSourceRules { return doc.flowSourceRules ?? DEFAULT_FLOW_SOURCE_RULES; }

export interface SelectionState {
  type: EntityType | null;
  ids: string[];
}

export interface ToastMessage {
  id: string;
  tone: 'info' | 'success' | 'error';
  message: string;
}
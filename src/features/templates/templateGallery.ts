import { companionPalette, palette } from '@/lib/rendering/tokens';
import type { DiagramDocument } from '@/types/document';
import { DOCUMENT_VERSION } from '@/types/document';
import { createStarterTemplate } from './starterTemplate';

export interface TemplateEntry {
  id: string;
  name: string;
  description: string;
  category: 'getting-started' | 'azure' | 'networking' | 'architecture';
  create: () => DiagramDocument;
}

export const templateGallery: TemplateEntry[] = [
  {
    id: 'starter',
    name: 'Starter Diagram',
    description: '3-tier app with Web, API, and Data Store nodes',
    category: 'getting-started',
    create: createStarterTemplate,
  },
  {
    id: 'hub-spoke',
    name: 'Hub & Spoke Network',
    description: 'Central hub VNET with spoke workload VNETs',
    category: 'networking',
    create: createHubSpokeTemplate,
  },
  {
    id: 'azure-landing-zone',
    name: 'Azure Landing Zone',
    description: 'Management, connectivity, and workload zones',
    category: 'azure',
    create: createAzureLandingZoneTemplate,
  },
  {
    id: 'microservices',
    name: 'Microservices Architecture',
    description: 'API gateway, services, message bus, and database',
    category: 'architecture',
    create: createMicroservicesTemplate,
  },
  {
    id: 'dmz-network',
    name: 'DMZ Network',
    description: 'Public-facing DMZ with internal protected zone',
    category: 'networking',
    create: createDmzTemplate,
  },
  {
    id: 'azure-aks',
    name: 'Azure AKS Cluster',
    description: 'AKS cluster with ingress, services, and node pools',
    category: 'azure',
    create: createAksTemplate,
  },
];

export const templateCategories = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'azure', label: 'Azure' },
  { id: 'networking', label: 'Networking' },
  { id: 'architecture', label: 'Architecture' },
] as const;

/* ── Template factory functions ─────────────────────────── */

function createHubSpokeTemplate(): DiagramDocument {
  const hubAreaId = crypto.randomUUID();
  const spoke1AreaId = crypto.randomUUID();
  const spoke2AreaId = crypto.randomUUID();
  const hubFwId = crypto.randomUUID();
  const spoke1NodeId = crypto.randomUUID();
  const spoke2NodeId = crypto.randomUUID();

  return {
    version: DOCUMENT_VERSION,
    id: crypto.randomUUID(),
    name: 'Hub & Spoke Network',
    areas: [
      { id: hubAreaId, type: 'area', x: -100, y: -80, width: 280, height: 200, label: 'Hub VNET', fill: companionPalette.blue, borderColor: palette.blue, glowColor: palette.blue, locked: false, zIndex: 1, icon: 'VNET' },
      { id: spoke1AreaId, type: 'area', x: -400, y: 60, width: 220, height: 160, label: 'Spoke 1 — Workload', fill: companionPalette.green, borderColor: palette.green, glowColor: palette.green, locked: false, zIndex: 2, icon: 'VNET' },
      { id: spoke2AreaId, type: 'area', x: 260, y: 60, width: 220, height: 160, label: 'Spoke 2 — Data', fill: companionPalette.purple, borderColor: palette.purple, glowColor: palette.purple, locked: false, zIndex: 3, icon: 'VNET' },
    ],
    nodes: [
      { id: hubFwId, type: 'node', x: -30, y: -20, width: 140, height: 96, title: 'Azure Firewall', subtitle: 'Hub', fill: companionPalette.red, glowColor: palette.red, icon: 'Azure Firewall', zIndex: 10 },
      { id: spoke1NodeId, type: 'node', x: -360, y: 100, width: 140, height: 96, title: 'App Service', subtitle: 'Workload', fill: companionPalette.green, glowColor: palette.green, icon: 'AKS', zIndex: 11 },
      { id: spoke2NodeId, type: 'node', x: 300, y: 100, width: 140, height: 96, title: 'SQL Database', subtitle: 'Data tier', fill: companionPalette.purple, glowColor: palette.purple, icon: 'Key Vault', zIndex: 12 },
    ],
    connectors: [
      { id: crypto.randomUUID(), type: 'connector', sourceId: spoke1NodeId, targetId: hubFwId, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.green, label: 'Peering', style: 'animated', waypoints: [], zIndex: 20 },
      { id: crypto.randomUUID(), type: 'connector', sourceId: hubFwId, targetId: spoke2NodeId, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.purple, label: 'Peering', style: 'animated', waypoints: [], zIndex: 21 },
    ],
    texts: [],
    pipes: [],
  };
}

function createAzureLandingZoneTemplate(): DiagramDocument {
  const mgmtAreaId = crypto.randomUUID();
  const connAreaId = crypto.randomUUID();
  const wlAreaId = crypto.randomUUID();

  return {
    version: DOCUMENT_VERSION,
    id: crypto.randomUUID(),
    name: 'Azure Landing Zone',
    areas: [
      { id: mgmtAreaId, type: 'area', x: -400, y: -120, width: 280, height: 280, label: 'Management Zone', fill: companionPalette.blue, borderColor: palette.blue, glowColor: palette.blue, locked: false, zIndex: 1 },
      { id: connAreaId, type: 'area', x: -40, y: -120, width: 280, height: 280, label: 'Connectivity Zone', fill: companionPalette.orange, borderColor: palette.orange, glowColor: palette.orange, locked: false, zIndex: 2 },
      { id: wlAreaId, type: 'area', x: 320, y: -120, width: 280, height: 280, label: 'Workload Zone', fill: companionPalette.green, borderColor: palette.green, glowColor: palette.green, locked: false, zIndex: 3 },
    ],
    nodes: [
      { id: crypto.randomUUID(), type: 'node', x: -360, y: -60, width: 120, height: 80, title: 'Log Analytics', subtitle: 'Monitoring', fill: companionPalette.blue, glowColor: palette.blue, zIndex: 10 },
      { id: crypto.randomUUID(), type: 'node', x: -360, y: 60, width: 120, height: 80, title: 'Key Vault', subtitle: 'Secrets', fill: companionPalette.blue, glowColor: palette.blue, icon: 'Key Vault', zIndex: 11 },
      { id: crypto.randomUUID(), type: 'node', x: 0, y: -60, width: 120, height: 80, title: 'ExpressRoute', subtitle: 'On-prem link', fill: companionPalette.orange, glowColor: palette.orange, icon: 'ExpressRoute', zIndex: 12 },
      { id: crypto.randomUUID(), type: 'node', x: 0, y: 60, width: 120, height: 80, title: 'Firewall', subtitle: 'Network', fill: companionPalette.orange, glowColor: palette.orange, icon: 'Azure Firewall', zIndex: 13 },
      { id: crypto.randomUUID(), type: 'node', x: 360, y: -60, width: 120, height: 80, title: 'AKS Cluster', subtitle: 'Containers', fill: companionPalette.green, glowColor: palette.green, icon: 'AKS', zIndex: 14 },
      { id: crypto.randomUUID(), type: 'node', x: 360, y: 60, width: 120, height: 80, title: 'SQL Server', subtitle: 'Database', fill: companionPalette.green, glowColor: palette.green, zIndex: 15 },
    ],
    connectors: [],
    texts: [
      { id: crypto.randomUUID(), type: 'text', x: -100, y: -180, label: 'Azure Landing Zone Architecture', fontSize: 32, color: '#e7f6ff', zIndex: 50 },
    ],
    pipes: [],
  };
}

function createMicroservicesTemplate(): DiagramDocument {
  const gwId = crypto.randomUUID();
  const svc1Id = crypto.randomUUID();
  const svc2Id = crypto.randomUUID();
  const svc3Id = crypto.randomUUID();
  const busId = crypto.randomUUID();
  const dbId = crypto.randomUUID();

  return {
    version: DOCUMENT_VERSION,
    id: crypto.randomUUID(),
    name: 'Microservices Architecture',
    areas: [
      { id: crypto.randomUUID(), type: 'area', x: -80, y: -40, width: 600, height: 200, label: 'Service Mesh', fill: companionPalette.cyan, borderColor: palette.cyan, glowColor: palette.cyan, locked: false, zIndex: 1 },
    ],
    nodes: [
      { id: gwId, type: 'node', x: -200, y: 40, width: 120, height: 80, title: 'API Gateway', subtitle: 'Entry point', fill: companionPalette.cyan, glowColor: palette.cyan, icon: 'Gateway', zIndex: 10 },
      { id: svc1Id, type: 'node', x: 0, y: -10, width: 120, height: 80, title: 'Auth Service', subtitle: 'Identity', fill: companionPalette.blue, glowColor: palette.blue, zIndex: 11 },
      { id: svc2Id, type: 'node', x: 0, y: 100, width: 120, height: 80, title: 'Order Service', subtitle: 'Business', fill: companionPalette.green, glowColor: palette.green, zIndex: 12 },
      { id: svc3Id, type: 'node', x: 200, y: 40, width: 120, height: 80, title: 'Notification', subtitle: 'Events', fill: companionPalette.orange, glowColor: palette.orange, zIndex: 13 },
      { id: busId, type: 'node', x: 400, y: 40, width: 140, height: 80, title: 'Message Bus', subtitle: 'Async', fill: companionPalette.purple, glowColor: palette.purple, zIndex: 14 },
      { id: dbId, type: 'node', x: 600, y: 40, width: 120, height: 80, title: 'Database', subtitle: 'Persistence', fill: companionPalette.teal, glowColor: palette.teal, zIndex: 15 },
    ],
    connectors: [
      { id: crypto.randomUUID(), type: 'connector', sourceId: gwId, targetId: svc1Id, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.cyan, label: 'Auth', style: 'animated', waypoints: [], zIndex: 20 },
      { id: crypto.randomUUID(), type: 'connector', sourceId: gwId, targetId: svc2Id, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.cyan, label: 'Orders', style: 'animated', waypoints: [], zIndex: 21 },
      { id: crypto.randomUUID(), type: 'connector', sourceId: svc2Id, targetId: svc3Id, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.green, label: 'Events', style: 'dashed', waypoints: [], zIndex: 22 },
      { id: crypto.randomUUID(), type: 'connector', sourceId: svc3Id, targetId: busId, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.purple, label: 'Publish', style: 'animated', waypoints: [], zIndex: 23 },
      { id: crypto.randomUUID(), type: 'connector', sourceId: busId, targetId: dbId, sourceAnchor: 'right-2', targetAnchor: 'left-2', color: palette.teal, label: 'Persist', style: 'solid', waypoints: [], zIndex: 24 },
    ],
    texts: [],
    pipes: [],
  };
}

function createDmzTemplate(): DiagramDocument {
  return {
    version: DOCUMENT_VERSION,
    id: crypto.randomUUID(),
    name: 'DMZ Network',
    areas: [
      { id: crypto.randomUUID(), type: 'area', x: -300, y: -80, width: 240, height: 200, label: 'DMZ (Public)', fill: companionPalette.red, borderColor: palette.red, glowColor: palette.red, locked: false, zIndex: 1 },
      { id: crypto.randomUUID(), type: 'area', x: 40, y: -80, width: 240, height: 200, label: 'App Zone', fill: companionPalette.blue, borderColor: palette.blue, glowColor: palette.blue, locked: false, zIndex: 2 },
      { id: crypto.randomUUID(), type: 'area', x: 380, y: -80, width: 240, height: 200, label: 'Data Zone (Private)', fill: companionPalette.green, borderColor: palette.green, glowColor: palette.green, locked: false, zIndex: 3 },
    ],
    nodes: [
      { id: crypto.randomUUID(), type: 'node', x: -260, y: -20, width: 120, height: 80, title: 'WAF', subtitle: 'Web App FW', fill: companionPalette.red, glowColor: palette.red, icon: 'Azure Firewall', zIndex: 10 },
      { id: crypto.randomUUID(), type: 'node', x: -260, y: 60, width: 120, height: 80, title: 'Load Balancer', subtitle: 'Public LB', fill: companionPalette.red, glowColor: palette.red, zIndex: 11 },
      { id: crypto.randomUUID(), type: 'node', x: 80, y: 0, width: 120, height: 80, title: 'App Service', subtitle: 'Compute', fill: companionPalette.blue, glowColor: palette.blue, zIndex: 12 },
      { id: crypto.randomUUID(), type: 'node', x: 420, y: 0, width: 120, height: 80, title: 'SQL Database', subtitle: 'Private endpoint', fill: companionPalette.green, glowColor: palette.green, icon: 'Private Endpoint', zIndex: 13 },
    ],
    connectors: [],
    texts: [
      { id: crypto.randomUUID(), type: 'text', x: -100, y: -140, label: 'DMZ Network Architecture', fontSize: 28, color: '#e7f6ff', zIndex: 50 },
    ],
    pipes: [],
  };
}

function createAksTemplate(): DiagramDocument {
  const clusterAreaId = crypto.randomUUID();
  return {
    version: DOCUMENT_VERSION,
    id: crypto.randomUUID(),
    name: 'Azure AKS Cluster',
    areas: [
      { id: clusterAreaId, type: 'area', x: -200, y: -100, width: 600, height: 300, label: 'AKS Cluster', fill: companionPalette.cyan, borderColor: palette.cyan, glowColor: palette.cyan, locked: false, zIndex: 1, icon: 'AKS' },
      { id: crypto.randomUUID(), type: 'area', x: -160, y: -40, width: 240, height: 180, label: 'System Node Pool', fill: companionPalette.blue, borderColor: palette.blue, glowColor: palette.blue, locked: false, zIndex: 2 },
      { id: crypto.randomUUID(), type: 'area', x: 160, y: -40, width: 200, height: 180, label: 'User Node Pool', fill: companionPalette.green, borderColor: palette.green, glowColor: palette.green, locked: false, zIndex: 3 },
    ],
    nodes: [
      { id: crypto.randomUUID(), type: 'node', x: -300, y: 40, width: 120, height: 80, title: 'Ingress', subtitle: 'NGINX', fill: companionPalette.orange, glowColor: palette.orange, icon: 'Gateway', zIndex: 10 },
      { id: crypto.randomUUID(), type: 'node', x: -120, y: 0, width: 100, height: 70, title: 'CoreDNS', subtitle: 'System', fill: companionPalette.blue, glowColor: palette.blue, icon: 'DNS', zIndex: 11 },
      { id: crypto.randomUUID(), type: 'node', x: -120, y: 80, width: 100, height: 70, title: 'Metrics', subtitle: 'System', fill: companionPalette.blue, glowColor: palette.blue, zIndex: 12 },
      { id: crypto.randomUUID(), type: 'node', x: 190, y: 0, width: 120, height: 70, title: 'Frontend', subtitle: 'Pod', fill: companionPalette.green, glowColor: palette.green, zIndex: 13 },
      { id: crypto.randomUUID(), type: 'node', x: 190, y: 80, width: 120, height: 70, title: 'Backend API', subtitle: 'Pod', fill: companionPalette.green, glowColor: palette.green, zIndex: 14 },
    ],
    connectors: [],
    texts: [],
    pipes: [],
  };
}

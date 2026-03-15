import { palette, companionPalette } from '@/lib/rendering/tokens';
import type { NodeShape } from '@/types/document';

export interface PaletteShape {
  id: 'area' | 'node' | 'text' | 'pipe' | 'cylinder' | 'monitor' | 'serverRack' | 'diamond' | 'cloud' | 'card';
  title: string;
  /** Inline SVG markup (64×64 viewBox) showing an isometric preview */
  icon: string;
  /** For node-variant shapes, specifies the NodeShape to create */
  nodeShape?: NodeShape;
}

/** Predefined node component with preset title, color & icon. */
export interface ComponentTemplate {
  id: string;
  title: string;
  subtitle: string;
  glowColor: string;
  fill: string;
  icon: string;
}

/* ── Isometric preview icons (64×64 viewBox, dark-theme-friendly) ── */

const areaIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,12 58,26 32,40 6,26" fill="rgba(0,229,255,0.10)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
  <line x1="32" y1="18" x2="32" y2="34" stroke="rgba(0,229,255,0.08)" stroke-width="0.5"/>
  <line x1="19" y1="19" x2="45" y2="33" stroke="rgba(0,229,255,0.08)" stroke-width="0.5"/>
  <line x1="45" y1="19" x2="19" y2="33" stroke="rgba(0,229,255,0.08)" stroke-width="0.5"/>
</svg>`;

const nodeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="10,26 32,38 32,46 10,34" fill="rgba(77,141,255,0.25)" stroke="rgba(77,141,255,0.5)" stroke-width="0.8"/>
  <polygon points="54,26 32,38 32,46 54,34" fill="rgba(77,141,255,0.18)" stroke="rgba(77,141,255,0.4)" stroke-width="0.8"/>
  <polygon points="32,14 54,26 32,38 10,26" fill="rgba(77,141,255,0.35)" stroke="rgba(77,141,255,0.7)" stroke-width="1.2"/>
  <line x1="10" y1="26" x2="32" y2="14" stroke="rgba(77,141,255,0.9)" stroke-width="1.5"/>
</svg>`;

const textIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <text x="32" y="28" fill="rgba(231,246,255,0.85)" font-family="Rajdhani,sans-serif" font-weight="700" font-size="14" text-anchor="middle" dominant-baseline="central" transform="rotate(-15,32,28)">Aa</text>
  <line x1="14" y1="40" x2="50" y2="32" stroke="rgba(231,246,255,0.2)" stroke-width="1" stroke-dasharray="3 2"/>
</svg>`;

const pipeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="10,30 54,30 54,36 10,36" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.3)" stroke-width="0.8" transform="skewY(-6) translate(0,4)"/>
  <polygon points="10,24 54,24 54,30 10,30" fill="rgba(0,229,255,0.03)" stroke="rgba(0,229,255,0.4)" stroke-width="0.8" transform="skewY(-6) translate(0,4)"/>
  <line x1="10" y1="24" x2="10" y2="30" stroke="rgba(0,229,255,0.5)" stroke-width="1" transform="skewY(-6) translate(0,4)"/>
  <line x1="54" y1="24" x2="54" y2="30" stroke="rgba(0,229,255,0.5)" stroke-width="1" transform="skewY(-6) translate(0,4)"/>
</svg>`;

/* ── New shape preview icons ── */

const cylinderIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <ellipse cx="32" cy="20" rx="20" ry="8" fill="rgba(0,229,255,0.30)" stroke="rgba(0,229,255,0.7)" stroke-width="1.2"/>
  <path d="M12,20 L12,40 Q12,48 32,48 Q52,48 52,40 L52,20" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.4)" stroke-width="0.8"/>
  <ellipse cx="32" cy="40" rx="20" ry="8" fill="none" stroke="rgba(0,229,255,0.3)" stroke-width="0.8" stroke-dasharray="2 2"/>
</svg>`;

const monitorIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect x="14" y="8" width="36" height="28" rx="2" fill="rgba(77,141,255,0.30)" stroke="rgba(77,141,255,0.7)" stroke-width="1.2"/>
  <line x1="32" y1="36" x2="32" y2="44" stroke="rgba(77,141,255,0.5)" stroke-width="2"/>
  <line x1="22" y1="44" x2="42" y2="44" stroke="rgba(77,141,255,0.5)" stroke-width="1.5"/>
  <line x1="18" y1="14" x2="46" y2="14" stroke="rgba(77,141,255,0.15)" stroke-width="0.8"/>
  <circle cx="32" cy="33" r="1.5" fill="rgba(77,141,255,0.6)"/>
</svg>`;

const serverRackIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="10,22 32,34 32,50 10,38" fill="rgba(191,90,242,0.18)" stroke="rgba(191,90,242,0.5)" stroke-width="0.8"/>
  <polygon points="54,22 32,34 32,50 54,38" fill="rgba(191,90,242,0.12)" stroke="rgba(191,90,242,0.4)" stroke-width="0.8"/>
  <polygon points="32,10 54,22 32,34 10,22" fill="rgba(191,90,242,0.30)" stroke="rgba(191,90,242,0.7)" stroke-width="1.2"/>
  <line x1="10" y1="27" x2="32" y2="39" stroke="rgba(191,90,242,0.2)" stroke-width="0.6"/>
  <line x1="10" y1="32" x2="32" y2="44" stroke="rgba(191,90,242,0.2)" stroke-width="0.6"/>
  <circle cx="14" cy="25" r="1.2" fill="rgba(0,255,136,0.8)"/>
  <circle cx="14" cy="30" r="1.2" fill="rgba(0,229,255,0.8)"/>
  <circle cx="14" cy="35" r="1.2" fill="rgba(255,171,0,0.8)"/>
</svg>`;

const diamondIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,8 54,24 32,40 10,24" fill="rgba(255,0,102,0.25)" stroke="rgba(255,0,102,0.7)" stroke-width="1.2"/>
  <polygon points="10,24 32,40 32,48 10,32" fill="rgba(255,0,102,0.15)" stroke="rgba(255,0,102,0.4)" stroke-width="0.8"/>
  <polygon points="54,24 32,40 32,48 54,32" fill="rgba(255,0,102,0.10)" stroke="rgba(255,0,102,0.35)" stroke-width="0.8"/>
  <line x1="32" y1="8" x2="10" y2="24" stroke="rgba(255,0,102,0.9)" stroke-width="1.5"/>
</svg>`;

const cloudIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <ellipse cx="26" cy="24" rx="14" ry="10" fill="rgba(0,229,255,0.18)" stroke="rgba(0,229,255,0.5)" stroke-width="0.8"/>
  <ellipse cx="38" cy="22" rx="12" ry="9" fill="rgba(0,229,255,0.22)" stroke="rgba(0,229,255,0.5)" stroke-width="0.8"/>
  <ellipse cx="32" cy="18" rx="10" ry="8" fill="rgba(0,229,255,0.28)" stroke="rgba(0,229,255,0.6)" stroke-width="1"/>
  <path d="M14,28 Q14,36 32,36 Q50,36 50,28" fill="rgba(0,229,255,0.10)" stroke="rgba(0,229,255,0.3)" stroke-width="0.8"/>
</svg>`;

const cardIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,14 56,28 32,42 8,28" fill="rgba(77,141,255,0.22)" stroke="rgba(77,141,255,0.6)" stroke-width="1.2"/>
  <line x1="32" y1="14" x2="56" y2="28" stroke="rgba(77,141,255,0.15)" stroke-width="0.6"/>
  <polygon points="32,14 56,28 32,42 8,28" fill="none" stroke="rgba(77,141,255,0.3)" stroke-width="0.8"/>
  <line x1="20" y1="21" x2="44" y2="35" stroke="rgba(77,141,255,0.25)" stroke-width="0.6"/>
  <polygon points="8,28 32,42 32,45 8,31" fill="rgba(77,141,255,0.08)" stroke="rgba(77,141,255,0.2)" stroke-width="0.5"/>
  <polygon points="56,28 32,42 32,45 56,31" fill="rgba(77,141,255,0.06)" stroke="rgba(77,141,255,0.15)" stroke-width="0.5"/>
  <circle cx="14" cy="24" r="1.2" fill="rgba(77,141,255,0.5)"/>
  <circle cx="18" cy="22" r="1.2" fill="rgba(77,141,255,0.4)"/>
  <circle cx="22" cy="20" r="1.2" fill="rgba(77,141,255,0.3)"/>
</svg>`;

export const paletteShapes: PaletteShape[] = [
  { id: 'area', title: 'Flat Area', icon: areaIcon },
  { id: 'node', title: 'Node',      icon: nodeIcon },
  { id: 'cylinder', title: 'Cylinder', icon: cylinderIcon, nodeShape: 'cylinder' },
  { id: 'monitor',  title: 'Monitor',  icon: monitorIcon,  nodeShape: 'monitor' },
  { id: 'serverRack', title: 'Server Rack', icon: serverRackIcon, nodeShape: 'serverRack' },
  { id: 'diamond',  title: 'Diamond',  icon: diamondIcon,  nodeShape: 'diamond' },
  { id: 'cloud',    title: 'Cloud',    icon: cloudIcon,    nodeShape: 'cloud' },
  { id: 'card',     title: 'Card',     icon: cardIcon,     nodeShape: 'card' },
  { id: 'text', title: 'Text Label', icon: textIcon },
  { id: 'pipe', title: 'Pipe',       icon: pipeIcon },
];

export const colorSwatches = [
  { id: 'cyan', value: palette.cyan, className: 'swatch--cyan' },
  { id: 'pink', value: palette.pink, className: 'swatch--pink' },
  { id: 'green', value: palette.green, className: 'swatch--green' },
  { id: 'darkGreen', value: palette.darkGreen, className: 'swatch--dark-green' },
  { id: 'purple', value: palette.purple, className: 'swatch--purple' },
  { id: 'blue', value: palette.blue, className: 'swatch--blue' },
  { id: 'orange', value: palette.orange, className: 'swatch--orange' },
  { id: 'gold', value: palette.gold, className: 'swatch--gold' },
  { id: 'red', value: palette.red, className: 'swatch--red' },
  { id: 'teal', value: palette.teal, className: 'swatch--teal' },
  { id: 'amber', value: palette.amber, className: 'swatch--amber' },
  { id: 'indigo', value: palette.indigo, className: 'swatch--indigo' },
  { id: 'coral', value: palette.coral, className: 'swatch--coral' },
  { id: 'lime', value: palette.lime, className: 'swatch--lime' },
] as const;

export const textColorSwatches = [
  { id: 'white', value: '#ffffff', className: 'swatch--white' },
  { id: 'black', value: '#0d0d1a', className: 'swatch--black' },
  ...colorSwatches,
] as const;

/** Predefined Azure-themed node templates matching the diagram components. */
export const componentTemplates: ComponentTemplate[] = [
  { id: 'tpl-firewall',         title: 'Corporate Firewall',    subtitle: '', glowColor: palette.red,       fill: companionPalette.red,       icon: 'azureFirewall' },
  { id: 'tpl-firewall-policy',  title: 'Firewall Policy',       subtitle: '', glowColor: palette.red,       fill: companionPalette.red,       icon: 'azureFirewallPolicy' },
  { id: 'tpl-proxy',            title: 'Corporate Proxy',       subtitle: '', glowColor: palette.orange,    fill: companionPalette.orange,    icon: 'proxy' },
  { id: 'tpl-arc-gateway',      title: 'Arc Gateway',           subtitle: '', glowColor: palette.cyan,      fill: companionPalette.cyan,      icon: 'arcGateway' },
  { id: 'tpl-arc-res-bridge',   title: 'Arc Resource Bridge',   subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'svgArcResourceBridge' },
  { id: 'tpl-expressroute',     title: 'ExpressRoute',          subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'expressRoute' },
  { id: 'tpl-aks',              title: 'AKS',                   subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'azureLocalAKS' },
  { id: 'tpl-cluster',          title: 'Azure Local Cluster',   subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'azureLocalCluster' },
  { id: 'tpl-machine',          title: 'Azure Local Machine',   subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'azureLocalMachine' },
  { id: 'tpl-vm',               title: 'VM',                    subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'azureLocalVM' },
  { id: 'tpl-vnet',             title: 'VNET',                  subtitle: '', glowColor: palette.blue,      fill: companionPalette.blue,      icon: 'vnet' },
  { id: 'tpl-lnet',             title: 'LNET',                  subtitle: '', glowColor: palette.purple,    fill: companionPalette.purple,    icon: 'lnet' },
  { id: 'tpl-dns',              title: 'DNS',                   subtitle: '', glowColor: palette.blue,      fill: companionPalette.blue,      icon: 'dns' },
  { id: 'tpl-keyvault',         title: 'Key Vault',             subtitle: '', glowColor: palette.gold,      fill: companionPalette.gold,      icon: 'keyVault' },
  { id: 'tpl-private-endpoint', title: 'Private Endpoint',      subtitle: '', glowColor: palette.teal,      fill: companionPalette.teal,      icon: 'privateEndpoint' },
  { id: 'tpl-internet',         title: 'Internet',              subtitle: '', glowColor: palette.darkGreen, fill: companionPalette.darkGreen, icon: 'svgGlobe' },
  { id: 'tpl-cloud',            title: 'Azure Cloud',           subtitle: '', glowColor: palette.blue,      fill: companionPalette.blue,      icon: 'cloud' },
];
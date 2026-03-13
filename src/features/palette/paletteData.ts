import { palette, companionPalette } from '@/lib/rendering/tokens';

export interface PaletteShape {
  id: 'area' | 'node' | 'text' | 'pipe';
  title: string;
  /** Inline SVG markup (64×64 viewBox) showing an isometric preview */
  icon: string;
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

export const paletteShapes: PaletteShape[] = [
  { id: 'area', title: 'Flat Area', icon: areaIcon },
  { id: 'node', title: 'Node',      icon: nodeIcon },
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
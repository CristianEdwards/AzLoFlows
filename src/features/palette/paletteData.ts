import { palette, companionPalette } from '@/lib/rendering/tokens';
import type { NodeShape } from '@/types/document';

export interface PaletteShape {
  id: 'area' | 'node' | 'standingNode' | 'text' | 'pipe' | 'serverRack' | 'card' | 'platform' | 'browser' | 'browser2' | 'stack' | 'dashboard' | 'gauge' | 'chartPanel' | 'analyticsPanel' | 'database';
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

const standingNodeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="16,30 32,40 32,58 16,48" fill="rgba(77,141,255,0.25)" stroke="rgba(77,141,255,0.5)" stroke-width="0.8"/>
  <polygon points="48,22 32,40 32,58 48,40" fill="rgba(77,141,255,0.18)" stroke="rgba(77,141,255,0.4)" stroke-width="0.8"/>
  <polygon points="32,12 48,22 32,40 16,30" fill="rgba(77,141,255,0.35)" stroke="rgba(77,141,255,0.7)" stroke-width="1.2"/>
  <line x1="16" y1="30" x2="32" y2="12" stroke="rgba(77,141,255,0.9)" stroke-width="1.5"/>
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

const platformIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,22 56,36 32,50 8,36" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.4)" stroke-width="1"/>
  <polygon points="8,36 32,50 32,54 8,40" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.2)" stroke-width="0.5"/>
  <polygon points="56,36 32,50 32,54 56,40" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.15)" stroke-width="0.5"/>
  <line x1="8" y1="36" x2="32" y2="22" stroke="rgba(0,229,255,0.9)" stroke-width="1.5"/>
  <line x1="32" y1="22" x2="56" y2="36" stroke="rgba(0,229,255,0.5)" stroke-width="1"/>
</svg>`;

const laptopIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="12,32 52,32 52,48 12,48" fill="rgba(77,141,255,0.12)" stroke="rgba(77,141,255,0.4)" stroke-width="0.8" transform="skewY(-6) translate(0,2)"/>
  <polygon points="12,16 52,16 52,32 12,32" fill="rgba(77,141,255,0.30)" stroke="rgba(77,141,255,0.7)" stroke-width="1.2" transform="skewY(3) translate(0,4)"/>
  <line x1="12" y1="32" x2="52" y2="32" stroke="rgba(77,141,255,0.5)" stroke-width="1" transform="skewY(-3) translate(0,6)"/>
</svg>`;

const browserIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="28,17 20,13 20,51 28,55" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.3)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 20,13 48,2" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.5)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 28,55 56,44" fill="rgba(0,229,255,0.18)" stroke="rgba(0,229,255,0.6)" stroke-width="1.2"/>
  <line x1="56" y1="12" x2="28" y2="23" stroke="rgba(0,229,255,0.4)" stroke-width="0.8"/>
  <circle cx="53" cy="9" r="1.3" fill="rgba(255,95,87,0.6)"/>
  <circle cx="50" cy="10" r="1.3" fill="rgba(255,189,46,0.6)"/>
  <circle cx="47" cy="11.5" r="1.3" fill="rgba(40,200,64,0.6)"/>
  <polygon points="53,15 31,24 31,27 53,18" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.15)" stroke-width="0.5"/>
  <polygon points="54,20 43,25 43,35 54,30" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.1)" stroke-width="0.4"/>
  <polygon points="41,26 30,31 30,41 41,36" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.1)" stroke-width="0.4"/>
  <polygon points="54,32 43,37 43,43 54,38" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.1)" stroke-width="0.4"/>
  <polygon points="41,38 30,43 30,49 41,44" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.1)" stroke-width="0.4"/>
  <line x1="56" y1="6" x2="56" y2="44" stroke="rgba(0,229,255,0.9)" stroke-width="1.5"/>
</svg>`;

const browser2Icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="28,17 20,13 20,51 28,55" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.3)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 20,13 48,2" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.5)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 28,55 56,44" fill="rgba(0,229,255,0.18)" stroke="rgba(0,229,255,0.6)" stroke-width="1.2"/>
  <line x1="56" y1="12" x2="28" y2="23" stroke="rgba(0,229,255,0.4)" stroke-width="0.8"/>
  <circle cx="53" cy="9" r="1.3" fill="rgba(255,95,87,0.85)"/>
  <circle cx="50" cy="10" r="1.3" fill="rgba(255,189,46,0.85)"/>
  <circle cx="47" cy="11.5" r="1.3" fill="rgba(40,200,64,0.85)"/>
  <polygon points="32,24 40,20 40,33 32,37" fill="rgba(123,127,138,0.2)"/>
  <rect x="33" y="28" width="2" height="8" transform="skewY(23.5) translate(-4,-9)" fill="rgba(96,165,250,0.6)"/>
  <rect x="36" y="27" width="2" height="10" transform="skewY(23.5) translate(-4,-9)" fill="rgba(96,165,250,0.6)"/>
  <rect x="39" y="29" width="2" height="6" transform="skewY(23.5) translate(-4,-9)" fill="rgba(96,165,250,0.6)"/>
  <polygon points="43,20 54,14 54,28 43,34" fill="rgba(123,127,138,0.2)"/>
  <polyline points="44,30 47,26 50,31 53,22 55,27" fill="none" stroke="rgba(74,222,128,0.7)" stroke-width="1"/>
  <polygon points="32,38 39,35 39,42 32,45" fill="rgba(123,127,138,0.2)"/>
  <polygon points="33.5,39 36,37.5 36,41.5 33.5,43" fill="rgba(248,113,113,0.65)"/>
  <polygon points="40,35 47,31 47,39 40,43" fill="rgba(123,127,138,0.2)"/>
  <polygon points="41.5,36 44,34.5 44,38.5 41.5,40" fill="rgba(251,191,36,0.65)"/>
  <polygon points="48,31 55,27 55,36 48,40" fill="rgba(123,127,138,0.2)"/>
  <polygon points="49.5,32.5 52,31 52,35 49.5,36.5" fill="rgba(74,222,128,0.65)"/>
  <line x1="56" y1="6" x2="56" y2="44" stroke="rgba(0,229,255,0.9)" stroke-width="1.5"/>
</svg>`;

const shieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <path d="M32,8 L52,18 L52,34 Q52,48 32,56 Q12,48 12,34 L12,18 Z" fill="rgba(0,255,136,0.18)" stroke="rgba(0,255,136,0.7)" stroke-width="1.2"/>
  <path d="M32,14 L46,22 L46,34 Q46,44 32,50 Q18,44 18,34 L18,22 Z" fill="none" stroke="rgba(0,255,136,0.25)" stroke-width="0.8"/>
  <line x1="32" y1="8" x2="12" y2="18" stroke="rgba(0,255,136,0.9)" stroke-width="1.5"/>
</svg>`;

const hexagonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,8 54,20 54,38 32,50 10,38 10,20" fill="rgba(191,90,242,0.22)" stroke="rgba(191,90,242,0.7)" stroke-width="1.2"/>
  <polygon points="10,38 32,50 32,56 10,44" fill="rgba(191,90,242,0.10)" stroke="rgba(191,90,242,0.3)" stroke-width="0.6"/>
  <polygon points="54,38 32,50 32,56 54,44" fill="rgba(191,90,242,0.08)" stroke="rgba(191,90,242,0.25)" stroke-width="0.6"/>
  <polygon points="32,14 48,24 48,36 32,46 16,36 16,24" fill="none" stroke="rgba(191,90,242,0.2)" stroke-width="0.6"/>
</svg>`;

const stackIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,8 52,18 32,28 12,18" fill="rgba(77,141,255,0.35)" stroke="rgba(77,141,255,0.7)" stroke-width="1"/>
  <polygon points="12,18 32,28 32,32 12,22" fill="rgba(77,141,255,0.15)" stroke="rgba(77,141,255,0.3)" stroke-width="0.5"/>
  <polygon points="52,18 32,28 32,32 52,22" fill="rgba(77,141,255,0.10)" stroke="rgba(77,141,255,0.25)" stroke-width="0.5"/>
  <line x1="12" y1="24" x2="32" y2="34" stroke="rgba(0,229,255,0.6)" stroke-width="1"/>
  <line x1="52" y1="24" x2="32" y2="34" stroke="rgba(0,229,255,0.4)" stroke-width="0.8"/>
  <polygon points="32,16 52,26 32,36 12,26" fill="rgba(77,141,255,0.25)" stroke="rgba(77,141,255,0.5)" stroke-width="0.8" transform="translate(0,14)"/>
  <polygon points="12,26 32,36 32,40 12,30" fill="rgba(77,141,255,0.10)" stroke="rgba(77,141,255,0.2)" stroke-width="0.4" transform="translate(0,14)"/>
  <polygon points="52,26 32,36 32,40 52,30" fill="rgba(77,141,255,0.06)" stroke="rgba(77,141,255,0.15)" stroke-width="0.4" transform="translate(0,14)"/>
</svg>`;

const dashboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="28,17 20,13 20,51 28,55" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.3)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 20,13 48,2" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.5)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 28,55 56,44" fill="rgba(0,229,255,0.16)" stroke="rgba(0,229,255,0.55)" stroke-width="1.2"/>
  <line x1="56" y1="12" x2="28" y2="23" stroke="rgba(0,229,255,0.4)" stroke-width="0.8"/>
  <line x1="56" y1="6" x2="56" y2="44" stroke="rgba(0,229,255,0.9)" stroke-width="1.5"/>
  <circle cx="53" cy="9" r="1.2" fill="rgba(255,95,87,0.5)"/>
  <circle cx="50" cy="10" r="1.2" fill="rgba(255,189,46,0.5)"/>
  <circle cx="47" cy="11.5" r="1.2" fill="rgba(40,200,64,0.5)"/>
  <line x1="48" y1="15" x2="48" y2="47" stroke="rgba(0,229,255,0.2)" stroke-width="0.6"/>
  <polygon points="46,17 38,20 38,28 46,25" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.08)" stroke-width="0.4"/>
  <polygon points="36,22 29,25 29,33 36,30" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.08)" stroke-width="0.4"/>
  <polygon points="46,30 38,33 38,41 46,38" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.08)" stroke-width="0.4"/>
  <polygon points="36,35 29,38 29,46 36,43" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.08)" stroke-width="0.4"/>
  <polygon points="55,15 50,17 50,26 55,24" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.06)" stroke-width="0.3"/>
  <polygon points="55,27 50,29 50,34 55,32" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.06)" stroke-width="0.3"/>
</svg>`;

const databaseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="16" rx="20" ry="7" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <path d="M12,16 v10 A20,7 0 0,0 52,26 v-10" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <path d="M12,26 v10 A20,7 0 0,0 52,36 v-10" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <path d="M12,36 v10 A20,7 0 0,0 52,46 v-10" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
</svg>`;

const gaugeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="32,10 56,24 32,38 8,24" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.15)" stroke-width="0.6"/>
  <polygon points="8,24 32,38 32,44 8,30" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.1)" stroke-width="0.4"/>
  <polygon points="56,24 32,38 32,44 56,30" fill="rgba(0,229,255,0.03)" stroke="rgba(0,229,255,0.08)" stroke-width="0.4"/>
  <ellipse cx="32" cy="24" rx="20" ry="11" fill="none" stroke="rgba(0,229,255,0.12)" stroke-width="5"/>
  <path d="M12,24 A20,11 0 0,1 48,17" fill="none" stroke="rgba(0,229,255,0.7)" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="32" cy="24" rx="12" ry="7" fill="rgba(0,229,255,0.04)" stroke="none"/>
  <text x="32" y="26" fill="rgba(0,229,255,0.6)" font-family="Inter,sans-serif" font-weight="700" font-size="7" text-anchor="middle">72%</text>
  <line x1="8" y1="24" x2="32" y2="10" stroke="rgba(0,229,255,0.9)" stroke-width="1.2"/>
</svg>`;

const chartPanelIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="28,17 20,13 20,51 28,55" fill="rgba(0,229,255,0.08)" stroke="rgba(0,229,255,0.3)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 20,13 48,2" fill="rgba(0,229,255,0.12)" stroke="rgba(0,229,255,0.5)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 28,55 56,44" fill="rgba(0,229,255,0.14)" stroke="rgba(0,229,255,0.50)" stroke-width="1"/>
  <line x1="56" y1="6" x2="56" y2="44" stroke="rgba(0,229,255,0.85)" stroke-width="1.5"/>
  <line x1="56" y1="12" x2="28" y2="23" stroke="rgba(0,229,255,0.12)" stroke-width="0.5"/>
  <polyline points="52,38 47,32 42,35 37,26 32,30 29,27" fill="none" stroke="rgba(0,229,255,0.6)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="42" cy="35" r="1.5" fill="rgba(0,229,255,0.5)"/>
  <circle cx="37" cy="26" r="1.5" fill="rgba(0,229,255,0.5)"/>
  <circle cx="29" cy="27" r="1.5" fill="rgba(0,229,255,0.5)"/>
</svg>`;

const analyticsPanelIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <polygon points="28,17 20,13 20,51 28,55" fill="rgba(77,141,255,0.08)" stroke="rgba(77,141,255,0.3)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 20,13 48,2" fill="rgba(77,141,255,0.12)" stroke="rgba(77,141,255,0.5)" stroke-width="0.6"/>
  <polygon points="56,6 28,17 28,55 56,44" fill="rgba(77,141,255,0.18)" stroke="rgba(77,141,255,0.6)" stroke-width="1.2"/>
  <line x1="56" y1="12" x2="28" y2="23" stroke="rgba(77,141,255,0.4)" stroke-width="0.8"/>
  <circle cx="53" cy="9" r="1.3" fill="rgba(255,95,87,0.6)"/>
  <circle cx="50" cy="10" r="1.3" fill="rgba(255,189,46,0.6)"/>
  <circle cx="47" cy="11.5" r="1.3" fill="rgba(40,200,64,0.6)"/>
  <polyline points="52,40 47,34 42,37 37,28 32,32 29,26" fill="none" stroke="rgba(77,141,255,0.7)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="42" cy="37" r="1.2" fill="rgba(77,141,255,0.5)"/>
  <circle cx="32" cy="32" r="1.2" fill="rgba(77,141,255,0.5)"/>
  <circle cx="29" cy="26" r="1.2" fill="rgba(77,141,255,0.5)"/>
  <line x1="56" y1="6" x2="56" y2="44" stroke="rgba(77,141,255,0.9)" stroke-width="1.5"/>
</svg>`;

export const paletteShapes: PaletteShape[] = [
  { id: 'area', title: 'Flat Area', icon: areaIcon },
  { id: 'node', title: 'Lay-flat Node',      icon: nodeIcon },
  { id: 'standingNode', title: 'Standing Node', icon: standingNodeIcon, nodeShape: 'standingNode' },
  { id: 'serverRack', title: 'Server Rack', icon: serverRackIcon, nodeShape: 'serverRack' },
  { id: 'card',     title: 'Card',     icon: cardIcon,     nodeShape: 'card' },
  { id: 'platform', title: 'Platform', icon: platformIcon, nodeShape: 'platform' },
  { id: 'browser',  title: 'Browser',  icon: browserIcon,  nodeShape: 'browser' },
  { id: 'browser2', title: 'Browser 2', icon: browser2Icon, nodeShape: 'browser2' },
  { id: 'stack',    title: 'Stack',    icon: stackIcon,    nodeShape: 'stack' },
  { id: 'dashboard', title: 'Dashboard', icon: dashboardIcon, nodeShape: 'dashboard' },
  { id: 'database', title: 'Database', icon: databaseIcon, nodeShape: 'database' },
    { id: 'gauge',     title: 'Gauge',     icon: gaugeIcon,     nodeShape: 'gauge' },
  { id: 'chartPanel', title: 'Chart Panel', icon: chartPanelIcon, nodeShape: 'chartPanel' },
  { id: 'analyticsPanel', title: 'Analytics Panel', icon: analyticsPanelIcon, nodeShape: 'analyticsPanel' },
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
  { id: 'tpl-analytics-panel',  title: 'Analytics Panel',       subtitle: '', glowColor: palette.blue,      fill: companionPalette.blue,      icon: 'analyticsPanel' },
];
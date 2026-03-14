export const palette = {
  cyan: '#00e5ff',
  pink: '#ff0066',
  green: '#00ff88',
  darkGreen: '#007744',
  purple: '#bf5af2',
  blue: '#4d8dff',
  orange: '#ff8800',
  gold: '#ffb800',
  red: '#ff3355',
  teal: '#00bfa5',
  amber: '#ffab00',
  indigo: '#536dfe',
  coral: '#ff6e6e',
  lime: '#c6ff00',
} as const;

export const companionPalette = {
  cyan: '#0a4152',
  pink: '#5a1330',
  green: '#0a5a36',
  darkGreen: '#1a8a5a',
  purple: '#4f2b6b',
  blue: '#1f3f77',
  orange: '#5b320f',
  gold: '#5e4710',
  red: '#5b1622',
  teal: '#0a4a42',
  amber: '#5e4200',
  indigo: '#1a2a6b',
  coral: '#5b2222',
  lime: '#3a5200',
} as const;

export const paletteOrder = [
  palette.cyan,
  palette.pink,
  palette.green,
  palette.darkGreen,
  palette.purple,
  palette.blue,
  palette.orange,
  palette.gold,
  palette.red,
  palette.teal,
  palette.amber,
  palette.indigo,
  palette.coral,
  palette.lime,
];

/** Map a bright glow color → its dark companion fill. */
const _glowToFill: Record<string, string> = {};
const _keys = Object.keys(palette) as (keyof typeof palette)[];
for (const k of _keys) _glowToFill[palette[k]] = companionPalette[k];

export function companionFillForGlow(glow: string): string {
  return _glowToFill[glow] ?? darkenHex(glow, 0.28);
}

/** Tailwind 800-tier colors for light-mode node fills. */
export const palette800 = {
  cyan:      '#155e75',   // cyan-800
  pink:      '#9d174d',   // pink-800
  green:     '#166534',   // green-800
  darkGreen: '#065f46',   // emerald-800
  purple:    '#6b21a8',   // purple-800
  blue:      '#1e40af',   // blue-800
  orange:    '#9a3412',   // orange-800
  gold:      '#92400e',   // amber-800
  red:       '#991b1b',   // red-800
  teal:      '#115e59',   // teal-800
  amber:     '#92400e',   // amber-800
  indigo:    '#3730a3',   // indigo-800
  coral:     '#9f1239',   // rose-800
  lime:      '#3f6212',   // lime-800
} as const;

/** Map a bright glow color → its 800 tone for light-mode fills. */
const _glowTo800: Record<string, string> = {};
for (const k of _keys) _glowTo800[palette[k]] = palette800[k];

export function deepToneForGlow(glow: string): string {
  return _glowTo800[glow] ?? darkenHex(glow, 0.35);
}

export const uiTokens = {
  appBackground: '#020617',       // Slate 950
  panelBackground: 'rgba(15, 23, 42, 0.8)',  // Slate 900
  panelBorder: 'rgba(51, 65, 85, 0.5)',      // Slate 700
  panelShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
  text: '#f8fafc',                // Slate 50
  textMuted: 'rgba(148, 163, 184, 0.7)',     // Slate 400
  selection: '#f8fafc',           // Slate 50
};

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Scale each RGB channel by `factor` (0–1) to produce a darker hex color. */
export function darkenHex(hex: string, factor: number): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const r = Math.round(((value >> 16) & 255) * factor);
  const g = Math.round(((value >> 8) & 255) * factor);
  const b = Math.round((value & 255) * factor);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Lerp each RGB channel toward 255 (white) by `factor` (0 = unchanged, 1 = white). */
export function lightenHex(hex: string, factor: number): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const r = Math.round(((value >> 16) & 255) + (255 - ((value >> 16) & 255)) * factor);
  const g = Math.round(((value >> 8) & 255) + (255 - ((value >> 8) & 255)) * factor);
  const b = Math.round((value & 255) + (255 - (value & 255)) * factor);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
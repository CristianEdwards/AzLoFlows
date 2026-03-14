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
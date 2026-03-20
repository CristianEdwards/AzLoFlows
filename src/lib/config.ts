/* ------------------------------------------------------------------ */
/*  Centralised design-token & magic-number registry for IsoFlows     */
/*  Import from '@/lib/config' instead of hard-coding inline values.  */
/* ------------------------------------------------------------------ */

/* ── Isometric projection (canonical source: iso.ts re-exports) ── */
export const ISO_ANGLE_DEG = -52;
export const ISO_Y_SCALE = 0.5;
export const ISO_SCALE = 1.15;

/* ── Grid ── */
export const GRID_SIZE = 40;

/* ── Entity depth (3-D extrusion height in world units) ── */
export const NODE_DEPTH = 34;
export const PIPE_DEPTH = 28;

/* ── Zoom ── */
export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 0.05;
export const ZOOM_SENSITIVITY = 0.001;
export const DETAIL_ZOOM_THRESHOLD = 0.45;
export const MAX_DPR = 2;

/* ── Interaction ── */
export const SNAP_THRESHOLD = 6;
export const ARROW_NUDGE_FINE = 1;
export const ARROW_NUDGE_COARSE = 40;
export const CONNECTOR_STUB = 20;

/* ── Hit-testing ── */
export const HIT_PADDING = 8;
export const TEXT_HIT_RADIUS = 40;
export const CONNECTOR_HIT_RADIUS = 12;

/* ── Rendering ── */
export const CULL_MARGIN = 120;
export const DEFAULT_FONT_SIZE = 16;
export const NODE_ICON_SCALE = 0.34;
export const AREA_ICON_SCALE = 0.14;

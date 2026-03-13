# AzLoFlows

This repo now contains a modular React and TypeScript scaffold for an isometric diagram editor inspired by the visual language in `azure-local-public-path-dark-flows-v7.html`.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## What is implemented

- Modular Vite + React + TypeScript app shell
- Left palette with draggable area and rectangle shapes
- Isometric canvas with pan, zoom, snap-to-grid, drag-to-move, and selection
- Flat grouping areas rendered as isometric surfaces
- Raised node cards with color styling from the v7 palette
- Bottom-anchored connectors with glow, labels, and animated flow particles
- Right inspector for editing areas, nodes, and connectors
- Toolbar actions for new, save, load, export JSON, export PNG, undo, redo, duplicate, delete, connect selected nodes, present mode
- Local autosave, starter template, toasts, minimap, and layer list

## Architecture

- `src/state`: document state, UI state, undo/redo, and actions
- `src/lib/geometry`: projection, grid snapping, bounds, anchors, and routing
- `src/lib/rendering`: reusable tokens and canvas primitives
- `src/features/canvas/renderers`: background, grid, areas, connectors, nodes, selection, and scene composition
- `src/features/*`: palette, inspector, export helpers, templates, layers
- `src/app`: shell layout and top-level composition

The document stores logical flat coordinates. Projection into isometric screen space only happens during rendering and hit testing, which keeps serialization and editing rules stable.
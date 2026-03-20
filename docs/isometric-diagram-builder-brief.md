# Isometric Diagram Builder Brief

Reference visual source: `azure-local-public-path-dark-flows-v7.html`

This document preserves the original design request and expands it into a reusable build brief for a professional web app.

## Original App Generation Prompt

Create a professional single-page web app for designing isometric architecture diagrams. The visual style should be strongly inspired by the v7 reference page in this repo: dark futuristic canvas, neon-glow accents, glassy UI panels, animated flow connectors, isometric projection, and crisp technical-diagram readability.

Build an interactive web app with these requirements:

### Core purpose

- Users can create isometric diagrams by dragging shapes from a left sidebar onto a central canvas.
- Users can define flat isometric grouping areas/platforms that visually sit under rectangles and act as logical zones or containers.
- Users can place rectangles on top of those areas and assign any color they want from the v7 palette.
- Connectors should match the v7 feel: glowing, animated, routed cleanly, with arrowheads and subtle particle motion.
- Rectangle anchor points for connectors must be on the bottom edge of the rectangles by default.
- The app should feel polished and production-ready, not like a demo.

### Visual direction

- Use a dark background close to deep navy or near-black.
- Use the v7 neon palette as the primary design system:
  - cyan `#00e5ff`
  - pink `#ff0066`
  - green `#00ff88`
  - purple `#bf5af2`
  - blue `#4d8dff`
  - orange `#ff8800`
  - gold `#ffb800`
  - red `#ff3355`
- Include darker companion fills derived from those colors.
- Use isometric grid lines in the background, subtle but always visible.
- Use layered isometric platforms with faint glow and depth.
- Use a modern technical UI aesthetic: glassmorphism panels, soft borders, restrained blur, neon edge highlights.
- Typography should feel intentional and technical, similar to Rajdhani plus Inter or an equivalent pairing.

### App layout

- Left sidebar:
  - draggable shape palette
  - shape categories
  - color swatches from the v7 palette
  - search or filter for shapes
- Center:
  - large isometric canvas with pan and zoom
- Right sidebar or floating inspector:
  - selected object properties
  - fill color
  - label text
  - connector style
  - layer order
  - grouping options
- Top toolbar:
  - new, save, load, export, undo, redo, zoom controls, snap toggle
- Bottom status bar or corner HUD:
  - zoom level, snap state, selected item info

### Shapes and elements

- Flat isometric area or group surface:
  - diamond or parallelogram-like top plane in isometric perspective
  - resizable
  - label support
  - customizable fill and border glow
  - can act as a container or group for rectangles
- Rectangle node:
  - isometric 3D box or raised card matching the v7 style
  - editable title and optional subtitle
  - configurable width and height
  - default connector anchors on the bottom edge
  - optional additional anchors on left, right, and top if enabled later
- Text label or annotation
- Connector tool
- Optional badge or icon support inside rectangles

### Canvas behavior

- Drag shapes from the left palette onto the canvas.
- Snap movement and resize to an isometric grid.
- Support panning with space plus drag or middle mouse.
- Support zoom with mouse wheel and UI controls.
- Support multi-select, marquee select, duplicate, delete, align, distribute, bring forward, send backward.
- Support grouping and ungrouping.
- Allow dragging rectangles into flat areas so they become visually and logically associated with that area.
- Allow users to edit labels inline on canvas.

### Connectors

- Connectors should visually resemble the v7 connector style:
  - glowing neon stroke
  - subtle outer bloom
  - rounded elbow routing or smart orthogonal routing adapted to isometric space
  - arrowheads
  - optional animated flow particles moving along the path
  - optional connector label pills
- Default source and target anchor for rectangles should be bottom anchors.
- Connector routing should avoid overlapping node interiors where possible.
- Support different connector colors from the v7 palette.
- Support connector types:
  - solid
  - dashed
  - animated flow
- Support manual bend points after initial creation.

### Editing and UX

- Smooth drag-and-drop with clear hover and drop indicators.
- Strong selection states with glow outlines.
- Resize handles designed to fit the isometric visual language.
- Undo and redo history.
- Keyboard shortcuts:
  - delete or backspace
  - ctrl or cmd plus z
  - ctrl or cmd plus shift plus z
  - ctrl or cmd plus d
  - ctrl or cmd plus s
- Context menu on right-click for common actions.
- Auto-save to local storage.
- Import and export diagram JSON.
- Export to PNG and SVG.
- Include empty-state guidance for first-time users.

### Professional features to add

- Minimap for large diagrams.
- Layer panel or object list.
- Theme-consistent toast notifications.
- Validation so connectors stay attached when nodes move.
- Optional lock or unlock for grouped areas.
- Optional presentation mode that hides editing chrome.
- Sample starter diagram loaded on first run.
- Accessible contrast and keyboard navigation where practical.
- Responsive behavior so the app works on large desktop and usable tablet widths.

### Technical expectations

- Build with a maintainable modern frontend stack.
- Prefer React plus TypeScript plus a robust canvas or diagram approach, or another suitable architecture if justified.
- Separate rendering logic, diagram state, interaction state, and serialization cleanly.
- Keep the code modular and production-oriented.
- Use a clear design token system for the v7 palette and shared glow and shadow styles.
- Avoid generic flat diagram styling; preserve the distinct isometric neon technical look.
- Make performance good enough for moderately complex diagrams.

### Deliverables

- Fully working web app UI.
- Drag-and-drop shape palette.
- Editable isometric canvas.
- Flat grouping areas.
- Colored rectangles using the v7 palette.
- Bottom-anchored glowing connectors.
- Save, load, and export.
- Polished modern styling.
- Sample data and clean code structure.

Also include:

- a brief explanation of the architecture
- setup and run instructions
- clear component structure
- sample starter diagram data

## Product Requirements Document

### Product

Isometric Diagram Builder is a web app for creating polished isometric technical diagrams with draggable shapes, flat grouping areas, color-controlled rectangles, and animated bottom-anchored connectors styled after the v7 reference.

### Goal

Enable users to build professional isometric infrastructure and flow diagrams quickly, with a strong visual system based on the v7 palette and connector language, while keeping editing intuitive for non-designers.

### Primary users

1. Solution architects creating network and platform diagrams.
2. Technical sellers or consultants preparing presentation-ready visuals.
3. Engineers documenting topology, environments, and flow relationships.

### Core user stories

1. As a user, I can drag shapes from a left palette into an isometric canvas.
2. As a user, I can add flat isometric areas that group related rectangles visually and logically.
3. As a user, I can assign colors to areas, rectangles, and connectors from the v7 palette.
4. As a user, I can connect rectangles with glowing animated connectors whose anchors default to the bottom edge.
5. As a user, I can pan, zoom, snap, align, group, and reorder elements without losing layout precision.
6. As a user, I can save, reopen, and export diagrams for documentation or presentations.
7. As a user, I can edit labels inline and inspect object properties in a side panel.

### Functional requirements

1. Canvas and layout
   - Isometric grid background.
   - Infinite-feeling workspace with bounded camera state.
   - Pan and zoom.
   - Snap-to-isometric-grid toggle.
   - Marquee select and multiselect.
2. Shape library
   - Left sidebar with draggable shapes.
   - Initial shapes: flat grouping area, rectangle node, text label, connector tool, badge or icon node.
   - Search and category filters.
3. Grouping areas
   - Flat isometric surfaces with custom size, fill, border, glow, and label.
   - Can optionally behave as containers for child nodes.
   - Lock and unlock support.
4. Rectangle nodes
   - Isometric raised cards or boxes.
   - Title and optional subtitle.
   - Adjustable size.
   - Color selection from v7 palette.
   - Default connector anchor on bottom edge.
5. Connectors
   - Smart routed connectors with arrowheads.
   - Solid, dashed, and animated-flow variants.
   - Default bottom anchor for rectangles.
   - Manual bend point editing.
   - Connector labels.
   - Connectors remain attached during node movement and resize.
6. Editing
   - Inline text editing.
   - Property inspector for selected item.
   - Bring forward and send backward.
   - Duplicate, delete, group, ungroup.
   - Undo and redo history.
7. Persistence and export
   - Local autosave.
   - Import and export JSON.
   - Export PNG.
   - Export SVG if feasible without losing appearance.
8. Professional features
   - Minimap.
   - Layer or object panel.
   - Starter template diagram.
   - Presentation mode.
   - Toast notifications for save, export, and errors.

### Visual requirements

1. Dark near-black or deep navy background.
2. Neon palette based on:
   - cyan `#00e5ff`
   - pink `#ff0066`
   - green `#00ff88`
   - purple `#bf5af2`
   - blue `#4d8dff`
   - orange `#ff8800`
   - gold `#ffb800`
   - red `#ff3355`
3. Matching darker companion fills for surfaces and cards.
4. Glassmorphism side panels and toolbar.
5. Subtle animated glow, flow particles, and high-contrast selection states.
6. Technical, premium visual tone rather than playful diagramming.

### Non-functional requirements

1. Smooth editing performance with diagrams containing at least 100 nodes and 150 connectors.
2. Autosave without blocking interaction.
3. Responsive down to tablet landscape.
4. Keyboard accessible for primary editing actions.
5. Modular codebase with separable rendering, state, and serialization.

### Success criteria

1. A first-time user can create a basic grouped isometric diagram in under 5 minutes.
2. Connectors remain visually attached and routed correctly during drag and resize.
3. Exported diagrams are presentation-ready without external cleanup.
4. The app preserves the distinct v7 look rather than falling back to generic node-editor visuals.

### Constraints

1. The design must retain the v7-inspired connector look and palette.
2. Bottom anchors are the default connector behavior for rectangles.
3. Grouping areas must be flat isometric planes, not standard 2D containers.
4. The experience should remain professional and clean even with animation enabled.

### Out of scope for v1

1. Real-time multiplayer collaboration.
2. Full icon library marketplace.
3. Role-based permissions.
4. Cloud sync and authentication.
5. Complex custom shape scripting.

### Risks

1. SVG export may not perfectly match advanced glow and filter effects.
2. Isometric routing plus snapping can become complex if manual bend editing is added too early.
3. Canvas rendering performance may degrade if animation is not throttled or layered carefully.

## Implementation Plan

### Recommended stack

1. React plus TypeScript plus Vite.
2. Zustand for app state and undoable document state.
3. dnd-kit for palette drag and drop.
4. Canvas-based rendering with Konva or a custom HTML5 canvas scene layer.
5. Optional SVG or HTML overlay for handles and text editing.
6. Zod for document schema validation.
7. Browser-native download APIs for export flows.

### Why this stack

1. React plus TypeScript keeps UI and inspector workflows maintainable.
2. Zustand is lightweight and works well for editor-style state.
3. Canvas is the right base for glowing isometric rendering and animated connectors.
4. A document schema is necessary for autosave, import and export, and future compatibility.

### High-level architecture

1. App shell
   - top toolbar
   - left palette
   - center editor
   - right inspector
   - optional bottom status bar
2. Document model
   - nodes
   - areas
   - connectors
   - camera
   - selection
   - layers
3. Rendering engine
   - isometric projection utilities
   - grid renderer
   - area renderer
   - node renderer
   - connector renderer
   - selection and handle overlays
4. Interaction engine
   - drag and drop from palette
   - select and multiselect
   - resize
   - connect
   - edit bend points
   - pan and zoom
5. Persistence layer
   - local autosave
   - import and export JSON
   - PNG and SVG export

### Data model

1. `DiagramDocument`
   - `id`
   - `name`
   - `version`
   - `camera`
   - `nodes`
   - `areas`
   - `connectors`
   - `layers`
   - `metadata`
2. `Area`
   - `id`
   - `type: "area"`
   - `x`, `y`, `width`, `height`
   - `fill`
   - `borderColor`
   - `glowColor`
   - `label`
   - `locked`
   - `zIndex`
3. `Node`
   - `id`
   - `type: "rectangle" | "badge" | "text"`
   - `x`, `y`, `width`, `height`
   - `title`
   - `subtitle`
   - `fill`
   - `glowColor`
   - `parentAreaId?`
   - `anchorPolicy`
   - `zIndex`
4. `Connector`
   - `id`
   - `sourceNodeId`
   - `targetNodeId`
   - `sourceAnchor: "bottom"`
   - `targetAnchor: "bottom"`
   - `style: "solid" | "dashed" | "animated"`
   - `color`
   - `label?`
   - `waypoints`
   - `arrowEnd: true`

### Component breakdown

1. `AppShell`
2. `TopToolbar`
3. `ShapePalette`
4. `CanvasViewport`
5. `DiagramCanvas`
6. `Minimap`
7. `InspectorPanel`
8. `LayersPanel`
9. `ToastHost`
10. `EmptyStateOverlay`

### Core utility modules

1. `iso.ts`
   - project flat coordinates into isometric screen coordinates
   - inverse projection for hit testing
2. `grid.ts`
   - snap logic
   - grid intersections
3. `anchors.ts`
   - bottom-edge anchor calculation
   - future left, right, top support
4. `routing.ts`
   - orthogonal or isometric-friendly connector path generation
   - obstacle avoidance basics
5. `renderTokens.ts`
   - palette
   - glow strengths
   - shadows
   - typography tokens
6. `serializer.ts`
   - JSON import and export
   - version migration helpers

### Interaction milestones

1. Phase 1: foundation
   - scaffold app shell
   - establish tokens and palette
   - implement isometric grid and camera
   - define document schema
2. Phase 2: basic editing
   - drag shapes from left menu
   - place and move areas and rectangles
   - selection and inspector
   - autosave
3. Phase 3: connectors
   - bottom anchors
   - routed connectors
   - arrowheads
   - color styles
   - reconnect on node move
4. Phase 4: polish
   - glow effects
   - animated flow particles
   - minimap
   - layers panel
   - context menu
   - keyboard shortcuts
5. Phase 5: export and templates
   - JSON import and export
   - PNG export
   - SVG export
   - starter template
   - presentation mode

### Suggested folder structure

1. `src/app`
2. `src/components`
3. `src/features/canvas`
4. `src/features/palette`
5. `src/features/inspector`
6. `src/features/layers`
7. `src/features/export`
8. `src/state`
9. `src/lib/geometry`
10. `src/lib/rendering`
11. `src/lib/serialization`
12. `src/styles`
13. `src/types`

### Key technical decisions

1. Store document coordinates in flat logical space, not projected screen space.
2. Apply isometric projection only at render and hit-test boundaries.
3. Treat bottom anchors as computed geometry, not hardcoded pixel offsets.
4. Keep connector routing deterministic so save and load produce stable diagrams.
5. Use animation as a render-layer concern, not part of persisted document state.

### Testing plan

1. Unit tests for projection, inverse projection, snap, anchors, and routing.
2. Component tests for inspector edits and selection flows.
3. End-to-end tests for drag and drop, connect, save and load, and export.
4. Visual regression checks for palette and glow states if the stack supports it.

### Acceptance criteria for v1

1. User can drag an area and rectangles onto the canvas.
2. User can recolor them from the v7 palette.
3. User can connect two rectangles with a glowing bottom-anchored connector.
4. Moving either rectangle keeps the connector attached.
5. User can save and reload the same document.
6. User can export a clean PNG.
7. UI feels polished and visually aligned with the v7 reference.

### Recommended delivery order

1. Build the editor shell and document model first.
2. Implement isometric rendering and snap before advanced styling.
3. Add connectors after node movement and selection are stable.
4. Add animation and export only after geometry is reliable.

## Concrete React and TypeScript Scaffold

This is a file-by-file scaffold for the first production-oriented implementation.

### Root files

#### `package.json`

- Vite scripts.
- Dependencies: `react`, `react-dom`, `zustand`, `zod`, `dnd-kit`.
- Dev dependencies: `typescript`, `vite`, `vitest`, `eslint`, `prettier`.

#### `tsconfig.json`

- Strict TypeScript.
- Path aliases for `@/` imports.

#### `vite.config.ts`

- Standard React plus TypeScript config.
- Alias setup for `src`.

#### `index.html`

- Root mount point.
- Font preconnect and font loading for Rajdhani and Inter.

### `src/main.tsx`

- Bootstraps React app.
- Imports global styles and design tokens.

### `src/app/App.tsx`

- Main shell composition.
- Renders toolbar, left palette, editor viewport, right inspector, toast host.

### `src/app/layout/AppShell.tsx`

- Grid layout for the full-screen app.
- Handles responsive panel collapse behavior.

### `src/app/layout/TopToolbar.tsx`

- New, save, load, export, undo, redo, zoom, snap controls.
- Dispatches actions to editor state.

### `src/app/layout/StatusBar.tsx`

- Shows zoom percent, snap status, selection count, cursor coordinates.

### `src/features/palette/ShapePalette.tsx`

- Left menu with draggable shape cards.
- Categories: areas, nodes, labels, connectors, templates.

### `src/features/palette/PaletteSearch.tsx`

- Search and filter UI.

### `src/features/palette/paletteData.ts`

- Defines available shapes and default presets.

### `src/features/canvas/CanvasViewport.tsx`

- Owns pan, zoom, viewport transforms, wheel handling.
- Hosts the render surface and overlays.

### `src/features/canvas/DiagramCanvas.tsx`

- Main render orchestrator.
- Draw order: background, grid, areas, connectors, nodes, selection overlays.

### `src/features/canvas/CanvasOverlay.tsx`

- HTML or SVG overlay for selection handles, inline editing, context menus.

### `src/features/canvas/Minimap.tsx`

- Small map of diagram bounds and current viewport.

### `src/features/canvas/interaction/useCanvasInteractions.ts`

- Central pointer and keyboard interaction hook.
- Selection, drag, resize, connect, pan modes.

### `src/features/canvas/interaction/interactionMachine.ts`

- Mode state for idle, panning, dragging, connecting, marquee, editing.

### `src/features/canvas/renderers/renderScene.ts`

- Shared render pipeline entry point.

### `src/features/canvas/renderers/renderBackground.ts`

- Background fill, vignette, and subtle ambient styling.

### `src/features/canvas/renderers/renderIsoGrid.ts`

- Draws isometric grid lines and grid dots.

### `src/features/canvas/renderers/renderArea.ts`

- Draws flat isometric grouping planes with glow, label, and border.

### `src/features/canvas/renderers/renderNode.ts`

- Draws raised isometric rectangles and badges.
- Supports label and optional subtitle.

### `src/features/canvas/renderers/renderConnector.ts`

- Draws v7-style glowing connectors, label pills, arrowheads, and animated flow particles.

### `src/features/canvas/renderers/renderSelection.ts`

- Selected outlines, handles, hover highlights, and drop previews.

### `src/features/inspector/InspectorPanel.tsx`

- Right-side properties UI.
- Switches by selection type.

### `src/features/inspector/AreaInspector.tsx`

- Fill, glow, border, label, lock, z-index.

### `src/features/inspector/NodeInspector.tsx`

- Title, subtitle, size, fill, glow, parent area.

### `src/features/inspector/ConnectorInspector.tsx`

- Color, style, label, bend points, animation on or off.

### `src/features/layers/LayersPanel.tsx`

- Layer list with reorder, hide, and lock controls.

### `src/features/export/exportDiagram.ts`

- PNG export logic.
- Optional SVG serialization path.

### `src/features/export/importDiagram.ts`

- Load diagram JSON and validate with Zod.

### `src/features/templates/starterTemplate.ts`

- Starter data that demonstrates an area, a few rectangles, and animated connectors.

### `src/state/useEditorStore.ts`

- Zustand store.
- Camera state, selection, tool mode, document, history.

### `src/state/history.ts`

- Undo and redo snapshot logic.

### `src/state/selectors.ts`

- Derived state helpers for selection and viewport information.

### `src/types/document.ts`

- TypeScript interfaces for document entities.

### `src/types/tools.ts`

- Tool modes and interaction enums.

### `src/lib/geometry/iso.ts`

- Isometric projection and inverse projection.

### `src/lib/geometry/grid.ts`

- Snap helpers for the flat logical plane.

### `src/lib/geometry/anchors.ts`

- Bottom-anchor point calculation for rectangles.

### `src/lib/geometry/routing.ts`

- Connector path generation and bend-point normalization.

### `src/lib/geometry/bounds.ts`

- Bounding boxes and hit testing.

### `src/lib/rendering/tokens.ts`

- v7 palette, gradients, shadow tokens, motion values.

### `src/lib/rendering/canvasPrimitives.ts`

- Rounded rects, glow strokes, arrowheads, label pills.

### `src/lib/rendering/particles.ts`

- Flow particle animation helpers.

### `src/lib/serialization/schema.ts`

- Zod schema and document versioning.

### `src/lib/serialization/storage.ts`

- Local storage autosave and restoration helpers.

### `src/lib/serialization/migrations.ts`

- Future-safe version migration utilities.

### `src/styles/globals.css`

- Base reset, app shell, fonts, panel chrome.

### `src/styles/tokens.css`

- CSS custom properties for palette, spacing, shadows, blur, radii.

### `src/styles/editor.css`

- Editor-specific UI styling.

### `src/components/ui/Button.tsx`

- Reusable toolbar and panel button.

### `src/components/ui/ColorSwatch.tsx`

- Palette swatch component using the v7 colors.

### `src/components/ui/GlassPanel.tsx`

- Shared panel shell with blurred background and neon border.

### `src/components/ui/ToastHost.tsx`

- App notifications.

### `src/components/ui/EmptyState.tsx`

- First-run guidance and shortcut hints.

### `src/test`

- Projection, routing, and state tests.

### Build order for the scaffold

1. Create shell, store, and type system.
2. Implement isometric projection, camera, and grid.
3. Add areas and nodes with selection.
4. Add drag and drop from palette.
5. Add bottom-anchor connectors.
6. Add inspector editing, persistence, and export.
7. Add animation, minimap, and presentation polish.

## One-Shot Prompt For Generating The First Working Version

Use this prompt when you want a code generator to build the first complete version in one pass.

```text
Create a production-minded React + TypeScript + Vite web app called Isometric Diagram Builder.

The app should let users create professional isometric diagrams inspired by the visual language of the existing v7 reference page in this repo. Match the overall feel closely: dark futuristic canvas, neon glow accents, layered isometric platforms, animated connectors, glassy side panels, technical typography, and a premium architecture-diagram aesthetic.

Primary requirements:
- Left sidebar with draggable shapes.
- Central isometric canvas with pan, zoom, snap-to-grid, marquee selection, and multi-select.
- Right inspector panel for editing selected object properties.
- Top toolbar with new, save, load, export, undo, redo, zoom controls, and snap toggle.
- Users can create flat isometric grouping areas.
- Users can drag rectangle nodes onto the canvas and onto grouping areas.
- Rectangle nodes can use any color from this palette: `#00e5ff`, `#ff0066`, `#00ff88`, `#bf5af2`, `#4d8dff`, `#ff8800`, `#ffb800`, `#ff3355`.
- Rectangles are rendered as raised isometric boxes or cards.
- Connectors must look like the v7 connectors: glowing, arrowed, cleanly routed, optionally animated with moving flow particles.
- Rectangle connector anchors must default to the bottom edge.
- Connectors should stay attached while nodes move.
- Support connector labels and color variants from the same palette.
- Support local autosave, JSON import and export, PNG export, and a starter template.
- Include a minimap, toast notifications, and a present mode that hides editor chrome.

Technical constraints:
- Use React, TypeScript, and Vite.
- Use Zustand for editor state.
- Use dnd-kit for palette drag and drop.
- Store object positions in flat logical coordinates and apply isometric projection only during rendering and hit testing.
- Organize the code into clear modules for rendering, geometry, interaction, state, and serialization.
- Use strict TypeScript.
- Include a clean, maintainable folder structure.

Implementation details:
- Build a full-screen app shell with left palette, center canvas, right inspector, top toolbar, and bottom status bar.
- Draw the scene using canvas rendering or a justified equivalent.
- Implement reusable isometric projection helpers.
- Implement flat isometric grouping areas with glow borders and labels.
- Implement node rendering with title and optional subtitle.
- Implement bottom anchor calculation for rectangles.
- Implement orthogonal or isometric-friendly connector routing with arrowheads.
- Add animated flow particles for the animated connector style.
- Add keyboard shortcuts for delete, duplicate, undo, redo, and save.
- Add undo and redo history.
- Add starter sample data that demonstrates at least one grouping area, three colored rectangles, and two connectors.

Visual design rules:
- Do not produce a generic node editor.
- Preserve the distinctive v7-inspired dark neon technical look.
- Use glass panels, subtle gradients, layered depth, and restrained motion.
- Keep the canvas readable and presentation-ready.

Deliver the following:
- Full source code.
- Clear file structure.
- Brief explanation of the architecture.
- Setup and run instructions.
```

## Notes For Future Iteration

- Preserve bottom-anchor behavior as the default unless explicitly changed.
- Keep grouping areas flat and platform-like rather than box-like.
- Favor deterministic routing and stable save-and-load behavior over overly clever pathfinding in early versions.
- If visual fidelity and export fidelity conflict, preserve editor fidelity first and improve export incrementally.
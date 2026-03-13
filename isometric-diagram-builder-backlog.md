# Isometric Diagram Builder Backlog

This backlog turns the design brief into a prioritized, GitHub-style implementation queue.

## Epic 1: Core Editor Foundation

### P0 - Scaffold modular editor shell

- Create a Vite + React + TypeScript app shell with top toolbar, left palette, center canvas, right inspector, and status bar.
- Acceptance criteria:
  - App loads without errors.
  - Layout is responsive on desktop and tablet widths.
  - Present mode can hide editor chrome.

### P0 - Define document model and history

- Implement typed entities for areas, nodes, connectors, camera, selection, and toasts.
- Add undo and redo support with immutable snapshots.
- Acceptance criteria:
  - Add, move, delete, duplicate, and edit actions can be undone and redone.

### P0 - Add autosave and import or export JSON

- Persist the current document to local storage.
- Support load and save through JSON files.
- Acceptance criteria:
  - Reload restores the prior document.
  - Exported JSON can be imported back successfully.

## Epic 2: Isometric Rendering System

### P0 - Build isometric projection utilities

- Implement logical-to-screen projection and inverse projection helpers.
- Add snap-to-grid helpers using logical coordinates.
- Acceptance criteria:
  - Dragging and selection remain accurate at different zoom levels.

### P0 - Render background, grid, areas, and nodes

- Draw a dark neon background, isometric grid, flat grouping platforms, and raised node cards.
- Acceptance criteria:
  - Areas render as flat isometric surfaces.
  - Nodes render with visible depth and legible labels.

### P1 - Add hover and resize affordances

- Improve hit targets and resize handles.
- Acceptance criteria:
  - Resize handles align with the isometric visual language.

## Epic 3: Connector System

### P0 - Add bottom-anchor connectors

- Compute bottom anchor points for rectangles.
- Render routed connectors with glow, arrowheads, and labels.
- Acceptance criteria:
  - Connectors stay attached during node movement.
  - Default anchor behavior uses the bottom edge.

### P1 - Add connector editing

- Allow label editing, style switching, and manual bend points.
- Acceptance criteria:
  - Users can switch between solid, dashed, and animated connectors.

### P2 - Improve routing avoidance

- Add light obstacle avoidance around nodes and areas.
- Acceptance criteria:
  - Connector overlaps are reduced in common layouts.

## Epic 4: Palette and Editing Workflow

### P0 - Add draggable shape palette

- Implement drag from the left palette into the canvas.
- Acceptance criteria:
  - Users can add areas and nodes from the palette.

### P1 - Add grouping workflows

- Allow nodes to associate with areas.
- Add lock and unlock behavior for areas.
- Acceptance criteria:
  - Moving an area can optionally move child nodes in a future step.

### P1 - Add keyboard-first editing

- Add delete, duplicate, save, undo, redo, zoom, and multi-select shortcuts.
- Acceptance criteria:
  - Core editor actions work without using the mouse for toolbar buttons.

## Epic 5: Professional Polish

### P1 - Add minimap and layers panel

- Render a simplified overview of diagram bounds.
- Support layer visibility and ordering workflows.
- Acceptance criteria:
  - Users can identify off-screen content and current viewport.

### P1 - Add export PNG and SVG polish

- Ensure exports capture the intended styling.
- Acceptance criteria:
  - PNG export is presentation-ready.
  - SVG export degrades gracefully when filters are unsupported.

### P2 - Add templates and presentation mode refinement

- Add more starter templates and cleaner chrome hiding.
- Acceptance criteria:
  - Present mode focuses on the diagram with minimal distractions.

## Suggested Issue Order

1. Scaffold modular app shell
2. Define document model and history
3. Build isometric projection utilities
4. Render background, grid, areas, and nodes
5. Add draggable shape palette
6. Add bottom-anchor connectors
7. Add autosave and import or export JSON
8. Add export PNG and SVG polish
9. Add minimap and layers panel
10. Add keyboard-first editing
11. Add connector editing
12. Add grouping workflows
13. Improve routing avoidance
14. Add templates and presentation mode refinement
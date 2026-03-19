# Changelog

All notable changes to AzLoFlows will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- ESLint flat config with TypeScript and React Hooks rules
- ARIA accessibility labels for all color swatches and inspector inputs
- `-webkit-backdrop-filter` prefixes for Safari compatibility
- CodeQL security scanning workflow
- CHANGELOG, CODE_OF_CONDUCT

### Fixed
- Dead code in `renderCloud.ts` (buggy `p()` function removed)
- `dangerouslySetInnerHTML` wrapper marked `aria-hidden` in ShapePalette

### Changed
- Moved spec documents to `docs/` folder
- Updated `package.json` with public metadata (homepage, repository, keywords)
- Added Open Graph and Twitter meta tags to `index.html`

### Removed
- 17 stale root-level scripts (patch, rebuild, migrate helpers)
- Legacy `azure-local-public-path-dark-flows-v7.html`

## [1.3.0] — 2025-06-10

### Added
- Predefined scenario picker with manifest-driven loading
- Comprehensive README with feature tables, architecture tree, and keyboard shortcuts
- CI validation pipeline (ESLint, TypeScript, Vite Build, Unit Tests)
- GitHub issue templates and contribution docs (CONTRIBUTING, SECURITY)
- Branch protection rules on `main`

### Fixed
- Empty document now starts with no picker definitions (scenarios, flowSources, flowTypes)
- Scenario/flow pickers reset correctly when creating a new diagram
- Pipe rendering no longer clipped by nodes with lower zIndex
- Standing node hover detection for elevated anchors

### Removed
- Pipe risers and connector elevation features (reverted)

## [1.2.0] — 2025-05-28

### Added
- Context menu max-height dynamically adjusts to viewport
- Full inspector controls in context menu (removed standalone sidebar panel)

### Fixed
- SVG export: server rack renders stacked blades, gaps, and LEDs
- SVG export: face colors match canvas `darkenHex` gradients
- SVG export: standing panels render with correct upward orientation
- SVG export: text/icon position and size for card and standing nodes
- SVG export: connector stubs for standing panels match canvas direction
- Context menu clamped to all viewport edges

### Removed
- NIC (Network Adapter) shape (added then removed in same cycle)
- Standalone Components panel from sidebar

## [1.1.0] — 2025-05-15

### Added
- App version display in toolbar brand block
- Standing panels have anchors on all 4 edges
- Per-waypoint connector elevation

### Fixed
- Card text position persistence and icon size/overlap
- Card text and icon stack clamped within shape boundaries
- Standing node light mode uses `node.fill` instead of darkened deep tone
- Palette panel shape icons mirror to match canvas orientation
- Cache-bust predefined scenario fetches

### Changed
- Renamed `database` shape to `storage` across entire codebase

## [1.0.0] — 2025-05-01

### Added
- Interactive isometric canvas with pan, zoom, and grid snapping
- Shape palette: node, card, area, cloud, diamond, hexagon, cylinder, pipe, connector, text, monitor, laptop, browser, dashboard, chart panel, analytics panel, gauge, server rack
- Multi-select, copy/paste, undo/redo with keyboard shortcuts
- Right-click context menu with color swatches and entity actions
- Layer management panel with drag-to-reorder and visibility toggles
- SVG and PNG export with high-fidelity rendering
- Dark and light mode toggle
- Local storage persistence with version history
- Minimap for large diagrams
- Search dialog for finding entities by label
- GitHub Pages deployment workflow
- Predefined scenario loading from JSON manifests

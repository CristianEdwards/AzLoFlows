# AzLoFlows — Isometric Diagram Builder for Azure Local

[![Validate](https://github.com/CristianEdwards/AzLoFlows/actions/workflows/validate.yml/badge.svg)](https://github.com/CristianEdwards/AzLoFlows/actions/workflows/validate.yml)
[![Deploy](https://github.com/CristianEdwards/AzLoFlows/actions/workflows/deploy.yml/badge.svg)](https://github.com/CristianEdwards/AzLoFlows/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

AzLoFlows is a free, open-source, browser-based isometric diagram builder purpose-built for visualizing **Azure Local** (formerly Azure Stack HCI) network architectures and traffic flows.

It renders infrastructure components — firewalls, proxies, Arc gateways, clusters, VMs, private endpoints, and more — as isometric 3D cards on a dark-themed canvas, connected by animated flow lines representing real network paths. The tool helps IT architects, cloud engineers, and technical decision-makers understand and communicate how traffic moves through Azure Local deployments under different configurations.

> **No sign-up. No server. Runs entirely in your browser.**

![Azure Local Public Path — Proxy + Arc Gateway scenario with all traffic sources and types enabled](docs/screenshot-public-path-proxy-arc.png)

## Live Demo

**Try it now: [https://cristianedwards.github.io/AzLoFlows/](https://cristianedwards.github.io/AzLoFlows/)**

## Why AzLoFlows?

Azure Local deployments involve complex traffic flows across on-premises infrastructure and Azure cloud services. Understanding how traffic routes through proxies, Arc gateways, private endpoints, and public paths is critical for security reviews, architecture decisions, and stakeholder communication.

AzLoFlows solves this by providing:

- **Predefined scenarios** for common Azure Local architectures (Public Path, Private Path) — load a complete diagram in one click
- **Interactive filtering** — toggle scenarios (proxy/no-proxy, with/without Arc) and traffic sources (Hosts, ARB, AKS, VMs) to see exactly which flows are affected
- **A general-purpose isometric diagramming tool** — build custom diagrams for any cloud architecture, not just Azure Local
- **Export-ready output** — PNG, SVG, JSON, and interactive HTML exports for documentation, presentations, and Visio alternatives

## Features

### Isometric Canvas

- Pan, zoom, snap-to-grid, and drag-to-move editing on an isometric projection
- Flat grouping areas rendered as isometric surfaces (e.g., "On-Premises", "Azure Cloud")
- Raised node cards with color-coded glow effects and Azure-themed icons
- Connectors with labels, animated flow particles, and routed waypoints
- Pipe entities for representing network segments
- Freely placeable text labels with rotation support

### Scenario-Based Flow Visualization

- **Predefined scenarios**: Load ready-made diagrams for Azure Local Public Path and Private Path architectures
- **Scenario picker**: Toggle between configurations — No Proxy/No Arc, Proxy only, Arc only, Proxy + Arc
- **Traffic source filtering**: Show flows from Hosts, ARB, AKS, VMs, or any combination
- **Traffic type filtering**: Filter by HTTP/third-party endpoints, Arc gateway allowed endpoints, Azure Private Endpoints, bypass routes, and non-allowed Azure public endpoints
- **Tag-based visibility**: Each entity and connector is tagged, so filtering dynamically shows/hides the relevant parts of the diagram

### Diagram Editing

- **Shape palette**: 14 shape types — flat area, node, standing node, server rack, card, platform, browser, dashboard, storage, chart panel, analytics panel, text label, and pipe
- **Component templates**: Pre-configured Azure node types (Firewall, Proxy, Arc Gateway, AKS, VMs, VNET, DNS, Key Vault, Private Endpoint, etc.)
- **Inspector panel**: Edit properties — color, label, subtitle, size, icon, tags, notes, and anchors
- **Layers panel**: Reorder and manage entity draw order with type filtering
- **Connectors**: Connect nodes via anchor points with animated dashed or solid lines and flow direction
- **Snap alignment guides**: Smart snapping when dragging entities near each other
- **Undo/redo**: Full history stack with Ctrl+Z / Ctrl+Shift+Z
- **Minimap**: Quick navigation overlay for large diagrams
- **Search**: Find entities by name (Ctrl+F)

### Export & Persistence

| Format | Description |
|--------|-------------|
| **PNG** | Raster export with preview dialog, download, or Save As |
| **SVG** | Vector export preserving isometric rendering, glow effects, and flow animations |
| **JSON** | Full document serialization for sharing, version control, and backup |
| **Interactive HTML** | Self-contained HTML file with embedded diagram and scenario controls |
| **Auto-save** | Diagrams persist to browser localStorage automatically |
| **Present mode** | Hide all UI for clean full-screen presentations (Ctrl+P) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save to browser storage |
| Ctrl+Z / Ctrl+Shift+Z | Undo / Redo |
| Ctrl+C / Ctrl+V | Copy / Paste |
| Ctrl+D | Duplicate selection |
| Delete | Delete selection |
| Ctrl+0 | Fit diagram to screen |
| Ctrl+1 | Zoom to 100% |
| Ctrl+F | Search entities |
| Ctrl+P | Toggle present mode |
| Arrow keys | Nudge selection (Shift for larger steps) |
| Space+Drag | Pan canvas |
| ? | Toggle shortcut help |

### Theming

- Dark and light theme toggle
- Glassmorphic UI panels with blur and glow effects
- 14 pre-defined color swatches

## Getting Started

### Use Online

Open the [live demo](https://cristianedwards.github.io/AzLoFlows/) — no installation required. Your diagrams save to your browser's localStorage.

### Run Locally

```bash
git clone https://github.com/CristianEdwards/AzLoFlows.git
cd AzLoFlows
npm install
npm run dev          # http://localhost:8125/AzLoFlows/
```

### Build for Production

```bash
npm run build        # TypeScript check + Vite build → dist/
npm run preview      # Preview the production build locally
npm test             # Run unit tests (Vitest)
```

## Architecture

```
src/
├── app/                  # Shell layout (AppShell, TopToolbar, StatusBar)
├── components/ui/        # Shared UI components (Button, ErrorBoundary, Toast)
├── features/
│   ├── canvas/           # CanvasViewport, ContextMenu, Minimap, overlays
│   │   └── renderers/    # Shape renderers (node, area, pipe, connector, etc.)
│   ├── export/           # PNG, SVG, JSON, HTML export logic
│   ├── inspector/        # Property editor panel
│   ├── layers/           # Layer ordering panel
│   ├── palette/          # Shape palette and component templates
│   ├── scenarios/        # Predefined scenario picker and toolbar
│   └── templates/        # Starter templates and gallery
├── lib/
│   ├── geometry/         # Isometric projection, grid, bounds, routing, anchors
│   ├── icons/            # Azure-themed SVG node icons
│   ├── rendering/        # Design tokens and canvas primitives
│   └── serialization/    # Document storage and normalization
├── state/                # Zustand store (document, UI, undo/redo, actions)
├── styles/               # Global CSS with dark/light theme tokens
└── types/                # TypeScript type definitions
```

**Key design decision**: The document stores logical flat coordinates. Projection into isometric screen space only happens during rendering and hit testing, keeping serialization and editing rules stable regardless of visual perspective.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.8 (strict mode) |
| State | Zustand 5.0 |
| Rendering | Canvas 2D API with custom isometric projection |
| Build | Vite 6 |
| Tests | Vitest 3 |
| CI/CD | GitHub Actions (lint, type-check, build, test) |
| Hosting | GitHub Pages |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, coding conventions, and pull request guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting and security considerations.

## License

[MIT](LICENSE) — free for personal and commercial use.
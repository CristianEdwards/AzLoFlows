# Contributing to AzLoFlows

Thank you for your interest in contributing to AzLoFlows! This document provides
guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Start the dev server: `npm run dev`

## Development Workflow

### Branching

- Create a `Release` branch from `main` for your work
- Open a pull request targeting `main` when ready
- Do not commit directly to `main`
- Keep branches short-lived to minimise merge conflicts

### Before Submitting a PR

1. **Type-check**: `npx tsc -b`
2. **Build**: `npm run build`
3. **Test**: `npm test`
4. Ensure the CI pipeline passes (ESLint, TypeScript, Vite build, Vitest)

### Pull Request Guidelines

- Include a clear description of the changes and the reason for them
- Reference any related issues (e.g. "Fixes #42")
- Keep PRs focused — one feature or fix per PR

## Project Structure

| Folder | Purpose |
|---|---|
| `src/app/` | App shell and layout |
| `src/components/` | Shared UI components |
| `src/features/` | Feature modules (canvas, export, inspector, etc.) |
| `src/lib/` | Geometry, rendering, serialisation utilities |
| `src/state/` | Zustand store and history |
| `src/types/` | TypeScript type definitions |
| `public/` | Static assets and predefined scenarios |

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Zustand for state management
- No direct DOM manipulation — use canvas rendering pipeline

## Reporting Issues

- Use GitHub [Issues](../../issues) with the provided templates
- Include browser version, OS, and screenshots where possible
- Provide steps to reproduce the problem

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).

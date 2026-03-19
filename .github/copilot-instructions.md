# Copilot Instructions

## Git Operations
- Always use Git CLI commands in the terminal for all git operations.
- Do not use MCP tools or other git integrations such as GitKraken.
- Use `git status` to check the status of your repository before making commits.
- When making updates, use a Release branch and create a pull request to merge
  into main. Do not commit directly to main for feature work.
- Before starting new work, pull the latest changes from main into the Release
  branch to stay up to date (fast-forward merge).
- When creating a pull request, include a clear description of the changes and
  the reason for them.

## Project Conventions
- TypeScript strict mode — all code must pass `tsc -b`.
- Build with `npm run build` (`tsc -b && vite build`) before committing.
- Run tests with `npm test` (vitest) before committing.
- React functional components with hooks only.
- State management via Zustand (`src/state/useEditorStore.ts`).
- Canvas rendering — no direct DOM manipulation for diagram elements.
- Keep rendering logic in `src/features/canvas/renderers/`.
- Keep geometry/math in `src/lib/geometry/`.
- SVG export must match canvas rendering fidelity.

## Version Updates
- When updating the version number, ensure it is updated in `package.json`.
- The version is displayed in the status bar from `package.json`.

## Code Quality
- No `any` types unless absolutely necessary.
- Prefer `const` over `let`.
- Use descriptive variable and function names.
- Keep files focused — one component/renderer per file.

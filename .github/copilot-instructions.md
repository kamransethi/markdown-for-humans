<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan: specs/041-word-navigation-revamp/plan.md
<!-- SPECKIT END -->

## Active Technologies
- TypeScript 5.x, Node.js 18+, TipTap 3.x + `@tiptap/core`, `@tiptap/extension-table-of-contents`, existing FluxFlow services (`src/features/fluxflow/*`), existing webview message bus (`src/shared/messageTypes.ts`) (044-before-specify-hook)
- In-memory UI state in webview + derived workspace metadata from existing FluxFlow index (no new persistent database) (044-before-specify-hook)
- TypeScript 5.x, Node.js 18+ + VS Code Extension API, `sql.js`-backed FluxFlow graph DB, existing webview message bus in `src/shared/messageTypes.ts`, existing FluxFlow services in `src/features/fluxflow/*` (045-foam-graph-view)
- Existing FluxFlow workspace graph DB + in-memory projection state (no new persistent store) (045-foam-graph-view)

## Recent Changes
- 044-before-specify-hook: Added TypeScript 5.x, Node.js 18+, TipTap 3.x + `@tiptap/core`, `@tiptap/extension-table-of-contents`, existing FluxFlow services (`src/features/fluxflow/*`), existing webview message bus (`src/shared/messageTypes.ts`)

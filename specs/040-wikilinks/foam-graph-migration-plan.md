# Foam Graph Migration Plan (Local Flux Flow Index)

## Goal
Bring a Foam-style graph view into Flux Flow Markdown Editor while using local Flux Flow index data (documents, links, placeholders) instead of Foam runtime dependencies.

## Scope
- In scope:
  - Dedicated graph webview panel in the extension host.
  - Local graph data adapter built from Flux Flow index.
  - Node click navigation to files in VS Code/Flux Flow.
  - Style updates and basic type filters.
- Out of scope (initial phase):
  - Write operations from graph to index.
  - Advanced graph analytics.
  - Deep cross-extension interoperability.

## Source Reference (Foam)
- Graph panel lifecycle: `foam/packages/foam-vscode/src/vscode/features/graph-webview/index.ts`
- Webview protocol contract: `foam/packages/foam-graph/src/protocol.ts`
- Graph payload builder pattern: `foam/packages/foam-core/src/services/graph-data-builder.ts`

## Proposed Architecture
1. Extension host panel feature:
   - Add new feature module `src/features/fluxflow/graphWebview.ts`.
   - Register command: `gptAiMarkdownEditor.knowledgeGraph.openGraph`.
   - Create and restore webview panel (serializer-enabled).
2. Shared protocol:
   - Add `src/features/fluxflow/graph/protocol.ts` with typed host↔webview messages:
     - Host -> webview: `didUpdateGraphData`, `didUpdateStyle`, `didSelectNode`.
     - Webview -> host: `webviewDidLoad`, `webviewDidSelectNode`, `error`.
3. Data adapter:
   - Add `src/features/fluxflow/graph/buildGraphData.ts`.
   - Map Flux Flow DB docs + links to graph nodes and links.
   - Include placeholders for unresolved targets.
4. Graph webview client:
   - Add `src/webview/graph/` entry (bundle target) with graph component integration.
   - Render nodes/edges and dispatch selection messages.
5. Live updates:
   - Reuse existing index change hooks to push `didUpdateGraphData` on re-index/watcher events.

## Data Mapping
- Node id: workspace-relative path.
- Node title: indexed title (fallback basename/stem).
- Node type:
  - `note` for markdown docs.
  - `attachment` for non-markdown indexed docs.
  - `placeholder` for unresolved link targets.
- Links:
  - Source: indexed source document.
  - Target:
    - resolved target document id when available,
    - placeholder id when unresolved.

## Delivery Phases
### Phase A: Read-only graph MVP
- Command + panel + protocol.
- Graph data from DB.
- Node click opens file.
- Basic dark/light style sync.

### Phase B: Controls and filtering
- Node type toggles.
- Simple color modes (type/path group).
- Persisted graph view options.

### Phase C: Editor sync and polish
- Active document highlight.
- Hover previews.
- Performance tuning for large vaults.

## Risks and Mitigations
- Large graphs may lag:
  - Mitigation: node/link caps and incremental updates.
- Multi-root identity collisions:
  - Mitigation: prefix ids with workspace hash when needed.
- Divergence from index semantics:
  - Mitigation: graph adapter reads only normalized DB structures.

## Validation
- Unit tests for graph payload builder mapping and placeholder handling.
- Integration checks for node-click navigation behavior.
- Manual testing with multi-root and mixed file types.

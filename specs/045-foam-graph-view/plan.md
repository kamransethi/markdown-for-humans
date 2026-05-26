# Implementation Plan: Workspace-Scoped Graph View

**Folder**: `specs/045-foam-graph-view/plan.md` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)  
**Status**: Draft

## Summary

Deliver a Foam-inspired Graph View that is directly reachable from the editor toolbar, uses workspace-scoped data, and stays consistent with active-note and indexing changes. The implementation builds on the existing FluxFlow graph/index pipeline and extends the current starter graph panel toward production parity while preserving the recently fixed link-resolution behavior validated in stress tests.

Planning inputs include chat history from this feature stream: completed toolbar-to-command wiring, starter panel scaffolding, scope correctness concerns, stale unresolved-target defects, and stress-test DB validation findings.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: VS Code Extension API, `sql.js`-backed FluxFlow graph DB, existing webview message bus in `src/shared/messageTypes.ts`, existing FluxFlow services in `src/features/fluxflow/*`  
**Storage**: Existing FluxFlow workspace graph DB + in-memory projection state (no new persistent store)  
**Testing**: Jest (unit/integration-style extension tests), existing stress corpus regression in `src/features/fluxflow/__tests__/stressTestIndexing.test.ts, Playwright testing for the UX`  
**Project Type**: VS Code extension with webviews  
**Target Platform**: Desktop VS Code (macOS/Windows/Linux)  
**Performance Goals**: Keep panel open/refresh responsive; avoid blocking editor interaction path; preserve indexing budgets already in place  
**Constraints**: TextDocument remains canonical; command discoverability via command palette; scope graph/chat strictly to open workspace folders  
**Scope Notes**: This plan focuses on graph-view parity and scoped projection reliability, not graph editing.

## Constitution Check (Pre-Design)

- Reading experience first: PASS (graph is adjunct navigation; does not degrade prose rendering)
- TDD required: PASS (plan extends regression tests before major renderer migration)
- Performance budgets: PASS (event-driven projection updates and no polling loop)
- VS Code integration: PASS (command palette + toolbar action + canonical TextDocument)
- Simplicity wins: PASS (iterate from current scaffolding instead of replacing indexing stack)
- Styling discipline: PASS (graph panel UI continues theme-token usage)

No constitutional violations identified.

## Research Inputs

Phase 0 decisions and tradeoffs are captured in [research.md](research.md). The research resolves:

- workspace scope projection source of truth
- stale unresolved self-healing strategy
- graph payload contract and lifecycle events
- migration strategy from starter panel to Foam-style graph renderer

## Design Artifacts

- Data model: [data-model.md](data-model.md)
- Interface contract: [contracts/graph-view-contract.md](contracts/graph-view-contract.md)
- Validation quickstart: [quickstart.md](quickstart.md)

## Phases

**Phase 1 - Stabilize Scoped Projection Runtime (US2, US3, US4 foundation)**

- Replace singleton-like KG runtime assumptions with workspace-context registry/projection service.
- Centralize scope filtering for graph payload + graph chat context.
- Preserve/extend stale-target normalization and self-heal path for legacy malformed link targets.
- Files: `src/features/fluxflow/index.ts`, `src/features/fluxflow/events.ts`, `src/features/fluxflow/database.ts`, `src/features/fluxflow/indexer.ts`, `src/activeWebview.ts`
- Tests: extend `src/features/fluxflow/__tests__/stressTestIndexing.test.ts`; add projection scope tests for open-folder filtering.

**Phase 2 - Graph View Host/Protocol Hardening (US1, US3)**

- Evolve starter panel in `graphPanel.ts` to stable host with explicit payload contract and active-note synchronization.
- Ensure toolbar and command-palette routes converge on a single open-graph path.
- Implement resilient empty/error states and refresh-on-index/active-doc events.
- Files: `src/features/fluxflow/graphPanel.ts`, `src/editor/handlers/uiHandlers.ts`, `src/shared/messageTypes.ts`, `src/extension.ts`, `package.json`
- Tests: add host handler tests for command dispatch and payload refresh semantics.

**Phase 3 - Foam-Inspired Renderer Parity (US1 usability + visual interaction)**

- Port/adapt Foam graph-view interaction model (node selection, focus context, navigation affordances) into the extension graph webview shell.
- Keep node click -&gt; open note behavior and active note highlight stable under refresh.
- Files: `src/features/fluxflow/graphPanel.ts` (webview payload + script), optional new renderer helpers under `src/features/fluxflow/` if extraction is needed.
- Tests: renderer behavior tests (payload translation, selection/open-note interaction) and smoke checks for empty/state transitions.

**Phase 4 - End-to-End Regression and Rollout Readiness**

- Validate stress corpus + workspace scope permutations.
- Confirm no regression in unresolved-link semantics and no reintroduction of trailing escape artifacts.
- Files: `src/features/fluxflow/__tests__/stressTestIndexing.test.ts`, new scope/graph integration test files under `src/features/fluxflow/__tests__/`
- Tests: run targeted Jest suites, then `npm run build:debug`.

## Files


| File                                                           | Action | Purpose                                                                    |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `src/shared/messageTypes.ts`                                   | MODIFY | Keep graph-open and graph-refresh protocol explicit and typed              |
| `src/editor/handlers/uiHandlers.ts`                            | MODIFY | Route toolbar Graph View action and preserve command execution consistency |
| `src/features/fluxflow/events.ts`                              | MODIFY | Expand typed event bus for scope/index/selection projection updates        |
| `src/features/fluxflow/graphPanel.ts`                          | MODIFY | Mature starter graph panel into scoped, refresh-safe graph host            |
| `src/activeWebview.ts`                                         | MODIFY | Emit active-document changes used by graph highlighting                    |
| `src/extension.ts`                                             | MODIFY | Register/open graph command and synchronize active markdown URI            |
| `src/features/fluxflow/index.ts`                               | MODIFY | Introduce workspace-context registry and scoped projection wiring          |
| `src/features/fluxflow/indexer.ts`                             | MODIFY | Preserve normalized target extraction for escaped alias cases              |
| `src/features/fluxflow/database.ts`                            | MODIFY | Maintain deterministic resolution + stale target self-healing              |
| `src/features/fluxflow/__tests__/stressTestIndexing.test.ts`   | MODIFY | Guard resolved/unresolved semantics against regressions                    |
| `src/features/fluxflow/__tests__/graphScopeProjection.test.ts` | CREATE | Verify open-folder scope filtering for graph/chat projection               |
| `src/features/fluxflow/__tests__/graphPanelHost.test.ts`       | CREATE | Validate graph panel payload/update/open-note behavior                     |
| `package.json`                                                 | MODIFY | Keep command contributions discoverable and consistent                     |


## Key Risks


| Risk                                    | Cause                                                        | Mitigation                                                                           |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Cross-workspace data leakage            | Registry/scope checks missed in one projection path          | Centralize scope filtering service and unit-test all entry points                    |
| Graph refresh races                     | Concurrent active-doc + index events                         | Coalesce updates and keep last-known snapshot semantics in panel host                |
| Regressing link resolution fixes        | Renderer/payload refactor bypasses normalization assumptions | Keep resolution in DB/index layer and lock with stress regression tests              |
| Performance regressions on large vaults | Full payload rebuild too frequent                            | Debounce event-driven refresh and support incremental payload updates where feasible |


## Implementation Decisions

*Confirm these before coding starts. Reply with your choices or say "all good".*

**Decision 1 - Workspace context model**: should graph/chat state be centralized per workspace root or shared globally with filters?

- [x] **A**: Per-workspace context registry keyed by workspace root hash, with explicit projection merge for multi-root.
- [ ] **B**: Keep global singleton and apply ad hoc filters in each consumer.

- Recommendation: **A** - guarantees scope correctness and removes repeated filtering bugs.

**Decision 2 - Graph payload refresh strategy**: should host push full snapshots or incremental patches first?

- [x] **A**: Start with deterministic full snapshot pushes on significant events, then optimize incrementally.
- [ ] **B**: Implement incremental patch protocol immediately.

- Recommendation: **A** - safer for correctness while renderer behavior is still evolving.

**Decision 3 - Renderer migration path**: how to adopt Foam-inspired behavior without destabilizing host flow?

- [x] **A**: Keep `graphPanel.ts` host contract stable and swap renderer internals behind the same payload interface.
- [ ] **B**: Rewrite panel host and renderer together in one step.

- Recommendation: **A** - minimizes risk and preserves validated command/projection plumbing.

## Constitution Check (Post-Design)

- Reading experience first: PASS
- TDD required: PASS
- Performance budgets: PASS
- VS Code integration: PASS
- Simplicity wins: PASS
- Styling discipline: PASS

No post-design gate failures.
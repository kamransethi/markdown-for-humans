# Implementation Plan: Word-Like Navigation Revamp

**Folder**: `specs/041-word-navigation-revamp/plan.md` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)  
**Status**: Draft -> Approved for task generation

## Summary

Revamp the current TOC-only left pane into a Word-like Navigation panel with three tabs: Headings, References, and Search. The implementation extends the existing outline pipeline in the webview and integrates existing FluxFlow-backed references in the extension host, while adding block-ID-based paragraph search and exact jump behavior. The approach is incremental: first introduce a unified navigation panel state and tab shell, then wire References and Search providers, then harden refresh behavior and fallback UX.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+, TipTap 3.x  
**Primary Dependencies**: `@tiptap/core`, `@tiptap/extension-table-of-contents`, existing FluxFlow services (`src/features/fluxflow/*`), existing webview message bus (`src/shared/messageTypes.ts`)  
**Storage**: In-memory UI state in webview + derived workspace metadata from existing FluxFlow index (no new persistent database)  
**Testing**: Jest (unit/jsdom), Playwright visual flows for navigation tab behavior  
**Project Type**: VS Code extension with webview custom editor  
**Target Platform**: Desktop VS Code (macOS/Windows/Linux)  
**Performance Goals**: Preserve existing editor interaction budgets; tab refresh should stay incremental and debounce-aware  
**Constraints**: Maintain existing message protocol conventions; preserve current heading navigation behavior; avoid editor-thread blocking operations  
**Scope Notes**: Feature replaces current TOC pane behavior in the editor webview, not external viewers

## Constitution Check (Pre-Design)

- Reading experience first: PASS (navigation aids scanning without changing prose rendering)
- TDD required: PASS (plan includes unit + Playwright coverage before implementation completion)
- Performance budgets: PASS (debounced updates and incremental tab refreshes)
- VS Code integration: PASS (TextDocument remains canonical; webview messaging extends existing patterns)
- Simplicity: PASS (extend current TOC/outline and existing references services; avoid new storage layer)
- Styling discipline: PASS (reuse editor CSS variables and existing pane styles)

No constitutional violations identified.

## Research Inputs

Phase 0 research decisions are documented in [research.md](research.md), including:

- block ID strategy for paragraph-level navigation
- references aggregation and fragment-aware rendering
- document-order search result guarantees
- refresh and fallback behavior

## Design Artifacts

- Data model: [data-model.md](data-model.md)
- Interface contracts: [contracts/navigation-panel-contract.md](contracts/navigation-panel-contract.md)
- Implementation verification guide: [quickstart.md](quickstart.md)

## Phases

**Phase 1 - Navigation Panel Foundation (US1 baseline)**

- Build a tabbed navigation shell replacing TOC-only view while preserving heading hierarchy and click-to-jump.
- Introduce shared navigation panel state (active tab, query, selected item, empty/fallback indicators).
- Files: `src/webview/features/tocPane.ts`, `src/webview/editor.ts`, `src/shared/messageTypes.ts`, `src/webview/editor.css`
- Tests: `src/__tests__/webview/ui/tocPane.test.ts` + new webview navigation state unit tests

**Phase 2 - References Tab Integration (US2)**

- Add outgoing/backlink sections with note-level aggregation and fragment context display.
- Extend extension-host handlers to provide panel-ready reference payloads.
- Files: `src/editor/MarkdownEditorProvider.ts`, `src/services/foam-integration.ts`, `src/webview/editor.ts`, `src/webview/features/tocPane.ts`, `src/shared/messageTypes.ts`
- Tests: extension-host data-shaping tests + webview references rendering tests

**Phase 3 - Paragraph Search by Object ID (US3)**

- Add Search tab with document-order results mapped to heading/stored-block IDs.
- Implement exact navigation resolution with explicit fallback when ID resolution fails.
- Files: `src/webview/editor.ts`, `src/webview/features/tocPane.ts`, `src/webview/utils/outline.ts` (or new navigation indexing utility), `src/shared/messageTypes.ts`
- Tests: unit tests for ordering and ID resolution fallback + Playwright search-to-jump scenarios

**Phase 4 - Refresh, Empty States, and Regression Hardening**

- Ensure updates on active-document switch and content mutations across all tabs.
- Finalize empty states, broken reference indicators, and status messaging.
- Files: `src/webview/editor.ts`, `src/webview/features/tocPane.ts`, `src/editor/MarkdownEditorProvider.ts`, `src/webview/editor.css`
- Tests: integration and Playwright visual coverage for all tabs

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/webview/features/tocPane.ts` | MODIFY | Replace TOC-only rendering with tabbed Navigation panel UI/state |
| `src/webview/editor.ts` | MODIFY | Wire tab data providers, navigation dispatch, refresh lifecycle, and fallback handling |
| `src/shared/messageTypes.ts` | MODIFY | Add message types for references/search payloads and navigation actions |
| `src/editor/MarkdownEditorProvider.ts` | MODIFY | Serve references/search data snapshots to webview using existing workspace context |
| `src/services/foam-integration.ts` | MODIFY | Provide aggregated, fragment-aware references shape for panel consumption |
| `src/webview/editor.css` | MODIFY | Style tab strip, lists, empty states, and active result indicators |
| `src/__tests__/webview/ui/tocPane.test.ts` | MODIFY | Validate tab switching, heading rendering, references/search empty states |
| `src/tests/editor/navigationPanelProvider.test.ts` | MODIFY/CREATE | Validate payload generation and refresh trigger behavior |
| `src/__tests__/playwright/navigation-panel.spec.ts` | CREATE | End-to-end visual and interaction tests for all three tabs |

## Key Risks

| Risk | Cause | Mitigation |
|------|-------|-----------|
| Search jumps to stale/missing blocks | Block IDs can become stale during edits | Recompute index on debounced updates, add explicit fallback-to-nearest behavior with user-visible status |
| References tab over-noisy output | Duplicate links/backlinks from repeated mentions | Aggregate by note-level key + keep occurrence counts and fragment summary |
| UI complexity regresses current TOC speed | Additional tabs and rendering paths | Lazy-render inactive tabs, keep list virtualization optional, preserve debounce strategy |
| Message protocol drift between webview and host | New payloads added ad hoc | Define contract in `contracts/navigation-panel-contract.md` and test message shapes |

## Implementation Decisions

**Decision 1 - Search index source**

- [x] A: Build from live TipTap document model (IDs on headings/paragraph blocks), then map to snippets.
- [ ] B: Parse serialized markdown text only and infer positions.
- Recommendation: A, because exact block navigation depends on editor-native positions and IDs.

**Decision 2 - References granularity**

- [x] A: Note-level aggregation with fragment-aware context and occurrence counts.
- [ ] B: Raw per-occurrence rows.
- Recommendation: A, because it matches FR-018/FR-019 and keeps panel scan-friendly.

**Decision 3 - Refresh trigger strategy**

- [x] A: Event-driven updates on active document + debounced editor changes.
- [ ] B: Polling timer for all tabs.
- Recommendation: A, because it aligns with existing architecture and performance constraints.

## Constitution Check (Post-Design)

- Reading experience first: PASS
- TDD required: PASS
- Performance budgets: PASS
- VS Code integration: PASS
- Simplicity: PASS
- Styling discipline: PASS

Post-design review confirms no constitution gate failures.

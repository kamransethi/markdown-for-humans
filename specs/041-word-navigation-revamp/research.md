# Research: Word-Like Navigation Revamp

## Decision 1: Use editor-native block IDs for Search tab targets

- Decision: Search results will be backed by IDs from heading and stored text blocks in the active TipTap document model.
- Rationale: Exact paragraph-level navigation (FR-009 to FR-011, FR-017) requires stable block identity tied to live editor positions.
- Alternatives considered:
  - Parse raw markdown only and infer positions: rejected because inferred offsets are less reliable during live editing.
  - Heading-only search targets: rejected because it does not satisfy paragraph-level navigation requirements.

## Decision 2: Keep references note-level with fragment-aware metadata

- Decision: References tab entries are aggregated by note-level identity and include optional fragment context plus occurrence count.
- Rationale: Meets FR-018 and FR-019 while keeping the list readable for large linked documents.
- Alternatives considered:
  - Render each mention as a separate row: rejected due to duplication and poor scanability.
  - Strip fragment context entirely: rejected because users lose target precision.

## Decision 3: Order search results strictly by document position

- Decision: Search result ordering is derived from document position (`pos`) and rendered top-to-bottom.
- Rationale: Matches explicit clarification and FR-020, and aligns with expected document navigation behavior.
- Alternatives considered:
  - Sort by relevance score: rejected because this can violate strict positional ordering.
  - Sort alphabetically by snippet: rejected because it breaks navigation flow.

## Decision 4: Event-driven refresh with debounce

- Decision: Refresh navigation tab data on active document change and debounced editor updates.
- Rationale: Satisfies FR-013 and FR-014 while preserving editor responsiveness and existing performance constraints.
- Alternatives considered:
  - Polling-based refresh: rejected due to unnecessary work and possible UI jitter.
  - Manual refresh button only: rejected because it fails automatic update requirements.

## Decision 5: Explicit fallback status when exact target resolution fails

- Decision: When a block ID is missing or stale, navigate to nearest valid location and show a status indicator in Search tab.
- Rationale: Required by FR-016 and edge-case handling for stale IDs.
- Alternatives considered:
  - Silent fallback with no status: rejected because users cannot verify what happened.
  - Hard error and no navigation: rejected because it blocks user progress.

## Decision 6: Extend existing TOC pane architecture instead of replacing subsystem

- Decision: Build the Navigation tabs by evolving existing webview pane and message flow (`tocPane.ts`, `editor.ts`, `messageTypes.ts`).
- Rationale: Minimizes risk, preserves known behavior, and aligns with constitution simplicity and VS Code integration principles.
- Alternatives considered:
  - Build a brand-new panel subsystem: rejected as unnecessary complexity for current scope.

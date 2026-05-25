# Tasks: Word-Like Navigation Revamp

**Status**: Complete for v1 local-search delivery

## Closure Summary

- Shipped: tabbed Navigation UI (Headings, References, Search), grouped references, Search-tab-only input, active-file local search, and click-to-navigate result behavior.
- Verified: unit test coverage for pane behavior plus manual end-to-end validation.
- Deferred: replacing remaining scaffolded provider/Playwright placeholders with full automated end-to-end assertions.

**Input**: Design documents from `/specs/041-word-navigation-revamp/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/navigation-panel-contract.md`, `quickstart.md`

**Tests**: Included and required by the spec success criteria (`SC-006`) and plan constitution checks.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`)
- Each task includes an explicit file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish navigation feature scaffolding, protocol constants, and test shells.

- [ ] T001 Create task baseline notes and validation checklist in specs/041-word-navigation-revamp/quickstart.md
- [ ] T002 Add navigation message type constants for context/search/status in src/shared/messageTypes.ts
- [ ] T003 [P] Create Playwright spec scaffold for navigation panel flows in src/__tests__/playwright/navigation-panel.spec.ts
- [ ] T004 [P] Create editor provider test scaffold for navigation payloads in src/tests/editor/navigationPanelProvider.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared navigation state, contracts, and refresh plumbing required by all stories.

**⚠️ CRITICAL**: No user story implementation starts until this phase is complete.

- [ ] T005 Implement `NavigationPanelState` type and tab enums in src/webview/features/tocPane.ts
- [ ] T006 Implement navigation contract payload interfaces in src/webview/features/tocPane.ts
- [ ] T007 Add webview message handlers for `navigationContextResult`, `navigationSearchResult`, and `navigationStatus` in src/webview/editor.ts
- [ ] T008 Implement active-document and debounced-refresh trigger wiring in src/webview/editor.ts
- [ ] T009 [P] Add base navigation panel CSS regions (tab strip, lists, empty states, status rows) in src/webview/editor.css
- [ ] T010 [P] Add foundational unit tests for navigation state transitions in src/__tests__/webview/ui/tocPane.test.ts

**Checkpoint**: Foundation complete; user stories can now proceed independently.

---

## Phase 3: User Story 1 - Navigate By Structure (Priority: P1) 🎯 MVP

**Goal**: Provide Word-like Headings tab with hierarchy and reliable heading navigation.

**Independent Test**: Open a document with nested headings; Headings tab shows ordered hierarchy and each item navigates to correct location.

### Tests for User Story 1

- [ ] T011 [P] [US1] Add heading hierarchy rendering tests in src/__tests__/webview/ui/tocPane.test.ts
- [ ] T012 [P] [US1] Add heading navigation dispatch tests in src/__tests__/webview/ui/tocPane.test.ts
- [ ] T013 [US1] Add Playwright heading-tab navigation scenario in src/__tests__/playwright/navigation-panel.spec.ts

### Implementation for User Story 1

- [ ] T014 [US1] Replace TOC-only shell with 3-tab Navigation shell (Headings default) in src/webview/features/tocPane.ts
- [ ] T015 [US1] Render heading entries with level-based indentation and active marker in src/webview/features/tocPane.ts
- [ ] T016 [US1] Wire heading selection to editor navigation command dispatch in src/webview/editor.ts
- [ ] T017 [US1] Add headings-tab specific styles (selected row, hierarchy spacing, keyboard focus) in src/webview/editor.css

**Checkpoint**: US1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Navigate By Links And Backlinks (Priority: P2)

**Goal**: Deliver References tab with outgoing/backlinks, note-level aggregation, and fragment-aware context.

**Independent Test**: On a document with known links/backlinks, References tab shows both groups with deduplicated note-level rows and navigates correctly.

### Tests for User Story 2

- [ ] T018 [P] [US2] Add provider payload-shaping tests for grouped outgoing/backlinks in src/tests/editor/navigationPanelProvider.test.ts
- [ ] T019 [P] [US2] Add aggregation and fragment-awareness rendering tests in src/__tests__/webview/ui/tocPane.test.ts
- [ ] T020 [US2] Add Playwright references-tab grouped-navigation scenario in src/__tests__/playwright/navigation-panel.spec.ts

### Implementation for User Story 2

- [ ] T021 [US2] Implement aggregated note-level references with fragment and occurrence count in src/services/foam-integration.ts
- [ ] T022 [US2] Implement `navigationContextRequest`/`navigationContextResult` handler path for references in src/editor/MarkdownEditorProvider.ts
- [ ] T023 [US2] Render outgoing/backlink sections and broken-state indicators in src/webview/features/tocPane.ts
- [ ] T024 [US2] Wire reference item click behavior to open-note navigation in src/webview/editor.ts
- [ ] T025 [US2] Add references-tab styles for section headers, metadata, and broken states in src/webview/editor.css

**Checkpoint**: US2 is fully functional and independently testable.

---

## Phase 5: User Story 3 - Paragraph-Level Search Navigation (Priority: P3)

**Goal**: Provide Search tab with strict top-to-bottom results mapped to unique heading/text-block IDs and exact jump behavior.

**Independent Test**: Search term with multiple hits returns ordered paragraph-level results; selecting each item jumps to exact block or explicit fallback status.

### Tests for User Story 3

- [ ] T026 [P] [US3] Add search ordering-by-position tests (`FR-020`) in src/__tests__/webview/ui/tocPane.test.ts
- [ ] T027 [P] [US3] Add exact-target and fallback status tests for block ID navigation in src/__tests__/webview/ui/tocPane.test.ts
- [ ] T028 [US3] Add Playwright search-tab exact-jump and fallback scenarios in src/__tests__/playwright/navigation-panel.spec.ts

### Implementation for User Story 3

- [ ] T029 [US3] Build navigable block index (headings + stored text blocks with unique IDs and positions) in src/webview/editor.ts
- [ ] T030 [US3] Implement `navigationSearchRequest`/`navigationSearchResult` flow with strict `pos` ordering in src/webview/editor.ts
- [ ] T031 [US3] Render Search tab list with snippets and block IDs in src/webview/features/tocPane.ts
- [ ] T032 [US3] Implement exact block navigation plus fallback-to-nearest status signaling in src/webview/editor.ts
- [ ] T033 [US3] Add search-tab styles for snippet highlighting, result rows, and status notices in src/webview/editor.css

**Checkpoint**: US3 is fully functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across all tabs, docs, and regression checks.

- [ ] T034 [P] Add end-to-end empty-state coverage across Headings/References/Search in src/__tests__/playwright/navigation-panel.spec.ts
- [ ] T035 [P] Add debounced refresh and active-document-switch regression tests in src/tests/editor/navigationPanelProvider.test.ts
- [ ] T036 Validate quickstart scenarios and update verification notes in specs/041-word-navigation-revamp/quickstart.md
- [ ] T037 Run and document full verification commands in specs/041-word-navigation-revamp/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: starts immediately.
- **Phase 2 (Foundational)**: depends on Phase 1 and blocks all story work.
- **Phase 3 (US1)**: depends on Phase 2.
- **Phase 4 (US2)**: depends on Phase 2; can run independently of US1 once foundation is ready.
- **Phase 5 (US3)**: depends on Phase 2; can run independently of US1/US2 once foundation is ready.
- **Phase 6 (Polish)**: depends on completion of targeted user stories.

### User Story Dependencies

- **US1 (P1)**: no dependency on US2/US3.
- **US2 (P2)**: no dependency on US1/US3.
- **US3 (P3)**: no dependency on US1/US2.

### Within Each User Story

- Tests first, then implementation.
- Data shaping/indexing before UI rendering.
- Navigation dispatch and fallback handling before story closeout.

---

## Parallel Opportunities

- Phase 1 tasks `T003` and `T004` can run in parallel.
- Phase 2 tasks `T009` and `T010` can run in parallel after message/state scaffolding.
- In US1, `T011` and `T012` can run in parallel.
- In US2, `T018` and `T019` can run in parallel.
- In US3, `T026` and `T027` can run in parallel.
- After Phase 2, US1/US2/US3 can be staffed in parallel.

### Parallel Example: User Story 2

```bash
# Parallel test authoring
Task: "T018 [US2] Add provider payload-shaping tests in src/tests/editor/navigationPanelProvider.test.ts"
Task: "T019 [US2] Add aggregation and fragment-awareness rendering tests in src/__tests__/webview/ui/tocPane.test.ts"

# Parallel UI/data work after tests are in place
Task: "T021 [US2] Implement aggregated note-level references in src/services/foam-integration.ts"
Task: "T025 [US2] Add references-tab styles in src/webview/editor.css"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) and validate heading navigation behavior.
3. Demo/release MVP with Headings tab baseline.

### Incremental Delivery

1. Add US2 (References tab) with aggregation and fragment context.
2. Add US3 (Search tab) with strict document-order block jumps.
3. Finish Phase 6 hardening and regression validation.

### Team Parallelization

1. Team aligns on Phase 1-2 shared foundation.
2. Split into three tracks after checkpoint:
   - Engineer A: US1
   - Engineer B: US2
   - Engineer C: US3
3. Merge for Phase 6 polish and final test run.

---

## Notes

- All tasks follow the required checklist format: checkbox, Task ID, optional `[P]`, optional `[USx]`, explicit path.
- Story phases are independently testable by design.
- Avoid cross-story file contention by sequencing high-touch files (`src/webview/editor.ts`, `src/webview/features/tocPane.ts`) carefully during parallel work.

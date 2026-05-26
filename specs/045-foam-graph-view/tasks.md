# Tasks: Workspace-Scoped Graph View

**Input**: Design documents from `/specs/045-foam-graph-view/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: TDD-first sequencing is required for this feature. For every user story phase, write tests first and confirm they fail before implementing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare reusable test harnesses and protocol scaffolding used across all stories.

- [x] T001 Add graph message contract type stubs aligned to `contracts/graph-view-contract.md` in src/shared/messageTypes.ts
- [x] T002 [P] Create reusable graph projection test fixtures in src/features/fluxflow/__tests__/graphTestUtils.ts
- [x] T003 [P] Create graph panel host webview test harness helpers in src/features/fluxflow/__tests__/graphPanelTestUtils.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core runtime scope/projection/event infrastructure that MUST be complete before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests First (RED)

- [x] T004 [P] Add RED scope-filter regression tests for graph projection in src/features/fluxflow/__tests__/graphScopeProjection.test.ts
- [x] T005 [P] Add RED malformed-target normalization regressions in src/features/fluxflow/__tests__/stressTestIndexing.test.ts
- [x] T006 [P] Add RED host/webview message-contract tests for graph:init/graph:update/graph:error and graph:open-note/graph:refresh in src/features/fluxflow/__tests__/graphPanelHost.test.ts

### Implementation

- [x] T007 Implement workspace-context registry and merged projection builder in src/features/fluxflow/index.ts
- [x] T008 [P] Implement typed scope/index/active refresh event primitives in src/features/fluxflow/events.ts
- [x] T009 [P] Apply centralized open-workspace scope filtering to Graph Chat retrieval context in src/features/fluxflow/graphChat.ts
- [x] T010 Preserve deterministic unresolved self-healing and normalized target resolution paths in src/features/fluxflow/database.ts
- [x] T011 Preserve escaped-alias/target normalization during link extraction in src/features/fluxflow/indexer.ts
- [x] T012 Wire active markdown URI change publication for graph highlight updates in src/activeWebview.ts

**Checkpoint**: Foundation ready; user story implementation can now proceed.

---

## Phase 3: User Story 1 - Open and Use Graph View From Editor (Priority: P1) 🎯 MVP

**Goal**: Users can open Graph View from toolbar/command palette and navigate by selecting nodes.

**Independent Test**: Open a markdown file, launch Graph View from toolbar, then click a node and verify the corresponding note opens.

### Tests for User Story 1 (TDD First) ⚠️

- [x] T013 [P] [US1] Add RED command routing test ensuring toolbar and command palette invoke the same graph command in src/__tests__/graphViewCommandRouting.test.ts
- [x] T014 [P] [US1] Add RED graph node selection test ensuring graph:open-note opens the URI in src/features/fluxflow/__tests__/graphPanelHost.test.ts

### Implementation for User Story 1

- [x] T015 [P] [US1] Contribute/align Graph View command and title toolbar action wiring in package.json
- [x] T016 [P] [US1] Route toolbar Graph View action to unified command execution in src/editor/handlers/uiHandlers.ts
- [x] T017 [US1] Register and dispatch unified graph-open command path in src/extension.ts
- [x] T018 [US1] Implement graph:open-note handling and note-open dispatch in src/features/fluxflow/graphPanel.ts
- [x] T019 [US1] Implement graph empty-state payload/render handling for zero-note workspaces in src/features/fluxflow/graphPanel.ts

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Keep Graph and Chat Scoped to Open Workspace Folders (Priority: P1)

**Goal**: Graph View and Graph Chat only surface notes from currently open workspace folders.

**Independent Test**: Index multiple folders, open a subset in VS Code, and verify graph/chat outputs only include open-folder content.

### Tests for User Story 2 (TDD First) ⚠️

- [x] T020 [P] [US2] Add RED multi-root include/exclude scope tests in src/features/fluxflow/__tests__/graphScopeProjection.test.ts
- [x] T021 [P] [US2] Add RED graph chat scope-enforcement tests in src/features/fluxflow/__tests__/graphChatScope.test.ts

### Implementation for User Story 2

- [x] T022 [US2] Enforce open-folder pruning in workspace projection assembly in src/features/fluxflow/index.ts
- [x] T023 [US2] Enforce workspace-scope filtering before graph payload postMessage in src/features/fluxflow/graphPanel.ts
- [x] T024 [US2] Consume centralized workspace scope registry for chat retrieval in src/features/fluxflow/graphChat.ts
- [x] T025 [US2] Trigger scope refresh on workspace-folder add/remove events in src/extension.ts

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Keep Graph State Current After Note Changes (Priority: P2)

**Goal**: Graph relationships and active-node highlighting refresh automatically after saves and active-note changes.

**Independent Test**: Edit links in a note, save, and confirm graph updates and active highlight changes without reopening the panel.

### Tests for User Story 3 (TDD First) ⚠️

- [x] T026 [P] [US3] Add RED graph host refresh lifecycle tests for index_changed and active_document_changed events in src/features/fluxflow/__tests__/graphPanelHost.test.ts
- [x] T027 [P] [US3] Add RED link-edit save-refresh integration tests in src/features/fluxflow/__tests__/graphRefreshOnSave.test.ts

### Implementation for User Story 3

- [x] T028 [US3] Emit index_changed refresh events after index/update flows in src/features/fluxflow/index.ts
- [x] T029 [US3] Coalesce graph:update snapshot pushes and active-node highlighting updates in src/features/fluxflow/graphPanel.ts
- [x] T030 [US3] Publish active-document change events and consume them in graph refresh pipeline in src/activeWebview.ts
- [x] T031 [US3] Implement graph:refresh request handling with deterministic full snapshot rebuild in src/features/fluxflow/graphPanel.ts

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: User Story 4 - Preserve Meaningful Unresolved Placeholders (Priority: P3)

**Goal**: Keep unresolved placeholders only for truly missing notes while eliminating malformed unresolved artifacts.

**Independent Test**: Run stress corpus and verify intentional missing links remain unresolved while malformed unresolved values are not emitted.

### Tests for User Story 4 (TDD First) ⚠️

- [x] T032 [P] [US4] Add RED stress-corpus assertions for intentional unresolved vs malformed unresolved targets in src/features/fluxflow/__tests__/stressTestIndexing.test.ts
- [x] T033 [P] [US4] Add RED payload-invariant tests rejecting malformed unresolved node titles/targets in src/features/fluxflow/__tests__/graphPanelHost.test.ts

### Implementation for User Story 4

- [x] T034 [US4] Restrict unresolved placeholder creation to truly missing scoped references in src/features/fluxflow/database.ts
- [x] T035 [US4] Normalize projected GraphNode target/title values before payload emission in src/features/fluxflow/indexer.ts
- [x] T036 [US4] Enforce graph payload invariants before posting graph:update to webview in src/features/fluxflow/graphPanel.ts

**Checkpoint**: User Story 4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cross-story quality checks.

- [x] T037 [P] Update feature acceptance checklist for SC-001 to SC-005 in specs/045-foam-graph-view/checklists/requirements.md
- [x] T038 [P] Record end-to-end validation outcomes and command evidence in specs/045-foam-graph-view/validation-report.md
- [x] T039 Run build and targeted regression commands from specs/045-foam-graph-view/quickstart.md and document any remediation in specs/045-foam-graph-view/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phases 3-6 (User Stories)**: Depend on Phase 2 completion.
- **Phase 7 (Polish)**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories.
- **US2 (P1)**: Starts after Foundational; independent from US1, but shares projection/runtime infrastructure.
- **US3 (P2)**: Starts after Foundational; can proceed after US1 host path is available.
- **US4 (P3)**: Starts after Foundational; depends on established index/database normalization paths, not on US1-US3 completion.

### Execution Graph

- Setup -> Foundational -> {US1, US2, US3, US4} -> Polish
- Recommended priority order for incremental delivery: US1 -> US2 -> US3 -> US4

### Within Each User Story

- Tests MUST be authored first and fail (RED) before implementation.
- Runtime/data model changes before host/payload wiring.
- Host/payload wiring before UI behavior validation.
- Story must pass its independent test before moving to next priority.

## Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel.
- **Phase 2**: T004, T005, T006 can run in parallel; T008 and T009 can run in parallel after T007.
- **US1**: T013 and T014 can run in parallel; T015 and T016 can run in parallel.
- **US2**: T020 and T021 can run in parallel.
- **US3**: T026 and T027 can run in parallel.
- **US4**: T032 and T033 can run in parallel.
- **Polish**: T037 and T038 can run in parallel.

## Parallel Example: User Story 1

```bash
# Parallel RED tests
Task: T013 src/__tests__/graphViewCommandRouting.test.ts
Task: T014 src/features/fluxflow/__tests__/graphPanelHost.test.ts

# Parallel implementation tasks on different files
Task: T015 package.json
Task: T016 src/editor/handlers/uiHandlers.ts
```

## Parallel Example: User Story 2

```bash
# Parallel RED tests
Task: T020 src/features/fluxflow/__tests__/graphScopeProjection.test.ts
Task: T021 src/features/fluxflow/__tests__/graphChatScope.test.ts
```

## Parallel Example: User Story 3

```bash
# Parallel RED tests
Task: T026 src/features/fluxflow/__tests__/graphPanelHost.test.ts
Task: T027 src/features/fluxflow/__tests__/graphRefreshOnSave.test.ts
```

## Parallel Example: User Story 4

```bash
# Parallel RED tests
Task: T032 src/features/fluxflow/__tests__/stressTestIndexing.test.ts
Task: T033 src/features/fluxflow/__tests__/graphPanelHost.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1).
4. Validate US1 independent test scenario before broader rollout.

### Incremental Delivery

1. Deliver US1 for discoverable graph open + node navigation.
2. Deliver US2 for strict workspace scope correctness.
3. Deliver US3 for refresh and active-note synchronization.
4. Deliver US4 for unresolved-placeholder quality and correctness.
5. Complete Polish phase and final validation evidence.

### Notes

- `[P]` tasks are safe to execute in parallel because they target different files or independent test suites.
- Every task includes a concrete file path for immediate execution.
- Story phases are independently testable and aligned to `spec.md` priorities.
- Contract coverage maps to `specs/045-foam-graph-view/contracts/graph-view-contract.md`.
- Data-model coverage maps to `specs/045-foam-graph-view/data-model.md` entities and state transitions.

# Feature Specification: Workspace-Scoped Graph View

**Folder**: `specs/045-foam-graph-view/`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "Move ahead with the plan.md and the Foam inspired 'Graph View'"

## User Scenarios &amp; Testing *(mandatory)*

### User Story 1 - Open and Use Graph View From Editor (Priority: P1)

A writer editing markdown notes can open a visual ‘Graph View’ directly from the editor toolbar and see note relationships in an immediately usable, interactive view.

**Why this priority**: Discoverability and direct access are the primary value. If users cannot open and interact with the graph quickly, the rest of the feature provides little practical benefit.

**Independent Test**: Can be fully tested by opening a markdown document, launching Graph View from the toolbar, and interacting with nodes to navigate to related notes.

**Acceptance Scenarios**:

1. **Given** a user is editing a markdown note, **When** they choose Graph View from the main toolbar, **Then** the graph opens in a dedicated panel showing the current workspace note network.
2. **Given** Graph View is open, **When** the user selects a graph node, **Then** the corresponding note opens in the editor.

---

### User Story 2 - Keep Graph and Chat Scoped to Open Workspace Folders (Priority: P1)

A user working in one or more open workspace folders sees only relevant graph/chat data for those open folders, even if other indexed data exists elsewhere.

**Why this priority**: Scope correctness directly affects trust. Showing unrelated notes from outside open folders causes confusion and incorrect navigation.

**Independent Test**: Can be fully tested by indexing multiple folders, opening a subset in the workspace, and verifying graph/chat only surface notes from currently open folders.

**Acceptance Scenarios**:

1. **Given** the index contains data from multiple folders, **When** only selected folders are open in the workspace, **Then** Graph View and Graph Chat show only notes from open folders.
2. **Given** the set of open workspace folders changes, **When** Graph View remains open, **Then** the visible graph updates to reflect the new workspace scope.

---

### User Story 3 - Keep Graph State Current After Note Changes (Priority: P2)

A user who edits links and saves expects the graph relationships and navigation context to refresh promptly without reopening panels.

**Why this priority**: Freshness is required for confidence during iterative writing. Stale relationship views reduce usefulness of graph-driven navigation.

**Independent Test**: Can be fully tested by editing wikilinks in a note, saving, and verifying updated edges and navigation context appear without manual refresh.

**Acceptance Scenarios**:

1. **Given** a note is edited to add or remove links, **When** the note is saved, **Then** Graph View updates relationship visibility for that note.
2. **Given** a note is currently active in the editor, **When** the active note changes, **Then** Graph View highlights the new active note.

---

### User Story 4 - Preserve Meaningful Unresolved Placeholders (Priority: P3)

A user can distinguish between expected unresolved references (truly missing notes) and parser/index defects (malformed targets).

**Why this priority**: Users need unresolved entries to diagnose missing content, but malformed placeholders create false alarms and undermine reliability.

**Independent Test**: Can be fully tested by opening the stress-test vault and confirming only intentionally missing links remain unresolved while valid links resolve.

**Acceptance Scenarios**:

1. **Given** the stress-test vault contains intentional missing links, **When** the graph is rendered, **Then** those missing links appear as unresolved placeholders.
2. **Given** valid links include aliases and escaped separators, **When** indexing and graph projection run, **Then** no malformed unresolved targets are produced.

### Edge Cases

- What happens when a user opens Graph View with no markdown notes available in scope? The graph should open with an empty-state message and no error.
- How does the system handle ambiguous note names across folders? The graph should still map each relationship to the correct scoped note identity.
- What happens when workspace folders are removed while Graph View is open? Out-of-scope nodes should be removed immediately.
- How does the system handle previously indexed stale unresolved values? The system should normalize and repair malformed unresolved targets during refresh/reindex.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Graph View action in the main editor toolbar that opens the graph panel.
- **FR-002**: System MUST provide an equivalent command-palette action to open the same Graph View panel.
- **FR-003**: System MUST render note relationship data as a navigable graph representation.
- **FR-004**: System MUST allow users to open a note by selecting its graph node.
- **FR-005**: System MUST scope graph data to currently open workspace folders only.
- **FR-006**: System MUST scope Graph Chat retrieval context to currently open workspace folders only.
- **FR-007**: System MUST update graph relationships after save/reindex events without requiring panel reopen.
- **FR-008**: System MUST update active-node highlighting when the active editor note changes.
- **FR-009**: System MUST keep unresolved placeholders for truly missing references.
- **FR-010**: System MUST normalize malformed stored targets (including escaped alias artifacts) so valid targets resolve correctly.
- **FR-011**: System MUST preserve unresolved indicators only for references that have no valid scoped target.
- **FR-012**: System MUST keep graph and navigation context consistent after link edits and saves.
- **FR-013**: System MUST remain operational if the graph data set is empty, showing a clear empty state.

### Key Entities *(include if feature involves data)*

- **Workspace Scope**: The set of currently open workspace folders used to filter visible graph/chat data.
- **Graph Node**: A visual representation of a note or unresolved placeholder, with display label and scope-aware identity.
- **Graph Edge**: A relationship from a source note to a target note/placeholder derived from links.
- **Active Note Selection**: The currently focused editor note mapped to graph highlight state.
- **Unresolved Placeholder**: A reference target without a valid scoped note match.
- **Index Refresh Event**: A change notification indicating note/link updates after save or reindex.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In user validation, 95% of attempts can open Graph View from the toolbar in one action.
- **SC-002**: In the stress-test vault, 100% of valid references resolve to existing notes after rebuild.
- **SC-003**: In the stress-test vault, malformed unresolved targets (for example trailing escape artifacts) are reduced to 0.
- **SC-004**: In multi-folder validation, 100% of graph/chat results remain limited to currently open workspace folders.
- **SC-005**: After save operations that change links, updated graph relationships are reflected without reopening the graph panel.

## Assumptions

- Users will trigger index rebuild when validating historical data after parser/normalization changes.
- Existing note/link indexing infrastructure remains the source of truth for relationship extraction.
- Read-only graph interaction is sufficient for this phase; direct graph editing is out of scope.
- Workspace folder openness is the authoritative scope boundary for graph and chat visibility.
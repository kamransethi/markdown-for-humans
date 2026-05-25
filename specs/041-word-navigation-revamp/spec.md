# Feature Specification: Word-Like Navigation Revamp

**Folder**: `specs/041-word-navigation-revamp/`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "I need a revamp of the table of contents / navigation page. I need it to evolve into a Navigation experience like Microsoft Word with some differences. I need to use it to show three tabs like MS Word but with: 1) headings, 2) references (links and backlinks from the page), and 3) search with unique TipTap object IDs so users can jump to each paragraph instead of only headings. Design this carefully and include an ASCII visual."

## Clarifications

### Session 2026-05-24

- Q: What lifecycle should paragraph/heading object IDs follow for Search navigation accuracy? -> A: Use unique IDs for headings and stored text blocks, scanning to find the exact block and select it.
- Q: What granularity should the References tab use? -> A: Note-level with fragment awareness, aggregating duplicate occurrences.
- Q: How should Search results be ordered? -> A: Strictly by document position (top to bottom).

## User Scenarios &amp; Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->


### User Story 1 - Navigate By Structure (Priority: P1)

As a writer reviewing a long document, I can open a Navigation panel and use a Headings tab to jump quickly to major sections, so I can understand and move through the document structure efficiently.

**Why this priority**: Fast structural navigation is the primary purpose of this experience and the baseline users expect from a Word-like navigator.

**Independent Test**: Can be fully tested by opening a document with multiple heading levels, opening the Headings tab, and confirming each listed heading navigates to the correct location.

**Acceptance Scenarios**:

1. **Given** a document with multiple heading levels, **When** the user opens Navigation and selects the Headings tab, **Then** headings are listed in document order with clear hierarchy.
2. **Given** the Headings tab list is visible, **When** the user selects a heading entry, **Then** the editor moves focus to that heading location.

### Navigation Panel ASCII Visual

```text
+--------------------------------------------------+
| Navigation                                  [x]  |
|--------------------------------------------------|
| [ Search document......................... ] [v] |
|--------------------------------------------------|
| Headings | References | Search                 |
|==========|============|=========================|
| Executive Summary                                |
| Current Situation                                |
| Solution                                         |
|   Implementation Plan                            |
|   Benefits                                       |
| Conclusion                                       |
+--------------------------------------------------+

References tab example:
  Outgoing Links
   - dealership/dealer-network
   - decisions/approval-workflow
  Backlinks
   - api-gateway
   - tier-matrix

Search tab example:
  "dealer" (7 results)
   - [obj: para-0184] ...dealer onboarding flow...
   - [obj: para-0291] ...dealer network handoff...
```

---

### User Story 2 - Navigate By Links And Backlinks (Priority: P2)

As a writer validating document connectivity, I can open a References tab showing links from the current page and backlinks to the current page, so I can follow relationships and fix knowledge graph gaps.

**Why this priority**: Reference navigation is essential to this product's linked-notes workflow and was explicitly requested as a first-class tab.

**Independent Test**: Can be fully tested with a known linked document by opening the References tab and validating that both outgoing links and backlinks are shown and navigable.

**Acceptance Scenarios**:

1. **Given** a document with outgoing links and inbound references, **When** the user opens the References tab, **Then** the panel shows both outgoing links and backlinks in separate clearly labeled groups.
2. **Given** a references entry is shown, **When** the user selects it, **Then** the editor opens or navigates to the referenced target.

---

### User Story 3 - Paragraph-Level Search Navigation (Priority: P3)

As a writer searching within a long document, I can use a Search tab that returns paragraph-level results tied to stable TipTap object IDs, so I can jump directly to precise paragraph matches instead of only heading-level jumps.

**Why this priority**: This delivers the key difference from Word navigation and significantly improves precision for long technical documents.

**Independent Test**: Can be fully tested by searching for a repeated term, verifying multiple paragraph-level results with object IDs, and confirming each result jumps to the exact paragraph.

**Acceptance Scenarios**:

1. **Given** a document where a term appears in several paragraphs, **When** the user searches in the Search tab, **Then** results include distinct paragraph-level entries associated with unique object IDs.
2. **Given** paragraph-level search results are displayed, **When** the user selects any result, **Then** the editor navigates to the specific paragraph represented by that result.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- What happens when a document has no headings, no links, or no backlinks? The panel should show an empty-state message for that tab instead of blank space.
- What happens when search returns many hits in the same section? Results should remain distinct at paragraph level and not collapse to heading-only entries.
- What happens when an indexed reference target no longer exists? The entry should still be shown with a broken-state indicator and remain understandable.
- What happens when many links point to the same note or fragment? The References tab should show one aggregated entry with duplicate occurrences summarized.
- What happens when a paragraph object ID is missing or stale? The system should fall back to nearest valid location and communicate that exact paragraph targeting was unavailable.
- What happens when the document changes while the Navigation panel is open? Tab content should refresh without requiring panel reopen.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->


### Functional Requirements

- **FR-001**: System MUST provide a Navigation panel with exactly three tabs: Headings, References, and Search.
- **FR-002**: System MUST preserve heading hierarchy and document order in the Headings tab.
- **FR-003**: System MUST allow users to navigate to a selected heading from the Headings tab.
- **FR-004**: System MUST show outgoing links from the current document in the References tab at note-level granularity.
- **FR-005**: System MUST show backlinks to the current document in the References tab at note-level granularity.
- **FR-006**: System MUST visually distinguish outgoing links from backlinks in the References tab.
- **FR-007**: System MUST allow users to navigate to a selected reference item from the References tab.
- **FR-018**: References entries MUST preserve fragment awareness, showing heading or block target context when present.
- **FR-019**: References entries MUST aggregate duplicate occurrences to avoid repeated raw entries for the same note-level relationship.
- **FR-008**: System MUST provide in-panel search behavior similar to a document navigation search experience.
- **FR-009**: System MUST return paragraph-level search results, not only heading-level results.
- **FR-010**: Each search result MUST be associated with a unique object ID representing the matched heading or stored text block.
- **FR-011**: Selecting a search result MUST navigate to the exact heading or stored text block identified by its unique object ID.
- **FR-017**: Headings and stored text blocks MUST expose unique IDs that can be scanned and resolved for exact navigation target selection.
- **FR-012**: Search results MUST display enough surrounding text for users to distinguish similar matches.
- **FR-020**: Search results MUST be ordered strictly by document position from top to bottom.
- **FR-013**: Navigation tab content MUST update when the active document changes.
- **FR-014**: Navigation tab content MUST refresh when document content changes in ways that affect headings, references, or search results.
- **FR-015**: Empty states MUST be shown for each tab when no data is available.
- **FR-016**: When exact paragraph-level navigation cannot be completed, the system MUST provide a clear fallback behavior and user-visible status.

### Key Entities *(include if feature involves data)*

- **Navigation Panel State**: Represents active tab, current search query, selected result, and document context.
- **Heading Entry**: Represents one heading item with level, display label, order position, and target location.
- **Reference Entry**: Represents one relationship item with type (outgoing or backlink), source/target label, path identifier, optional fragment context, occurrence count, and navigable target.
- **Search Result Entry**: Represents one paragraph-level search hit with the matched block ID, snippet text, match term context, and target location.
- **Navigable Content Block**: Represents a heading or stored text block with a unique ID and a resolvable location in the active document.
- **Document Navigation Context**: Represents the currently active document and its derived navigation data snapshot.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->


### Measurable Outcomes

- **SC-001**: In usability validation, at least 90% of users can navigate to a known section using the Headings tab in under 10 seconds.
- **SC-002**: In usability validation, at least 90% of users can find and open a linked note from the References tab in under 15 seconds.
- **SC-003**: For search tasks with repeated terms, at least 95% of tested selections land on the intended paragraph-level match.
- **SC-004**: Compared with the current navigation experience, user-reported confidence in finding exact content improves by at least 30%.
- **SC-005**: At least 90% of documents with valid paragraph object IDs show paragraph-level search navigation without fallback.
- **SC-006**: Playwright visual test coverage MUST include at least these 5 scenarios (Headings navigation, References grouping, References navigation, Search exact jump, Search fallback/empty-state), and all scenarios MUST pass in two consecutive local runs before completion.

## Assumptions

- The feature is scoped to the editor's desktop navigation panel and not external document viewers.
- Existing heading parsing and link/backlink data sources are available and considered authoritative for v1 behavior.
- Unique IDs are available on headings and stored text blocks so exact block-level navigation can be resolved from search results.
- Keyboard and pointer interaction patterns should remain consistent with existing editor accessibility conventions.
- This revamp replaces the current tab arrangement in Navigation rather than introducing a separate parallel panel.
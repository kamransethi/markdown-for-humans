# Data Model: Word-Like Navigation Revamp

## Entity: NavigationPanelState

- Purpose: Runtime state for the navigation pane.
- Fields:
  - `activeTab`: `headings | references | search`
  - `searchQuery`: string
  - `selectedItemId`: string | null
  - `documentUri`: string
  - `lastUpdatedAt`: number (epoch ms)
  - `statusMessage`: string | null
- Validation rules:
  - `activeTab` must be one of the three allowed tabs.
  - `documentUri` must be non-empty when pane is visible.

## Entity: HeadingEntry

- Purpose: Represents one heading in document order.
- Fields:
  - `id`: string (unique block ID)
  - `text`: string
  - `level`: number (1-6)
  - `pos`: number
  - `isActive`: boolean
- Validation rules:
  - `id` must be unique per document snapshot.
  - `level` must be clamped to 1-6.

## Entity: ReferenceEntry

- Purpose: Represents one note-level link relationship row.
- Fields:
  - `key`: string (stable aggregate key)
  - `type`: `outgoing | backlink`
  - `notePath`: string
  - `title`: string
  - `fragment`: string | null
  - `occurrenceCount`: number
  - `broken`: boolean
- Validation rules:
  - `occurrenceCount >= 1`
  - `notePath` must be non-empty
  - `type` determines grouping section in UI

## Entity: SearchResultEntry

- Purpose: Paragraph-level search hit mapped to a navigable block.
- Fields:
  - `resultId`: string
  - `blockId`: string
  - `snippet`: string
  - `matchRanges`: Array<{ start: number; end: number }>
  - `pos`: number
  - `fallbackUsed`: boolean
- Validation rules:
  - `blockId` must map to a heading or text block ID in current index.
  - `pos` is required for strict top-to-bottom ordering.

## Entity: NavigableContentBlock

- Purpose: Indexed editor block that can be targeted by navigation actions.
- Fields:
  - `blockId`: string
  - `kind`: `heading | text`
  - `pos`: number
  - `textContent`: string
- Validation rules:
  - `blockId` must be unique in the index.
  - `pos` must point to a valid editor document position.

## Relationships

- One `NavigationPanelState` references many `HeadingEntry`, `ReferenceEntry`, and `SearchResultEntry` records for the active document.
- One `SearchResultEntry` resolves to exactly one `NavigableContentBlock` via `blockId`.
- One `ReferenceEntry` may summarize multiple raw link occurrences via `occurrenceCount`.

## State Transitions

1. `activeTab` change:
   - Trigger: user selects tab
   - Effect: switch visible list, preserve `searchQuery` and `selectedItemId` where valid

2. Document context update:
   - Trigger: active document change or debounced content mutation
   - Effect: rebuild heading/reference/search snapshots; clear stale selections

3. Search execution:
   - Trigger: query input changes
   - Effect: regenerate ordered `SearchResultEntry[]`; set empty-state if no hits

4. Navigation action:
   - Trigger: click/keyboard select entry
   - Effect: move editor selection to resolved position; set `fallbackUsed` and status if exact ID resolution fails

# Contract: Navigation Panel Webview <-> Extension

## Purpose

Define message contracts and payload shapes required for Headings, References, and Search tabs in the navigation panel.

## Channel

- Transport: existing webview `postMessage` protocol
- Shared constants: `src/shared/messageTypes.ts`

## Message Definitions

### 1) NAVIGATION_CONTEXT_REQUEST

- Direction: webview -> extension
- Purpose: request references/search-ready context for current document
- Payload:

```ts
{
  type: 'navigationContextRequest';
  requestId: string;
  documentUri: string;
}
```

### 2) NAVIGATION_CONTEXT_RESULT

- Direction: extension -> webview
- Purpose: return tab data snapshot for active document
- Payload:

```ts
{
  type: 'navigationContextResult';
  requestId: string;
  documentUri: string;
  headings: Array<{
    id: string;
    text: string;
    level: number;
    pos: number;
  }>;
  references: {
    outgoing: Array<{
      key: string;
      notePath: string;
      title: string;
      fragment: string | null;
      occurrenceCount: number;
      broken: boolean;
    }>;
    backlinks: Array<{
      key: string;
      notePath: string;
      title: string;
      fragment: string | null;
      occurrenceCount: number;
      broken: boolean;
    }>;
  };
}
```

### 3) NAVIGATION_SEARCH_REQUEST

- Direction: webview -> webview-local indexer or extension (implementation choice in phase tasks)
- Purpose: request paragraph-level search results
- Payload:

```ts
{
  type: 'navigationSearchRequest';
  requestId: string;
  query: string;
}
```

### 4) NAVIGATION_SEARCH_RESULT

- Direction: provider -> webview
- Purpose: return ordered paragraph-level hits
- Payload:

```ts
{
  type: 'navigationSearchResult';
  requestId: string;
  query: string;
  results: Array<{
    resultId: string;
    blockId: string;
    snippet: string;
    pos: number;
  }>;
}
```

### 5) NAVIGATE_TO_BLOCK

- Direction: webview internal command dispatch
- Purpose: navigate editor to selected heading/reference/search target
- Payload:

```ts
{
  type: 'navigateToBlock';
  blockId?: string;
  pos?: number;
  sourceTab: 'headings' | 'references' | 'search';
}
```

### 6) NAVIGATION_STATUS

- Direction: provider -> webview
- Purpose: communicate fallback or broken-state status to user
- Payload:

```ts
{
  type: 'navigationStatus';
  level: 'info' | 'warning';
  code:
    | 'EXACT_TARGET_RESOLVED'
    | 'FALLBACK_TO_NEAREST_BLOCK'
    | 'REFERENCE_TARGET_BROKEN'
    | 'NO_RESULTS';
  message: string;
}
```

## Contract Invariants

- Search results MUST be sorted by `pos` ascending.
- `blockId` values MUST be unique within a document snapshot.
- Reference entries MUST be aggregated at note level and include `occurrenceCount`.
- Empty data sets MUST still return valid payload shapes (empty arrays, not null).

## Error Handling Expectations

- Unknown `requestId`: ignore and log warning.
- Missing `documentUri`: return empty payload with `navigationStatus` warning.
- Missing or stale `blockId`: emit `FALLBACK_TO_NEAREST_BLOCK` and navigate via nearest valid position.

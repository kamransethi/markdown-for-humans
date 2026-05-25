# Quickstart: Implement and Validate Word-Like Navigation Revamp

## Prerequisites

- Run from repository root: `gpt-ai-markdown-editor/`
- Install deps if needed: `npm install`
- Ensure build passes before feature work:
  - VS Code task: `Verify Build`

## Implementation Sequence

1. Implement Phase 1 foundation
- Add tabbed navigation shell in `src/webview/features/tocPane.ts`.
- Wire tab state and heading navigation in `src/webview/editor.ts`.
- Add new message types in `src/shared/messageTypes.ts`.

2. Implement Phase 2 references integration
- Extend references payload shaping in `src/services/foam-integration.ts`.
- Expose references snapshot in `src/editor/MarkdownEditorProvider.ts`.
- Render outgoing/backlink grouped lists in `src/webview/features/tocPane.ts`.

3. Implement Phase 3 search navigation
- Place search input inside the Search tab (not global header).
- Execute search locally against the active editor document.
- Return strict document-order results and render snippets.
- Navigate to matched block positions on result selection.

4. Implement Phase 4 hardening
- Ensure refresh on active doc change and content edits.
- Add empty states and broken-reference indicators.
- Finalize CSS and accessibility details.

## Test Plan

1. Unit tests (Jest)
- Update `src/__tests__/webview/ui/tocPane.test.ts` for tab switching, empty states, and list rendering.
- Add provider/data-shaping tests under `src/__tests__/editor/`.
- Add search ordering and fallback tests for block-ID navigation logic.

2. Playwright visual and interaction tests
- Create `src/__tests__/playwright/navigation-panel.spec.ts`.
- Cover:
  - Headings tab hierarchy and jump behavior
  - References tab outgoing/backlink groups and aggregation
  - Search tab paragraph-level results and exact jump
  - Fallback and empty-state behavior

Note: In current v1 closure, Playwright coverage remains scaffolded and manual validation was used for tab interactions.

3. Regression verification
- Run: `npm test`
- Run relevant Playwright suite for new navigation tests.
- Validate no regressions in existing TOC and wikilink behavior.

## Manual Verification Checklist

- Headings tab displays hierarchy and jumps to selected heading.
- References tab shows outgoing and backlinks separately with fragment context.
- Search tab returns paragraph-level hits ordered top-to-bottom for the active file.
- Search input is visible only inside the Search tab.
- Selecting a search hit navigates to exact block or shows fallback status.
- Panel refreshes on document switch and content edits.
- Empty states appear for no headings/no references/no search results.

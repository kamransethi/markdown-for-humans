# Tolaria Source Reference
> Tolaria is a Tauri 2 (macOS/Windows/Linux) native notes app — React 19, BlockNote WYSIWYG, CodeMirror 6 source view, shadcn/ui + Tailwind CSS 4. It is NOT a VS Code extension.
> Source: `/Users/kamran/Documents/GitHub/tolaria/src/`

---

## Stack Summary
| Layer | Tech |
|-------|------|
| Desktop platform | Tauri 2 |
| UI framework | React 19 |
| WYSIWYG editor | BlockNote v0.46 |
| Raw/source editor | CodeMirror 6 |
| Diff viewer | CodeMirror 6 (custom extension) |
| Component library | shadcn/ui + Mantine + Radix UI |
| Styling | Tailwind CSS 4 |
| State | React hooks (no global store) |
| i18n | Lara CLI |
| Analytics | PostHog |
| Tests | Vitest + Playwright |

---

## Feature 1: TOC (Table of Contents) Panel

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/components/TableOfContentsPanel.tsx` | `TableOfContentsPanel` | Sidebar panel; click-to-scroll to heading using BlockNote block IDs; renders nested H1/H2/H3 hierarchy |
| `src/components/tableOfContentsModel.ts` | `buildTableOfContents()`, `buildTableOfContentsFromMarkdown()`, `resolveTocItemBlockId()`, `TocItem` | Parses BlockNote block objects OR raw markdown to extract headings; deduplicates; builds nested tree |
| `src/components/tableOfContents.worker.ts` | Web Worker | Runs TOC building off main thread |
| `src/components/tableOfContentsWorkerClient.ts` | `buildTableOfContentsInWorker()`, `TOC_BUILD_DEBOUNCE_MS` | Client that delegates to worker; debounces rebuilds on content change |
| `src/components/TableOfContentsPanel.test.tsx` | — | Tests for heading extraction, nesting, frontmatter title |

**How it works:**
1. Editor content changes → debounce fires → worker builds `TocItem[]` tree from BlockNote blocks (or markdown fallback)
2. `TableOfContentsPanel` renders the tree; clicking a heading calls BlockNote's scroll-to-block API
3. Only H1/H2/H3 included; duplicates disambiguated by appending parent heading

**Adaptation note:** For TipTap, use `editor.getJSON()` to extract heading nodes, or parse the raw markdown for headings. Worker approach can be reused as-is.

---

## Feature 2: Properties Window (Front Matter / YAML Metadata)

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/components/DynamicPropertiesPanel.tsx` | `DynamicPropertiesPanel`, `containsWikilinks()` | Main panel; renders all frontmatter fields with type-aware UI (dropdowns, date pickers, color swatches, wikilink chips, add/edit/delete); top-level container |
| `src/components/PropertyValueCells.tsx` | `SmartPropertyValueCell`, `DisplayModeSelector` | Per-field renderer; picks UI based on detected type (text, number, bool, array, date, wikilink, color, status) |
| `src/components/AddPropertyForm.tsx` | Form component | Dialog to add new frontmatter keys with validation |
| `src/hooks/usePropertyPanelState.ts` | `usePropertyPanelState()` | Tracks which field is being edited, pending changes, display modes |
| `src/hooks/frontmatterOps.ts` | Frontmatter save/update hooks | Persists frontmatter changes to disk via Tauri IPC |
| `src/utils/frontmatter.ts` | `parseFrontmatter()`, `detectFrontmatterState()`, `detectFrontmatterWarnings()`, `ParsedFrontmatter` | Custom YAML parser; validates structure; detects property collisions; does NOT use external YAML library |
| `src/utils/propertyTypes.ts` | `detectPropertyType()`, `getEffectiveDisplayMode()`, `DISPLAY_MODE_ICONS` | Type-inference system: infers type from value shape; maps type → display mode |
| `src/utils/systemMetadata.ts` | System metadata key definitions | Defines read-only system fields (created, modified, wordCount, etc.) and their display names |

**How it works:**
1. `parseFrontmatter()` reads raw YAML from file
2. `detectPropertyType()` infers each value's type from shape
3. `DynamicPropertiesPanel` renders each property using `SmartPropertyValueCell`
4. Edits flow through `usePropertyPanelState` → `frontmatterOps` → disk

**Adaptation note:** `parseFrontmatter()` and `detectPropertyType()` are pure utility functions — copy directly. The React panel structure will need rebuilding but data model is solid.

---

## Feature 3: Wikilink System

### 3a. File Indexing (vault-wide)

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/utils/wikilink.ts` | Wikilink regex patterns, parse utils | Core regex-based `[[target]]` and `[[target|alias]]` matching |
| `src/utils/wikilinks.ts` | `preProcessWikilinks()`, `extractOutgoingLinks()`, `extractSnippet()`, `splitFrontmatter()` | Preprocesses markdown for round-trip preservation; extracts all outgoing links; handles table context |
| `src/utils/wikilinkSuggestions.ts` | `preFilterWikilinks()`, `deduplicateByPath()`, `disambiguateTitles()`, `MIN_QUERY_LENGTH`, `MAX_RESULTS`, `WikilinkBaseItem` | Suggestion engine: case-insensitive substring match against title + aliases + group + path; dedup by file path; disambiguate duplicate titles with parent folder |
| `src/utils/suggestionEnrichment.ts` | `enrichSuggestionItems()`, `attachClickHandlers()` | Attaches type info, colors, icons, click handlers to suggestion items |
| `src/utils/wikilinkColors.ts` | Color mapping utilities | Maps note type → display color |

### 3b. WYSIWYG (BlockNote) Wikilink Autocomplete

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/components/WikilinkSuggestionMenu.tsx` | `WikilinkSuggestionMenu`, `WikilinkSuggestionItem` | Dropdown showing filtered suggestions; title + type icon + color + aliases; keyboard-navigable; shared between raw editor and inline property fields |
| `src/components/NoteSearchList.tsx` | `NoteSearchList` | Individual note/entry row renderer (icon, color, type name) |
| `src/components/useEditorLinkActivation.ts` | `useEditorLinkActivation()` | Cmd+Click handler; reads `data-target` attribute on wikilink DOM nodes; triggers navigation callback |

### 3c. Raw Editor (CodeMirror) Wikilink Autocomplete

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/utils/rawEditorUtils.ts` | `buildRawEditorBaseItems()`, `extractWikilinkQuery()`, `replaceActiveWikilinkQuery()`, `buildRawEditorAutocompleteState()`, `getRawEditorDropdownPosition()` | Detects `[[` in CodeMirror as user types; extracts the query string; computes dropdown position from cursor; inserts selected suggestion |

### 3d. Inline Wikilink (in Properties Fields)

> Complex system for wikilink chips in contenteditable property fields. Less relevant for a markdown editor.

| File | Notes |
|------|-------|
| `src/components/InlineWikilinkInput.tsx` | Contenteditable chip field with keyboard nav, paste recovery, drag-drop |
| `src/components/inlineWikilink*.ts` (8 files) | DOM utilities, segment parsing, token conversion, edit ops, keydown routing, paste/drop recovery |
| `src/components/useInlineWikilinkSelection.ts` | Selection state hook |
| `src/components/useInlineWikilinkSuggestionsState.ts` | Suggestion dropdown state hook |
| `src/components/InlineWikilinkParts.tsx` | Subcomponents (field, dropdown, layout) |

**Adaptation note for wikilink autocomplete:**
- In TipTap you'd write a custom `Extension` using `@tiptap/suggestion` package — much simpler
- `wikilinkSuggestions.ts` (the pure filtering logic) can be copied verbatim
- `WikilinkSuggestionMenu.tsx` is a good UI reference but needs rewriting without React if your webview doesn't use React (or keep React and import it)

---

## Feature 4: CodeMirror Source/Raw View

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/hooks/useCodeMirror.ts` | `useCodeMirror()`, `CodeMirrorCallbacks` | Main hook: mounts CodeMirror 6 instance; theme, markdown syntax, YAML frontmatter highlight, line numbers, RTL support, WKWebView zoom cursor fix, composition events |
| `src/extensions/markdownHighlight.ts` | `markdownLanguage` | Markdown + YAML frontmatter language support for CodeMirror |
| `src/extensions/frontmatterHighlight.ts` | `frontmatterHighlightPlugin`, `frontmatterHighlightTheme` | Custom ViewPlugin decoration: different colors for YAML keys vs. values |
| `src/extensions/zoomCursorFix.ts` | `zoomCursorFix` | Fixes cursor offset when CSS `zoom` is applied (WKWebView bug) |
| `src/extensions/arrowLigaturesExtension.ts` | Arrow ligature resolver | Handles `=>` ligature with correct composition event handling |
| `src/components/RawEditorView.tsx` | `RawEditorView` | Full raw editor component: CodeMirror instance + wikilink autocomplete dropdown + find/replace bar |
| `src/components/RawEditorFindBar.tsx` | `RawEditorFindBar`, `RawEditorFindRequest` | Find & Replace UI forwarding search state to `EditorView.dispatch()` |
| `src/utils/editorFind.ts` | `findEditorMatches()`, `buildEditorFindReplacementChange()`, `clampEditorFindIndex()` | Find/replace logic for CodeMirror (regex, match navigation, replacement) |
| `src/hooks/useRawMode.ts` | `useRawMode()` | Manages raw mode toggle state; persisted to settings |
| `src/hooks/useEditorModePositionSync.ts` | `useEditorModePositionSync()`, `buildCodeMirrorRestoreState()` | Syncs cursor/scroll position when toggling between WYSIWYG ↔ raw mode |
| `src/components/Editor.tsx` | Main editor | Switches between BlockNote and CodeMirror based on raw mode state; contains toolbar toggle button |

**CodeMirror packages used:**
```
@codemirror/view, @codemirror/state, @codemirror/lang-markdown, @codemirror/lang-yaml,
@codemirror/language, @codemirror/search, @codemirror/commands, @codemirror/theme-one-dark
```

**How the toggle works:**
1. Toolbar button calls `useRawMode().toggleRawMode()`
2. `Editor.tsx` conditionally renders `<RawEditorView>` or `<BlockNoteView>`
3. `useEditorModePositionSync` maps WYSIWYG cursor position → CodeMirror line/col and back

**CSS variables for theming:**
```css
--syntax-frontmatter-key: ...
--syntax-frontmatter-value: ...
```

**Adaptation note:** `useCodeMirror.ts` and all extensions are standard CodeMirror 6 — copy nearly verbatim. Strip out React-specific parts (`useEffect`, `useRef`) and replace with vanilla JS if your webview doesn't use React.

---

## Feature 5: Git History Panel + Diff View

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/components/inspector/GitHistoryPanel.tsx` | `GitHistoryPanel` | Sidebar panel: list of commits (short hash, message, relative date); click → show diff |
| `src/components/DiffView.tsx` | `DiffView` | CodeMirror 6 rendering of unified diff output; decorations for added/removed lines, hunk headers |
| `src/hooks/useGitHistory.ts` | `useGitHistory()` | Fetches commit history for active file path; 200ms debounce; caches per path |
| `src/types.ts` | `GitCommit` type | `{hash, shortHash, message, date, author}` |
| `src-tauri/src/handlers/` | Tauri backend | Calls `git log --format=...` as child process; returns `GitCommit[]` via IPC |

**How it works:**
1. Inspector open → `useGitHistory(filePath)` fetches via Tauri IPC
2. Tauri backend runs `git log --format="%H|%h|%s|%ad|%an" --date=relative <file>`
3. Commits rendered in `GitHistoryPanel` as clickable rows
4. Click → `git show <hash> -- <file>` → unified diff string → `DiffView` renders with CodeMirror

**Diff view CodeMirror setup** (`DiffView.tsx`):
- Plain text editor (no language) with custom decorations
- `ViewPlugin` scans lines for `+`/`-`/`@@`/`---`/`+++` prefixes
- Applies `Decoration.line({class: 'diff-added'})` / `diff-removed` / `diff-hunk` etc.
- CSS variables: `--diff-added-bg`, `--diff-removed-bg`, `--diff-hunk-bg`

**Adaptation note:**
- In VS Code extension host, replace Tauri IPC with `child_process.execFile('git', args)`
- `DiffView.tsx` CodeMirror setup can be copied nearly verbatim — it's standard CM6 with no React dependencies beyond mounting

---

## Inspector Container (houses all panels)

| File | Key Exports | Notes |
|------|-------------|-------|
| `src/components/Inspector.tsx` | `Inspector` | Main inspector: tabs → Properties / Relationships / Backlinks / History / Instances |
| `src/components/InspectorPanels.tsx` | Re-exports all panels | Central import hub |
| `src/components/inspector/` | `BacklinksPanel`, `RelationshipsPanel`, `InstancesPanel`, `NoteInfoPanel`, `InspectorChrome`, `shared.ts`, `useInspectorData.ts`, `useInspectorPropertyActions.ts` | Individual tab panels |

---

## CSS Architecture Reference

| File | Notable Classes/Variables |
|------|--------------------------|
| `src/index.css` | `--syntax-frontmatter-key`, `--syntax-frontmatter-value`, `--diff-added-bg`, `--diff-removed-bg`, `--diff-hunk-bg` |
| `src/components/Editor.css` | `.raw-editor-codemirror`, `.wikilink`, `.cm-*` CodeMirror overrides |
| `src/components/WikilinkSuggestionMenu.css` | Dropdown suggestion menu styles |

---

## Architecture Map

```
Inspector (sidebar)
├── DynamicPropertiesPanel ──── frontmatter.ts, propertyTypes.ts
│   └── PropertyValueCells ──── InlineWikilinkInput (for wikilink props)
├── GitHistoryPanel ──────────── useGitHistory → Tauri IPC → git log
│   └── DiffView ─────────────── CodeMirror 6 + diff decorations
├── TableOfContentsPanel ──────── tableOfContentsModel.ts + worker
└── BacklinksPanel / RelationshipsPanel

Editor (main area)
├── BlockNoteView ─────────────── WYSIWYG mode (useRawMode = false)
│   └── useEditorLinkActivation ── Cmd+Click wikilink navigation
└── RawEditorView ─────────────── CodeMirror 6 (useRawMode = true)
    ├── useCodeMirror ─────────── CM6 setup + extensions
    ├── RawEditorFindBar ────────── Find & Replace
    └── WikilinkSuggestionMenu ─── [[...]] autocomplete dropdown

Wikilink system (cross-cutting)
├── wikilink.ts ──────────────── regex patterns
├── wikilinks.ts ─────────────── markdown preprocessing
├── wikilinkSuggestions.ts ───── filtering engine (pure function, copy-safe)
└── rawEditorUtils.ts ────────── CodeMirror cursor → query detection
```

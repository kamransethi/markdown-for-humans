# Tolaria App Architecture Index

**Purpose:** Quick reference guide for copying design patterns and features from Tolaria into the MD4H editor.

**Tech Stack:**
- **Frontend Framework:** SvelteKit  
- **Component Library:** shadcn-svelte (Svelte components)
- **Editor:** CodeMirror (for raw/source view)
- **UI Components:** shadcn-ui patterns adapted for Svelte
- **State Management:** SvelteKit stores + Tauri IPC
- **Desktop App:** Tauri (cross-platform desktop)
- **CSS:** Tailwind CSS

---

## 1. Table of Contents (TOC) Panel

**Purpose:** Sidebar panel showing document outline with collapsible sections, used for quick navigation.

### Files & Components:
- **[src/components/TableOfContentsPanel.tsx](src/components/TableOfContentsPanel.tsx)**
  - Component: `TableOfContentsPanel`
  - Renders sidebar tree of headings extracted from markdown
  - Click handler to jump to sections
  - Supports collapsible header hierarchy

- **[src/utils/tableOfContentsModel.ts](src/utils/tableOfContentsModel.ts)**
  - Parses markdown to extract heading structure
  - Returns array of sections with level, title, line number
  - Used by TableOfContentsPanel to render tree

### Key Patterns:
- Parse markdown on content change
- Store heading hierarchy in component state
- Click on heading jumps editor to that line
- Collapsible sections preserve open/closed state

---

## 2. Properties Panel (Front Matter / Metadata)

**Purpose:** Displays and edits YAML front matter variables for the current note.

### Files & Components:
- **[src/components/DynamicPropertiesPanel.tsx](src/components/DynamicPropertiesPanel.tsx)**
  - Component: `DynamicPropertiesPanel`  
  - Renders form fields for front matter key-value pairs
  - Supports multiple field types (text, select, date, tags, etc.)
  - Real-time sync with note metadata

- **[src/utils/frontmatter.ts](src/utils/frontmatter.ts)**
  - Parses YAML front matter from markdown
  - Extracts key-value pairs and validates types
  - Returns object mapping property name → value & type

### Key Patterns:
- Parse front matter from markdown document
- Map YAML keys to form field types  
- Two-way binding: form changes update markdown
- Type detection (date, tags, string, etc.)

---

## 3. Wikilink System

**Purpose:** Support for `[[identifier]]` syntax with file indexing, autocomplete suggestions, and hover previews.

### 3a. Wikilink Indexing & Suggestion
- **[src/utils/wikilinks.ts](src/utils/wikilinks.ts)**
  - Functions: `buildWikilinkIndex()`, `filterWikilinkSuggestions()`
  - Scans vault for all markdown files
  - Returns list of available note identifiers for autocomplete
  - Filters based on user input during insertion

### 3b. Wikilink Completion in Editor
- **Integration with TipTap/ProseMirror**
  - Custom plugin provides `[[` trigger
  - Shows dropdown with matching notes
  - "Create new note" option if no matches
  - Keyboard navigation (↑↓ for selection, Tab/Enter to select)

### 3c. Wikilink Hover Preview  
- **On hover of `[[identifier]]`**
  - Shows preview card of linked note
  - Displays first few lines + backlinks
  - Click to open the linked note

### Key Patterns:
- Index all notes synchronously on startup
- Filter suggestions in real-time as user types
- Visual distinction: valid links (blue) vs broken links (red)
- Keyboard-driven dropdown navigation

---

## 4. CodeMirror-Based Source/Raw View

**Purpose:** Raw markdown editor using CodeMirror for advanced editing, with toolbar button to toggle between WYSIWYG and raw modes.

### Files & Components:
- **[src/hooks/useCodeMirror.ts](src/hooks/useCodeMirror.ts)**
  - Hook: `useCodeMirror()`
  - Initializes CodeMirror instance with markdown config
  - Handles theme (light/dark), syntax highlighting, line numbers
  - Exports ref + methods to sync content

- **[src/components/RawEditorView.tsx](src/components/RawEditorView.tsx)**
  - Component: `RawEditorView`
  - Renders CodeMirror editor fullscreen
  - Integrates with main editor for seamless switching
  - Toolbar button (`ToggleSourceViewButton`) in main toolbar

### Key Patterns:
- CodeMirror with markdown language support
- Theme sync with application (light/dark mode)
- Toolbar button with keyboard shortcut (e.g., `Cmd+Shift+E`)
- On toggle: transfer cursor position + scroll state between editors

---

## 5. Git History Panel & Diff View

**Purpose:** List git commits for current file + ability to view diffs using CodeMirror side-by-side.

### Files & Components:
- **[src/components/inspector/GitHistoryPanel.tsx](src/components/inspector/GitHistoryPanel.tsx)**
  - Component: `GitHistoryPanel`
  - Renders list of commits with timestamps, messages, authors
  - Click to view diff for that commit

- **[src/components/DiffView.tsx](src/components/DiffView.tsx)**
  - Component: `DiffView`  
  - Two-pane side-by-side CodeMirror instance (original vs. modified)
  - Syntax highlighting for added/removed lines
  - Integrates with git history selection

- **[src/hooks/useGitHistory.ts](src/hooks/useGitHistory.ts)**
  - Hook: `useGitHistory()`
  - Fetches commit history for a file
  - Returns commit list + diff content on selection

### Key Patterns:
- Git integration via Tauri IPC to native git commands
- CodeMirror used for diff visualization (not editing)
- Diff lines marked with CSS classes for coloring (added=green, removed=red)
- History panel + diff modal (or split pane)

---

## 6. Core File Locations & Structure

| Purpose | Location |
|---------|----------|
| UI Components | `src/components/` |
| Panels (TOC, Properties, History) | `src/components/inspector/` |
| Hooks (CodeMirror, Git, etc.) | `src/hooks/` |
| Utilities (parsing, indexing) | `src/utils/` |
| Main app entry | `src/App.svelte` |
| Configuration | `src/lib/config.ts` |
| CSS / Styling | `src/app.css` + component `.svelte` files |

---

## 7. Key Architectural Patterns

### State Management
- SvelteKit stores for reactive state (current note, open panels, etc.)
- Tauri IPC for native file system & git operations
- Local storage for UI preferences (theme, panel widths, etc.)

### Editor Integration
- Main editor built with TipTap (Vue) OR SvelteKit component
- Wikilinks use custom TipTap plugin for suggestions
- Source view uses CodeMirror as alternative editor
- Both sync content bidirectionally on mode toggle

### File Indexing  
- On app startup: scan vault directory
- Build in-memory index of note identifiers, titles, aliases
- Update index when files are created/deleted (file watcher)
- Query index for autocomplete suggestions

### UI Patterns
- Sidebar layout: TOC + Properties on left, main editor center, git history on right
- Modals for dialogs (e.g., "Create new note?" when [[]] has no match)
- Keyboard shortcuts for mode switching, navigation, etc.
- Theme-aware styling (light/dark mode switch)

---

## 8. Recommendations for Copying to MD4H

### Easy to Copy (Isolated)
1. **TOC parsing logic** (`tableOfContentsModel.ts`) - pure function, no Tauri deps
2. **Frontmatter parsing** (`frontmatter.ts`) - YAML parsing, self-contained
3. **Wikilink suggestion filtering** (`wikilinks.ts`) - algorithmic, no UI deps

### Medium Complexity (Requires Adaptation)
1. **TOC Panel UI** - adapt from Svelte to React/TipTap
2. **Properties Panel** - form field generation for dynamic YAML keys
3. **RawEditorView** - CodeMirror integration, likely similar to MD4H webview

### High Complexity (Major Integration)
1. **Git History Panel** - needs Tauri IPC on MD4H side OR VS Code extension API
2. **Full Source View Toggle** - requires switching between two editors + state sync

---

## 9. Files NOT Needed for MD4H

- Tauri-specific files (`src-tauri/`, `tauri.conf.json`)
- SvelteKit build config (`vite.config.ts`)
- Demo vault files (`demo-vault/`)

Focus on `src/` folder components and utilities.

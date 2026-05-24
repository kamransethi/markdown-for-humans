# Wikilinks Feature Specification

**Status**: Merged into main branch with architecture decision made  
**Source**: Extracted from chat session: main-chat-vs-code-file-commit-issue.jsonl  
**Last Updated**: May 24, 2026

---

## Executive Summary

The wikilinks feature enables markdown authors to create inline references to other documents in their workspace using the `[[filename]]` syntax. The feature integrates a lightweight note index to provide autocomplete suggestions and resolve wikilink references to actual files.

**Key Decision**: Replace Foam VSCode extension dependency with FluxFlow (internal indexer) as the note index source. This provides:
- ✅ Multi-root workspace support (files in any open folder)
- ✅ Standalone implementation (zero external dependencies)
- ✅ Single source of truth with existing knowledge graph indexing
- ✅ Synchronous, in-process queries vs async IPC

---

## Feature Requirements

### 1. Syntax Specification

Wikilinks use double-bracket syntax with three supported formats:

```markdown
[[identifier]]                    # Basic link to file named "identifier.md"
[[identifier|display text]]       # Link with custom display text
[[identifier#header]]             # Link to specific header in file
```

**Examples**:
```markdown
This references my [[notes]] file.
Check the [[AGENTS|development guide]] for details.
See the [[AGENTS#workflow]] section about commands.
```

### 2. Core Functionality

#### 2.1 Autocomplete (Suggestion)
- **Trigger**: User types `[[` in editor
- **Behavior**: 
  - Show dropdown menu with all markdown files in current workspace folder
  - Filter files as user continues typing identifier
  - Keyboard navigation (arrows, Enter to select, Escape to dismiss)
  - Selecting a file inserts `[[filename]]` at cursor
- **Implementation**: `WikilinkSuggestion.ts` using @tiptap/suggestion

#### 2.2 Link Rendering
- **Valid links**: Underlined, blue color, clickable
- **Broken links**: Red color (visual indication that file doesn't exist)
- **Implementation**: `WikilinkNode.ts` (TipTap inline node extension)
- **Click behavior**: Navigate to referenced file (future enhancement)

#### 2.3 Note Index Service
- **Purpose**: Maintain list of all markdown files in workspace
- **Scope**: Per-workspace-folder (multi-root support)
- **Data**: Document path, title, identifier
- **Updates**: Real-time when files are created/deleted/renamed
- **Implementation**: `WikilinkNoteIndexService` backed by FluxFlow

### 3. Multi-Root Workspace Support

**Requirement**: When user has multiple folders open (A, B, C), wikilinks must scope per folder:

```
Folder A (docs)         →  Database A
Folder B (blog)         →  Database B  
Folder C (wiki)         →  Database C

Active file in B → autocomplete shows only files from folder B
Active file in C → wikilink resolution checks only folder C
```

**Current State**: FluxFlow only indexes first workspace folder via `workspaceFolders?.[0]`  
**Required Change**: Support N databases (Map<workspacePath, GraphDatabase>) and select correct DB based on active document's URI

### 4. Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│  VS Code Editor (markdown file)                     │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│  WikilinkSuggestion.ts (TipTap)                    │
│  - Listens for [[ trigger                          │
│  - Queries WikilinkNoteIndexService                │
│  - Shows filtered autocomplete menu                │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│  WikilinkNoteIndexService                          │
│  - Per-workspace-folder note index                 │
│  - Backed by FluxFlow's GraphDatabase              │
│  - Exposes: getDocuments(), getDocumentsForFolder()│
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│  FluxFlow (src/features/fluxflow/)                 │
│  - Multi-root database support                     │
│  - Document indexing (path, title, headers)        │
│  - File watcher (create/delete/rename)             │
│  - SQLite persistence                              │
└─────────────────────────────────────────────────────┘
```

### 5. Implementation Changes Required

#### 5.1 FluxFlow Database Changes

**File**: `src/features/fluxflow/database.ts`

```typescript
// Add new method to retrieve all documents
getAllDocuments(): Array<{ id: string; path: string; title: string }>
```

#### 5.2 FluxFlow Index Multi-Root Support

**File**: `src/features/fluxflow/index.ts`

1. Change `database` from single instance to `Map<string, GraphDatabase>`
2. Change `watcher` from single instance to `Map<string, FluxFlowWatcher>`
3. Update `initialize()` to:
   - Initialize primary workspace DB
   - Initialize secondary workspace folders
   - Listen for `onDidChangeWorkspaceFolders` events
4. Update `fullIndex()` and `indexSingleFile()` to accept explicit `db` parameter
5. Add helper: `getDatabaseForUri(uri: Uri): GraphDatabase | undefined`

#### 5.3 Wikilink Note Index Service (New)

**File**: `src/services/WikilinkNoteIndexService.ts`

```typescript
export class WikilinkNoteIndexService {
  // Initialize with FluxFlow databases
  initialize(databases: Map<string, GraphDatabase>): void
  
  // Get all documents for a specific workspace folder
  getDocumentsForFolder(workspacePath: string): WikilinkDocument[]
  
  // Get document by identifier from folder
  resolveWikilink(identifier: string, workspacePath: string): WikilinkDocument | null
  
  // Get all documents (for debugging/stats)
  getAllDocuments(): WikilinkDocument[]
  
  // Subscribe to index updates
  onIndexUpdated(callback: () => void): void
}

interface WikilinkDocument {
  identifier: string    // filename without .md
  path: string          // full file path
  title: string         // from frontmatter or first heading
  folder: string        // workspace folder this doc belongs to
}
```

#### 5.4 Update WikilinkSuggestion.ts

**File**: `src/webview/extensions/WikilinkSuggestion.ts`

- Import `WikilinkNoteIndexService`
- On suggestion trigger (`[[`), query service for documents in current folder
- Pass editor.uri to service to determine correct workspace folder

#### 5.5 Update Extension Initialization

**File**: `src/extension.ts`

- Always initialize FluxFlow (no longer conditional on knowledge graph setting)
- Pass FluxFlow databases to WikilinkNoteIndexService

#### 5.6 Update Provider Message Passing

**File**: `src/editor/MarkdownEditorProvider.ts`

- When sending document URI to webview, include workspace folder info
- Pass note index updates to webview message handler

---

## Success Criteria

- [ ] **Autocomplete works**: Type `[[` shows file list filtered by folder
- [ ] **Multi-root correct**: Files in folder B don't appear when editing folder C
- [ ] **Broken links render**: Invalid `[[identifier]]` shows red color
- [ ] **Valid links render**: Valid `[[identifier]]` shows blue, underlined
- [ ] **Index updates real-time**: New files appear in autocomplete immediately
- [ ] **No external dependencies**: Zero dependency on Foam extension
- [ ] **All tests pass**: 100% test coverage of all three syntax formats
- [ ] **VSCode integration**: Feature works in actual VSCode environment

---

## Implementation Phases

### Phase 1: FluxFlow Multi-Root Support
1. Add `getAllDocuments()` to database.ts
2. Refactor index.ts for multi-database support
3. Update file watchers for N folders
4. Test with multiple workspace folders

### Phase 2: WikilinkNoteIndexService
1. Create new service class
2. Integrate with FluxFlow databases
3. Implement resolution logic per folder
4. Add event notifications

### Phase 3: Update TipTap Extensions
1. Update WikilinkSuggestion to use service
2. Update WikilinkNode to call service for broken-link detection
3. Pass document URI through message chain

### Phase 4: Testing
1. Unit tests for each service method
2. Integration tests with multi-root workspaces
3. End-to-end VSCode testing
4. Edge cases: file rename/delete, header references, aliases

---

## Edge Cases & Error Handling

1. **File doesn't exist**: Display red styling, don't auto-navigate
2. **Header reference (anchor)**: Resolve to file, highlight header on open
3. **Duplicate identifiers**: Prefer exact path match, fallback to first match
4. **File rename**: Update all references (future feature)
5. **Circular references**: Allowed (a.md → b.md → a.md)
6. **Special characters**: Escape filenames if needed (e.g., spaces in paths)

---

## Testing Strategy

### Test Fixtures
Location: `src/__tests__/wikilink_data/`

Available test markdown files:
- `home.md` - Root note
- `notes.md` - General notes
- `CLAUDE.md` - AI assistant notes
- `template.md` - Template file
- `new_file.md` - Test for new files
- `type.md` - Type definition file
- `untitled-template-*.md` - Generated template

### Test Files to Create

**1. WikilinkNoteIndexService.test.ts**
```
- Initialize with multiple database folders
- getDocumentsForFolder() returns correct docs
- resolveWikilink() per-folder scoping
- Index updates trigger callbacks
- Handles missing folders gracefully
```

**2. WikilinkNode.test.ts**
```
- Parses [[identifier]] syntax
- Parses [[identifier|alias]] syntax  
- Parses [[identifier#header]] syntax
- Detects broken links correctly
- Renders HTML with correct CSS classes
- Re-indexes when note list updates
```

**3. WikilinkSuggestion.test.ts**
```
- Triggers on [[ character sequence
- Filters documents by user input
- Keyboard navigation (up/down/select)
- Inserts correct syntax on selection
- Dismisses on Escape
- Per-folder filtering with multi-root
```

---

## Current Code Status

### Already Merged (from remote feature branch)
- ✅ `src/webview/extensions/WikilinkNode.ts` (5.1K)
- ✅ `src/webview/extensions/WikilinkSuggestion.ts` (7.1K)  
- ✅ `src/services/foam-integration.ts` (4.4K) - Will be replaced with WikilinkNoteIndexService
- ✅ Integration into `editor.ts` and `MarkdownEditorProvider.ts`

### Pending Implementation
- 🔄 FluxFlow multi-root refactoring (database.ts, index.ts)
- 🔄 WikilinkNoteIndexService (new service replacing foam-integration)
- 🔄 Test suite creation (.test.ts files)
- 🔄 Runtime VSCode verification
- 🔄 Edge case handling

---

## References

- **Related files**: 
  - WikilinkNode.ts implementation (5.1K, merged)
  - WikilinkSuggestion.ts implementation (7.1K, merged)
  - FluxFlow indexer (src/features/fluxflow/)
  - Knowledge graph feature (src/features/)

- **Architecture docs**: docs/ARCHITECTURE.md
- **Build system**: scripts/build-extension.js


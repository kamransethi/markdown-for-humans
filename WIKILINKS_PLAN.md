# Wikilinks Implementation Plan

**Scope**: Complete wikilinks feature with FluxFlow multi-root support  
**Target**: Main branch integration  
**Time Estimate**: 2-3 days (5-7 dev hours)

---

## Phase 1: FluxFlow Multi-Root Support (2-3 hours)

### Task 1.1: Add `getAllDocuments()` to GraphDatabase

**File**: `src/features/fluxflow/database.ts`

**After**: `getDocumentCount()` method

```typescript
/**
 * Get all documents in the database
 * @returns Array of document records with id, path, and title
 */
getAllDocuments(): Array<{ id: string; path: string; title: string }> {
  return this.db.prepare(`
    SELECT id, path, title FROM documents
    ORDER BY path ASC
  `).all() as Array<{ id: string; path: string; title: string }>;
}
```

**Testing**: Unit test verifying return structure and ordering

---

### Task 1.2: Refactor FluxFlow Index for Multi-Root

**File**: `src/features/fluxflow/index.ts`

**Changes**:

1. **Replace single database with Map**:
```typescript
// OLD:
let database: GraphDatabase | null = null;

// NEW:
const databases = new Map<string, GraphDatabase>();
let primaryDatabase: GraphDatabase | null = null;  // For backward compat
```

2. **Replace single watcher with Map**:
```typescript
// OLD:
let watcher: FluxFlowWatcher | null = null;

// NEW:
const watchers = new Map<string, FluxFlowWatcher>();
```

3. **Update initialize() function**:
```typescript
export async function initialize(): Promise<void> {
  const folders = vscode.workspace.workspaceFolders || [];
  
  if (folders.length === 0) {
    console.warn('FluxFlow: No workspace folders');
    return;
  }
  
  // Initialize primary (first) workspace
  await initializeWorkspaceFolder(folders[0].uri.fsPath);
  
  // Initialize additional folders
  for (let i = 1; i < folders.length; i++) {
    await initializeWorkspaceFolder(folders[i].uri.fsPath, false);
  }
  
  // Listen for workspace folder changes
  vscode.workspace.onDidChangeWorkspaceFolders((event) => {
    event.added.forEach((folder) => {
      initializeWorkspaceFolder(folder.uri.fsPath, false);
    });
    
    event.removed.forEach((folder) => {
      const path = folder.uri.fsPath;
      databases.delete(path);
      watchers.get(path)?.dispose();
      watchers.delete(path);
    });
  });
}

async function initializeWorkspaceFolder(
  workspacePath: string,
  isPrimary: boolean = true
): Promise<void> {
  try {
    const db = new GraphDatabase(workspacePath);
    await db.initialize();
    databases.set(workspacePath, db);
    
    if (isPrimary) {
      primaryDatabase = db;
    }
    
    // Start file watcher
    const watcher = new FluxFlowWatcher(workspacePath, db);
    watchers.set(workspacePath, watcher);
    
    // Initial indexing
    await db.fullIndex(workspacePath);
    
  } catch (error) {
    console.error(`FluxFlow: Failed to initialize ${workspacePath}:`, error);
  }
}
```

4. **Add accessor function**:
```typescript
export function getDatabaseForWorkspace(workspacePath: string): GraphDatabase | null {
  return databases.get(workspacePath) || null;
}

export function getPrimaryDatabase(): GraphDatabase | null {
  return primaryDatabase;
}

export function getAllDatabases(): Map<string, GraphDatabase> {
  return databases;
}
```

5. **Update fullIndex() to accept explicit db parameter**:
```typescript
// OLD: await db.fullIndex(workspacePath)
// NEW: Make it receive the db as parameter in watchers
```

**Testing**: 
- [ ] Initialize 3 separate workspace folders
- [ ] Verify each has separate database
- [ ] Verify onDidChangeWorkspaceFolders adds/removes folders correctly

---

## Phase 2: WikilinkNoteIndexService (1.5-2 hours)

### Task 2.1: Create WikilinkNoteIndexService Class

**File**: `src/services/WikilinkNoteIndexService.ts` (NEW)

```typescript
import * as vscode from 'vscode';
import { GraphDatabase } from '../features/fluxflow/database';

export interface WikilinkDocument {
  identifier: string;    // filename without .md (e.g., "notes" for "notes.md")
  path: string;          // absolute file path
  title: string;         // from frontmatter or first heading
  folder: string;        // workspace folder path
}

export class WikilinkNoteIndexService {
  private databases: Map<string, GraphDatabase>;
  private onIndexUpdatedCallbacks: Array<() => void> = [];

  constructor(databases: Map<string, GraphDatabase>) {
    this.databases = databases;
  }

  /**
   * Get all documents for a specific workspace folder
   */
  getDocumentsForFolder(workspacePath: string): WikilinkDocument[] {
    const db = this.databases.get(workspacePath);
    if (!db) {
      return [];
    }

    return db.getAllDocuments().map((doc) => ({
      identifier: this.pathToIdentifier(doc.path),
      path: doc.path,
      title: doc.title || this.pathToIdentifier(doc.path),
      folder: workspacePath,
    }));
  }

  /**
   * Get all documents across all workspace folders
   */
  getAllDocuments(): WikilinkDocument[] {
    const docs: WikilinkDocument[] = [];
    
    for (const [folder, db] of this.databases) {
      docs.push(
        ...db.getAllDocuments().map((doc) => ({
          identifier: this.pathToIdentifier(doc.path),
          path: doc.path,
          title: doc.title || this.pathToIdentifier(doc.path),
          folder,
        }))
      );
    }
    
    return docs;
  }

  /**
   * Resolve a wikilink [[identifier]] in the context of a specific folder
   * Returns the document if found, null otherwise
   */
  resolveWikilink(
    identifier: string,
    workspacePath: string
  ): WikilinkDocument | null {
    const docs = this.getDocumentsForFolder(workspacePath);
    return docs.find((doc) => doc.identifier === identifier) || null;
  }

  /**
   * Parse anchor references from identifier
   * e.g., "notes#setup" → { identifier: "notes", anchor: "setup" }
   */
  parseWikilinkReference(reference: string): {
    identifier: string;
    anchor?: string;
  } {
    const [identifier, anchor] = reference.split('#');
    return {
      identifier: identifier.trim(),
      anchor: anchor ? anchor.trim() : undefined,
    };
  }

  /**
   * Subscribe to index updates
   */
  onIndexUpdated(callback: () => void): vscode.Disposable {
    this.onIndexUpdatedCallbacks.push(callback);
    return {
      dispose: () => {
        const idx = this.onIndexUpdatedCallbacks.indexOf(callback);
        if (idx > -1) {
          this.onIndexUpdatedCallbacks.splice(idx, 1);
        }
      },
    };
  }

  /**
   * Notify all listeners that index has updated
   */
  notifyIndexUpdated(): void {
    for (const callback of this.onIndexUpdatedCallbacks) {
      callback();
    }
  }

  /**
   * Convert file path to wikilink identifier
   * e.g., "/path/to/notes.md" → "notes"
   */
  private pathToIdentifier(path: string): string {
    const filename = path.split('/').pop() || '';
    return filename.replace(/\.md$/, '');
  }
}
```

### Task 2.2: Export from Services

**File**: `src/services/index.ts`

```typescript
export { WikilinkNoteIndexService, type WikilinkDocument } from './WikilinkNoteIndexService';
```

**Testing**:
- [ ] getDocumentsForFolder returns correct docs
- [ ] resolveWikilink finds doc in folder
- [ ] resolveWikilink returns null for non-existent doc
- [ ] parseWikilinkReference extracts identifier and anchor correctly
- [ ] onIndexUpdated callbacks fire when notifyIndexUpdated called

---

## Phase 3: Update TipTap Extensions (1.5-2 hours)

### Task 3.1: Update WikilinkNode.ts

**File**: `src/webview/extensions/WikilinkNode.ts`

**Changes**:
1. Accept WikilinkNoteIndexService in editor initialization
2. Update `setWikilinkNoteIndex()` to accept service instance
3. Update `getIsBroken()` to query service based on active document's folder

```typescript
let wikilinkService: WikilinkNoteIndexService | null = null;
let currentDocumentFolder: string = '';

export function setWikilinkService(
  service: WikilinkNoteIndexService,
  docFolder: string
): void {
  wikilinkService = service;
  currentDocumentFolder = docFolder;
}

function getIsBroken(identifier: string): boolean {
  if (!wikilinkService || !currentDocumentFolder) {
    return false;
  }
  
  const doc = wikilinkService.resolveWikilink(identifier, currentDocumentFolder);
  return !doc;
}
```

### Task 3.2: Update WikilinkSuggestion.ts

**File**: `src/webview/extensions/WikilinkSuggestion.ts`

**Changes**:
1. Accept WikilinkNoteIndexService in constructor
2. Update `items()` function to call service instead of fixed list
3. Pass document folder to service query

```typescript
items: ({ query }) => {
  if (!wikilinkService || !currentDocumentFolder) {
    return [];
  }

  const docs = wikilinkService.getDocumentsForFolder(currentDocumentFolder);
  
  if (query.length === 0) {
    return docs;
  }

  return docs.filter((doc) =>
    doc.identifier.toLowerCase().includes(query.toLowerCase())
  );
},
```

**Testing**:
- [ ] Autocomplete triggers on [[
- [ ] Filters documents by user input
- [ ] Shows documents from current folder only
- [ ] Keyboard navigation works (arrow keys, enter, escape)

---

## Phase 4: Extension Initialization (1 hour)

### Task 4.1: Update extension.ts

**File**: `src/extension.ts`

**Changes**:
1. Always initialize FluxFlow (no conditional on KG setting)
2. Create WikilinkNoteIndexService after FluxFlow initializes
3. Pass service to editor webview

```typescript
import { WikilinkNoteIndexService } from './services';
import * as fluxflow from './features/fluxflow';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Always initialize FluxFlow for wikilinks support
  await fluxflow.initialize();

  // Create wikilink service
  const databases = fluxflow.getAllDatabases();
  const wikilinkService = new WikilinkNoteIndexService(databases);

  // Listen for index updates from watchers and notify service
  // (watchers will call wikilinkService.notifyIndexUpdated())

  // Pass service to editor provider
  const editorProvider = new MarkdownEditorProvider(context, wikilinkService);
  
  // ... rest of activation ...
}
```

### Task 4.2: Update MarkdownEditorProvider.ts

**File**: `src/editor/MarkdownEditorProvider.ts`

**Changes**:
1. Accept WikilinkNoteIndexService in constructor
2. When document opens, extract its workspace folder
3. Pass folder info to webview
4. Handle note index update messages

```typescript
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(
    private context: vscode.ExtensionContext,
    private wikilinkService: WikilinkNoteIndexService
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Get document's workspace folder
    const documentFolder = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;

    webviewPanel.webview.postMessage({
      type: 'READY',
      documentUri: document.uri.toString(),
      documentFolder,
      // ... other properties ...
    });
  }
}
```

**Testing**:
- [ ] FluxFlow initializes on extension activate
- [ ] WikilinkService created with all databases
- [ ] Document folder extracted and passed to webview

---

## Phase 5: Testing (2-3 hours)

### Task 5.1: Create WikilinkNoteIndexService Tests

**File**: `src/__tests__/services/WikilinkNoteIndexService.test.ts`

```typescript
describe('WikilinkNoteIndexService', () => {
  describe('getDocumentsForFolder', () => {
    it('returns documents from specific folder only', () => {
      // Create mock databases for folders A and B
      // Add docs to each
      // Call getDocumentsForFolder(folderA)
      // Verify only folderA docs returned
    });
  });

  describe('resolveWikilink', () => {
    it('resolves identifier to document in same folder', () => {});
    it('returns null for non-existent identifier', () => {});
    it('respects folder boundaries', () => {});
  });

  describe('parseWikilinkReference', () => {
    it('extracts identifier from reference', () => {});
    it('extracts anchor from reference', () => {});
    it('handles edge cases', () => {});
  });

  describe('index updates', () => {
    it('notifies listeners on index update', () => {});
  });
});
```

### Task 5.2: Create WikilinkNode Tests

**File**: `src/__tests__/webview/extensions/WikilinkNode.test.ts`

```typescript
describe('WikilinkNode', () => {
  describe('parsing', () => {
    it('parses [[identifier]] syntax', () => {});
    it('parses [[identifier|alias]] syntax', () => {});
    it('parses [[identifier#header]] syntax', () => {});
  });

  describe('rendering', () => {
    it('renders valid links with blue CSS class', () => {});
    it('renders broken links with red CSS class', () => {});
    it('renders aliases correctly', () => {});
  });

  describe('broken link detection', () => {
    it('detects broken links correctly', () => {});
    it('updates when service notifies', () => {});
  });
});
```

### Task 5.3: Create WikilinkSuggestion Tests

**File**: `src/__tests__/webview/extensions/WikilinkSuggestion.test.ts`

```typescript
describe('WikilinkSuggestion', () => {
  describe('trigger', () => {
    it('triggers on [[ character sequence', () => {});
  });

  describe('filtering', () => {
    it('filters documents by user input', () => {});
    it('shows documents from current folder only', () => {});
  });

  describe('interaction', () => {
    it('navigates with arrow keys', () => {});
    it('inserts syntax on selection', () => {});
    it('dismisses on escape', () => {});
  });
});
```

---

## Dependency Map

```
extension.ts
├── fluxflow.initialize()          (already exists)
├── WikilinkNoteIndexService       (NEW, created here)
└── MarkdownEditorProvider         (updated to accept service)
    │
    └── editor.ts (webview)
        ├── WikilinkNode           (updated)
        ├── WikilinkSuggestion     (updated)
        └── receives documentFolder in READY message
```

---

## Verification Checklist

- [ ] **Lint**: `npm run lint` passes with 0 errors
- [ ] **Build**: `npm run build:debug` succeeds
- [ ] **Tests**: `npm test` passes (100+ wikilinks tests)
- [ ] **Multi-root**: Test with 3+ folders open
- [ ] **Autocomplete**: Type `[[` shows correct folder's files
- [ ] **Broken links**: Invalid refs display in red
- [ ] **Valid links**: Valid refs display in blue, underlined
- [ ] **Real VSCode**: Open extension in VSCode, manually verify feature

---

## Git Commit Strategy

1. **Commit 1** `feat(wikilinks): Add getAllDocuments to FluxFlow database`
2. **Commit 2** `feat(wikilinks): Add multi-root support to FluxFlow index`
3. **Commit 3** `feat(wikilinks): Create WikilinkNoteIndexService`
4. **Commit 4** `feat(wikilinks): Update WikilinkNode and WikilinkSuggestion`
5. **Commit 5** `feat(wikilinks): Integrate service into extension and editor`
6. **Commit 6** `test(wikilinks): Add comprehensive test suite`

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| FluxFlow refactor breaks existing features | Maintain backward compat with `primaryDatabase` variable |
| Multi-root breaks single-workspace users | Always initialize folder 0 as primary, defaults to old behavior |
| Service not updated on file changes | Wire FluxFlow watchers to call `service.notifyIndexUpdated()` |
| Webview doesn't receive folder info | Test message passing in MarkdownEditorProvider |


# Foam Architecture Index

**Purpose:** Quick reference guide for copying wikilink/graph/indexing patterns from Foam into the MD4H editor.

**Tech Stack:**
- **Framework:** TypeScript (browser + Node.js compatible)
- **Main Package:** `@foam/core` - platform-agnostic note & graph model
- **VS Code Extension:** `foam-vscode` - VS Code UI layer
- **Parser:** remark + remark-plugins (markdown processing)
- **Graph:** in-memory directed graph structure
- **Dependencies:** minimized (lodash, lru-cache)

---

## 1. Core Workspace Model

**Purpose:** Central repository managing all notes/resources with trie-based lookup and event system.

### Files:
- **[packages/foam-core/src/model/workspace.ts](packages/foam-core/src/model/workspace.ts)**
  - Class: `FoamWorkspace`
  - Manages all resources (notes, attachments)
  - Reversed trie for efficient URI-based lookup
  - Methods:
    - `find(uri: URI): Resource | undefined`
    - `getAll(): Resource[]`
    - Events: `onDidAdd`, `onDidUpdate`, `onDidDelete`
  - Handles identifier resolution for short-form linking

### Key Patterns:
- URI-based lookups (not path strings)
- Event emitter for reactive updates
- Reversed trie for fast tree-based searching
- Resource objects have: URI, title, content, sections, etc.

---

## 2. Graph Model (Links & Backlinks)

**Purpose:** Manages relationships between resources (links → targets) with real-time updates.

### Files:
- **[packages/foam-core/src/model/graph.ts](packages/foam-core/src/model/graph.ts)**
  - Class: `FoamGraph`
  - Builds directed graph: source note → target note via wikilink
  - Methods:
    - `getLinks(uri: URI): Link[]` - outgoing links from a note
    - `getBacklinks(uri: URI): Link[]` - incoming links to a note  
    - `getConnectedNotes(uri: URI): Resource[]` - related notes
  - Handles placeholder resources for broken links
  - Reactive: updates when workspace changes

### Data Structures:
- `Link` object: `{ source: URI, target: URI, label: string }`
- Maintains bidirectional mapping for fast lookup

### Key Patterns:
- Graph updates automatically when workspace changes
- Placeholder nodes for non-existent targets (broken links)
- Supports multiple link types (wikilinks, markdown links, etc.)

---

## 3. Wikilink Indexing & Suggestion System

**Purpose:** Index all notes by identifier (short name) for autocomplete suggestions.

### Files:
- **[packages/foam-vscode/src/vscode/features/navigation/link-completion.ts](packages/foam-vscode/src/vscode/features/navigation/link-completion.ts)**
  - Class: `WikilinkCompletionProvider`
  - Implements VS Code `CompletionItemProvider` interface
  - Triggers on `[[` character
  - Methods:
    - `provideCompletionItems(document, position)` → `CompletionItem[]`
    - Filters notes by prefix matching (title, identifier, aliases)
    - Returns up to 20 matches with "Create new note" option
  - Icon/formatting for visual distinction

- **[packages/foam-vscode/src/vscode/features/navigation/wikilink-utils.ts](packages/foam-vscode/src/vscode/features/navigation/wikilink-utils.ts)**
  - Functions: `extractWikilinkFromRange()`, `parseWikilink()`, `getWikilinkKind()`
  - Regex-based parsing of `[[identifier]]` syntax
  - Handles optional display text: `[[identifier|display text]]`
  - Detects if wikilink is broken vs. valid

### Key Patterns:
- Index built on demand from `FoamWorkspace`
- Filter algorithm: title prefix, identifier prefix, alias matching
- Completion item icons indicate note type/status
- "Create new" option automatically creates new file with identifier

---

## 4. Hover Preview Provider

**Purpose:** On hover of a wikilink, show preview card with linked note content.

### Files:
- **[packages/foam-vscode/src/vscode/features/navigation/hover-provider.ts](packages/foam-vscode/src/vscode/features/navigation/hover-provider.ts)**
  - Class: `WikilinkHoverProvider`
  - Implements VS Code `HoverProvider` interface
  - Methods:
    - `provideHover(document, position)` → `Hover | null`
  - Extracts wikilink at position
  - Fetches target note from workspace
  - Formats markdown preview (first few lines, code block, etc.)

### Key Patterns:
- Hover triggered on any part of `[[...]]`
- Preview shows: title + first paragraph + backlinks count
- Markdown rendering with code syntax highlighting
- Click-able link to open the referenced note

---

## 5. Note Graph / Visualization

**Purpose:** Visual graph showing notes as nodes, links as edges.

### Files:
- **[packages/foam-graph/src/](packages/foam-graph/src/)**
  - Web component: `<foam-graph>` 
  - Renders interactive force-directed graph
  - Dependencies: d3-force, d3-scale, d3-color, happy-dom (testing)
  - Uses Lit for web component lifecycle

- **[packages/foam-graph/src/protocol.ts](packages/foam-graph/src/protocol.ts)**
  - Message contract between VS Code extension + webview
  - Exports: `GraphMessage`, `NodeData`, `LinkData` interfaces
  - Used by foam-vscode extension to pass graph data to webview

### Key Patterns:
- Force-directed simulation for automatic layout
- Color-coded nodes (status, type)
- Hover + click interactions on nodes
- Real-time updates as graph changes

---

## 6. Resource & Provider Pattern

**Purpose:** Pluggable architecture for different file/content types.

### Files:
- **[packages/foam-core/src/model/provider.ts](packages/foam-core/src/model/provider.ts)**
  - Interface: `ResourceProvider`
  - Methods: `recognizes(uri)`, `parseResource(text, uri)`, `serialize(resource)`
  - Extensible: add new providers for new file types

- **[packages/foam-core/src/provider/markdown-provider.ts](packages/foam-core/src/provider/markdown-provider.ts)**
  - Class: `MarkdownResourceProvider`
  - Parses `.md` files into `Resource` objects
  - Extracts: title, aliases, sections, front matter
  - Uses remark for AST parsing

### Key Patterns:
- Each provider handles one file type (`.md`, `.txt`, `.canvas`, etc.)
- Providers register with workspace
- Parsing decoupled from storage (DataStore)

---

## 7. Frontmatter / Metadata

**Purpose:** Parse and extract YAML front matter from markdown.

### Files:
- **[packages/foam-core/src/utils/frontmatter.ts](packages/foam-core/src/utils/frontmatter.ts)**
  - Functions: `parseFrontmatter()`, `serializeFrontmatter()`
  - Extracts YAML front matter block (top of markdown)
  - Returns object: `{ tags: string[], aliases: string[], custom_key: value }`
  - Handles edge cases (no frontmatter, malformed YAML)

### Key Patterns:
- Frontmatter delimited by `---` (YAML standard)
- Aliases used for wikilink lookup (expand search surface)
- Tags extracted for categorization
- Custom properties preserved but not used by core

---

## 8. File Lookup & URI Resolution

**Purpose:** Resolve short identifiers (note title) to full URI paths.

### Files:
- **[packages/foam-core/src/model/identifier.ts](packages/foam-core/src/model/identifier.ts)**
  - Functions: `createIdentifier()`, `getIdentifier(resource)`
  - Identifier: derived from filename or front matter
  - Handles collisions (same identifier in different folders)
  - Case-insensitive matching

### Key Patterns:
- Identifier = filename without extension (default)
- Can be overridden in front matter `---\nidentifier: custom_name\n---`
- Lookup supports prefix matching (autocomplete)
- Collision handling: prefer exact matches, then prefix matches

---

## 9. Data Store Interface

**Purpose:** Abstract file system operations for platform independence.

### Files:
- **[packages/foam-core/src/model/datastore.ts](packages/foam-core/src/model/datastore.ts)**
  - Interface: `IDataStore`
  - Methods: `readFile()`, `writeFile()`, `deleteFile()`, `listFiles()`
  - Platform-agnostic: implemented separately for VS Code, CLI, browser

- **[packages/foam-vscode/src/vscode/services/vscode-datastore.ts](packages/foam-vscode/src/vscode/services/vscode-datastore.ts)**
  - Class: `VscodeDataStore`
  - Implements `IDataStore` using VS Code API
  - Converts URI ↔ filesystem path

### Key Patterns:
- Dependency injection of DataStore at startup
- FileWatcher integration for real-time updates
- Error handling for missing files, permission issues

---

## 10. Core File Locations & Structure

| Purpose | Location |
|---------|----------|
| Core model (Workspace, Graph, Resources) | `packages/foam-core/src/model/` |
| Providers (parsing) | `packages/foam-core/src/provider/` |
| Utilities (identifier, frontmatter, etc.) | `packages/foam-core/src/utils/` |
| VS Code UI features | `packages/foam-vscode/src/vscode/features/` |
| Link/wikilink navigation | `packages/foam-vscode/src/vscode/features/navigation/` |
| Graph visualization | `packages/foam-graph/src/` |
| Tests | `packages/foam-core/src/**/*.test.ts` |

---

## 11. Key Architectural Patterns

### Platform Independence
- `@foam/core` has ZERO VS Code dependencies
- DataStore abstraction for file system
- Workspace + Graph work in browser environment (for web app)
- URI objects used throughout (not path strings)

### Event-Driven Architecture
- Workspace emits: `onDidAdd`, `onDidUpdate`, `onDidDelete` per resource
- Graph subscribes to workspace changes, updates automatically
- Features can listen to graph/workspace events

### Trie-Based Indexing
- Reversed trie for URI lookup: efficient prefix matching
- Used internally by workspace for collision resolution
- Enables fast autocomplete filtering

### Resource Abstraction
- Resource = generic container for any file type
- Provides: URI, title, sections, links, aliases, front matter
- Extensible via ResourceProvider pattern

---

## 12. Recommendations for Copying to MD4H

### Easy to Copy (Isolated, No Deps)
1. **Identifier resolution** (`identifier.ts`) - pure functions
2. **Frontmatter parsing** (`frontmatter.ts`) - YAML parser
3. **Wikilink regex & parsing** (`wikilink-utils.ts`) - regex patterns
4. **Link/Backlink algorithms** (Graph.getLinks) - graph traversal logic

### Medium Complexity (Requires Adaptation)
1. **Workspace indexing model** - adapt trie concept to TipTap/editor state
2. **ResourceProvider pattern** - useful for supporting multiple note types
3. **Hover provider logic** - adapt to TipTap hover plugin system
4. **Autocomplete filtering** - copy filtering algorithm, adapt to TipTap suggestion

### Reference Only (Too Heavy for MD4H)
1. **Full FoamWorkspace class** - too much structure for single-file editor
2. **Graph visualization** - separate concern (if needed, use D3 directly)
3. **File watcher + DataStore** - handled by VS Code API on extension side

---

## 13. Most Useful Code Segments to Copy

### Wikilink Parsing
```typescript
// From foam-vscode/src/vscode/features/navigation/wikilink-utils.ts
export const WIKILINK_REGEX = /\[\[([^\[\]]+)\]\]/;
export const WIKILINK_REGEX_GLOBAL = /\[\[([^\[\]]+)\]\]/g;

export function parseWikilink(text: string) {
  const match = text.match(WIKILINK_REGEX);
  return match ? { identifier: match[1], label: match[1] } : null;
}
```

### Identifier Resolution
```typescript
// From foam-core/src/model/identifier.ts
export function getIdentifier(resource: Resource): string {
  if (resource.metadata?.identifier) return resource.metadata.identifier;
  return resource.uri.getBasename().replace(/\.[^.]+$/, '');
}
```

### Autocomplete Filtering
```typescript
// From foam-vscode/src/vscode/features/navigation/link-completion.ts
function filterNotes(query: string, notes: Resource[]): Resource[] {
  const lower = query.toLowerCase();
  return notes.filter(n => 
    n.title.toLowerCase().includes(lower) ||
    n.identifier.toLowerCase().includes(lower) ||
    n.aliases?.some(a => a.toLowerCase().includes(lower))
  );
}
```

---

## 14. Integration Strategy for MD4H

### Phase 1: Wikilink Basics
- Use `WIKILINK_REGEX` pattern for detection
- Implement autocomplete with simple array filter
- Show valid/broken styling

### Phase 2: Preview + Graph
- Add hover provider (similar to Foam)
- Wire up note backlinks to show related notes

### Phase 3: Advanced
- Implement full identifier index + collision resolution
- Support aliases for expanded lookup surface
- Sync with front matter metadata

---

**Last Updated:** As of latest Foam commits
**Foam Repository:** https://github.com/foambubble/foam

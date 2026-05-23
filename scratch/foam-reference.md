# Foam Source Reference
> Foam is a VS Code extension (workspace: `packages/foam-vscode`) providing personal knowledge management — wikilinks, graph view, note connections. It runs in VS Code's extension host (TypeScript) and uses native VS Code APIs.
> Source: `/Users/kamran/Documents/GitHub/foam/`

---

## Stack Summary
| Layer | Tech |
|-------|------|
| Platform | VS Code Extension (`CustomTextEditorProvider` NOT used — it's a language extension) |
| Markdown parser | Remark + custom plugins (`remark-wiki-link`, `remark-frontmatter`) |
| Indexing | Reversed trie (`TrieMap`) for fast resource lookup |
| Graph | Custom `FoamGraph` with `Map<string, Connection[]>` |
| Completion | `vscode.languages.registerCompletionItemProvider()` |
| Hover | `vscode.languages.registerHoverProvider()` |
| Tree views | `vscode.window.createTreeView()` |
| Tests | Vitest (unit) + VS Code Extension Host (integration) |

> **Important:** Foam's wikilink completion and hover work on the **native VS Code text editor**. They register on the `markdown` language ID. They do NOT work inside a webview CustomTextEditorProvider. This is the key architectural difference when adapting for this project.

---

## Feature 1: Wikilink Indexing (Workspace + Graph)

### Core model (platform-agnostic — `packages/foam-core/src/model/`)

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-core/src/model/workspace.ts` | `FoamWorkspace` class | Stores all resources in a reversed trie (`_resources: TrieMap`); resolves URIs; fires `onDidAdd`, `onDidUpdate`, `onDidDelete` events; `find(uri, relativeTo?)` does exact → basename → identifier resolution |
| `packages/foam-core/src/model/graph.ts` | `FoamGraph` class, `Connection` type | Maintains `links` and `backlinks` maps keyed by URI path; creates placeholder URIs for broken links; `FoamGraph.fromWorkspace()` static factory iterates all resources to build | `Connection = {source: URI, target: URI, link: ResourceLink}` |
| `packages/foam-core/src/model/note.ts` | `Resource`, `ResourceLink`, `Section`, `Block`, `Tag`, `Alias`, `Footnote` | Core note type: `Resource.properties` = frontmatter, `Resource.sections` = headings, `Resource.blocks` = code/list/paragraph with `^id` anchors, `Resource.links` = outgoing wikilinks |
| `packages/foam-core/src/model/uri.ts` | `URI` class | Immutable wrapper; `URI.isPlaceholder()` for broken links; supports wikilink fragments `note#section`, `note#^blockid` |
| `packages/foam-core/src/model/tags.ts` | `FoamTags` | Indexes all `#hashtags` + frontmatter `tags:` → `Map<label, location[]>` |
| `packages/foam-core/src/model/foam.ts` | `Foam` interface | Bootstrap: `{workspace, graph, tags, ...}` |

### Services (parsing + resolution)

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-core/src/services/markdown-parser.ts` | `createMarkdownParser()`, `ParserPlugin` interface | Remark AST parser; extracts sections, links, tags, blocks, frontmatter; cached by URI + checksum. `ParserPlugin` hooks: `visit()`, `onDidFindProperties()` |
| `packages/foam-core/src/services/markdown-provider.ts` | `MarkdownResourceProvider` class, `createMarkdownReferences()` | Resolves wikilinks to URIs via `workspace.find()`; parses `.md` files; implements `ResourceProvider` interface |
| `packages/foam-core/src/services/markdown-link.ts` | `MarkdownLink.analyzeLink()`, `MarkdownLink.createUpdateLinkEdit()` | Parses `[[note|alias]]`, `[[note#section]]`, `[[note#^blockid]]`, `[alias](link#section)`; used for link refactoring |
| `packages/foam-core/src/services/attachment-provider.ts` | `AttachmentProvider` class | Handles non-markdown files (images, PDFs) as lightweight `attachment` resources |
| `packages/foam-core/src/services/datastore.ts` | `IDataStore` interface | Abstract file system; watches files; filters by extension; platform-agnostic I/O boundary |
| `packages/foam-core/src/services/graph-data-builder.ts` | `buildGraphData()` | Transforms workspace resources + connections into graph visualization format `BuiltGraphData = {nodeInfo, links}` |

### Resolution Algorithm

```
1. Parse: [[note#section|alias]]  →  target="note", fragment="#section"
2. workspace.find("note", relativeToUri):
   a. Exact URI path match
   b. Case-insensitive basename match
   c. Shortest unique identifier (trie lookup)
3. Not found → URI.placeholder("note")
4. Fragment → append to resolved URI
5. Result: full target URI for navigation / hover / embedding
```

Key files: `workspace.ts` (`find()`, `resolveLink()`), `markdown-provider.ts` (`resolveLink()`), `markdown-link.ts` (`analyzeLink()`)

---

## Feature 2: Wikilink Autocomplete (Completion)

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-vscode/src/vscode/features/navigation/link-completion.ts` | `WikilinkCompletionProvider`, `SectionCompletionProvider`, `WIKILINK_REGEX`, `linkCommitCharacters` | Triggered on `[[`; filters resources by cursor prefix; supports `\|` alias divider and `#` section divider; `completion.label` config = path/title/identifier; `completion.linkFormat` = wikilink vs. markdown. Implements `vscode.CompletionItemProvider` |
| `packages/foam-vscode/src/vscode/features/tags/tag-completion.ts` | `TagCompletionProvider`, `HASH_REGEX` | Triggered on `#`; works in frontmatter `tags:` field AND inline hashtags; detects YAML boundaries. Implements `vscode.CompletionItemProvider` |
| `packages/foam-vscode/src/vscode/features/daily-notes/completion-provider.ts` | `DateCompletionProvider` | Date snippet completion for daily note templates |

**Registration pattern:**
```typescript
vscode.languages.registerCompletionItemProvider(
  { language: 'markdown' },
  new WikilinkCompletionProvider(foam),
  '[', '['  // trigger characters
)
```

> **⚠️ Webview caveat:** These providers fire on native VS Code markdown text editors ONLY. Inside a CustomTextEditorProvider webview they never trigger. For TipTap-based WYSIWYG, completion must be implemented as a TipTap `@tiptap/suggestion` extension sending messages to extension host for file list.

---

## Feature 3: Wikilink Hover Preview

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-vscode/src/vscode/features/navigation/hover-provider.ts` | `HoverProvider`, `CONFIG_KEY = 'links.hover.enable'` | Registers `vscode.HoverProvider`; on hover → parse document links → resolve target via `workspace.resolveLink()` → get backlinks from `graph.getBacklinks(uri)` → render markdown with up to 10 backlinks + command links to open them |

**Flow:**
```
1. User hovers over [[note]] in VS Code text editor
2. HoverProvider.provideHover(document, position) fires
3. Parse document → find ResourceLink at cursor position
4. workspace.resolveLink(sourceResource, link) → targetUri
5. graph.getBacklinks(targetUri) → filter out self-refs → take first 10
6. Format as markdown hover: title + backlinks with vscode: command URIs
```

> **⚠️ Webview caveat:** Same as completion — fires on native VS Code editor only. For webview WYSIWYG, hover preview needs to be handled inside the webview (TipTap extension listening to mouse events on wikilink nodes).

---

## Feature 4: TOC / Document Outline

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-core/src/commands/outline.ts` | `outlineData()`, `OutlineSection`, `OutlineResult` | Pure function; given a Resource, returns sections with label, level, range. `OutlineResult = {id, uri, sections: OutlineSection[]}` |
| `packages/foam-core/src/model/note.ts` | `Resource.sections: Section[]` | Populated by markdown parser during AST traversal; includes level (1-6), heading text, range |

**How it works:**
- `outlineData(workspace, resource)` → `OutlineResult`
- Each `Section` has: `label`, `level`, `range: {start, end}` (line numbers)
- Foam does NOT provide a custom outline panel in VS Code sidebar — uses VS Code's native outline/breadcrumbs via built-in symbol resolution

**Adaptation note:** `outlineData()` is a pure function — directly portable. Pair with VS Code `DocumentSymbolProvider` registration to power native outline, OR call from extension host to send section list to webview.

---

## Feature 5: Front Matter / Properties

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-core/src/utils/template-frontmatter-parser.ts` | `extractFoamTemplateFrontmatterMetadata()`, `removeFoamMetadata()` | Extracts `foam_template:` block from YAML frontmatter using `gray-matter`; returns `[Map<string, string>, remainingContent]` |
| `packages/foam-core/src/services/markdown-parser.ts` | (frontmatter plugin) | `remark-frontmatter` plugin populates `Resource.properties: Record<string, any>` from YAML |
| `packages/foam-core/src/model/note.ts` | `Resource.properties` | Any YAML frontmatter key → `properties` dict; used for type, status, date, tags |
| `packages/foam-vscode/src/vscode/features/preview/foam-query-renderer.ts` | Query renderer | Foam query language supports `properties.status`, `properties.date` dot notation |
| `packages/foam-vscode/src/vscode/features/tags/tag-completion.ts` | `isInFrontMatter()` helper | Detects YAML frontmatter region (checks `---` delimiters at file start) for scoping completion |

**Key pattern — frontmatter detection:**
```typescript
function isInFrontMatter(document, position): boolean {
  // Scans backwards from position for '---' delimiter at line 0
}
```

---

## Feature 6: Note Graph & Connections

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-core/src/model/graph.ts` | `FoamGraph.fromWorkspace()`, `getLinks()`, `getBacklinks()`, `getAllConnections()` | Static factory builds graph from workspace; `getBacklinks(uri)` returns all incoming connections |
| `packages/foam-vscode/src/vscode/features/notes/connections.ts` | `ConnectionsTreeDataProvider` | VS Code tree view: forward links, backlinks, or all connections for active note; syncs on editor change + graph updates |
| `packages/foam-vscode/src/vscode/utils/tree-views/tree-view-utils.ts` | `createConnectionItemsForResource()`, `createBacklinkItemsForResource()` | Render connection tree items with link ranges, clickable URIs |
| `packages/foam-vscode/src/vscode/features/graph-webview/index.ts` | Graph webview activation | Opens graph visualization webview using `@foam/graph-view`; sends `buildGraphData()` result; updates on workspace changes |
| `packages/foam-vscode/src/vscode/features/notes/placeholders.ts` | `PlaceholderTreeView` | Panel showing broken links (placeholders); click to create note |
| `packages/foam-vscode/src/vscode/features/notes/orphans.ts` | `OrphansTreeView` | Panel showing notes with no incoming backlinks |

---

## Preview Rendering (Wikilink Embedding)

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-vscode/src/vscode/features/preview/wikilink-embed.ts` | markdown-it plugin | `![[note#section]]` → embeds section content inline in preview |
| `packages/foam-vscode/src/vscode/features/preview/wikilink-navigation.ts` | markdown-it plugin | `[[note#section]]` → clickable link with `vscode:` command URI |
| `packages/foam-vscode/src/vscode/features/preview/index.ts` | Preview feature registration | Chains: escape pipes → remove refs → embed wikilinks → navigate wikilinks → tag highlighting |

---

## Link Refactoring / Editing

| File | Key Exports | Notes |
|------|-------------|-------|
| `packages/foam-vscode/src/vscode/features/editing/update-wikilinks.ts` | `CONVERT_WIKILINK_TO_MDLINK` command | Auto-generate link reference definitions; CodeLens showing definition count |
| `packages/foam-vscode/src/vscode/features/editing/refactor.ts` | Bulk rename | Renames note + updates all wikilinks referencing it via `getRenameOperations()` |
| `packages/foam-vscode/src/vscode/features/editing/heading-rename-provider.ts` | `vscode.RenameProvider` | Rename heading → update all `[[note#heading]]` fragments |
| `packages/foam-vscode/src/vscode/features/editing/block-rename-provider.ts` | `vscode.RenameProvider` | Rename block anchor → update all `[[note#^blockid]]` fragments |
| `packages/foam-vscode/src/vscode/features/editing/convert-links.ts` | Convert command | Toggle between `[[wikilink]]` and `[title](path)` format |
| `packages/foam-core/src/janitor/rule-check-links.ts` | `checkLinks()`, `checkDuplicateBlocks()` | Validates links: ambiguous identifiers, unknown sections/blocks, duplicate block IDs |

---

## VS Code API Usage Map

| VS Code API | Foam Feature | File |
|------------|-------------|------|
| `registerCompletionItemProvider()` | Wikilink, section, tag, date completion | link-completion.ts, tag-completion.ts |
| `registerHoverProvider()` | Hover preview (backlinks) | hover-provider.ts |
| `createTreeView()` | Notes, connections, placeholders, orphans, tags panels | notes-explorer.ts, connections.ts, etc. |
| `registerWebviewPanelSerializer()` | Graph panel persistence | graph-webview/index.ts |
| `registerRenameProvider()` | Rename heading/block anchors | heading-rename-provider.ts, block-rename-provider.ts |
| `registerCodeLensProvider()` | Link reference definition count | update-wikilinks.ts |

---

## File Location Quick Reference

---

## ✅ Verified Integration API (v0.40.4)

> Confirmed against installed bundle `~/.vscode/extensions/foam.foam-vscode-0.40.4/` AND
> source at `/Users/kamran/Documents/GitHub/foam`. Versions match (0.40.4).

### Activation

```typescript
// Foam activates on VS Code startup (empty activationEvents = *)
// Returns undefined if no workspace folder is open — ALWAYS null-check
const ext = vscode.extensions.getExtension('foam.foam-vscode');
const api = await ext?.activate(); // { foam: Foam, extendMarkdownIt }
const foam = api?.foam;            // null if no workspace open
```

Bundle confirms: `return{extendMarkdownIt:...,foam:T}` — `T` is the `Foam` object.

### FoamWorkspace API

```typescript
foam.workspace.list()                    // Resource[] — all notes + attachments
foam.workspace.find(id, relativeTo?)     // Resource | null — resolve by identifier
foam.workspace.getIdentifier(uri)        // string — shortest unambiguous identifier
foam.workspace.onDidAdd(listener)        // → IDisposable
foam.workspace.onDidUpdate(listener)     // → IDisposable (fires with {old, new})
foam.workspace.onDidDelete(listener)     // → IDisposable
```

### Resource fields

```typescript
{
  uri: URI,              // .toFsPath() → filesystem path
  type: 'note' | 'attachment',
  title: string,         // first H1, or filename if no H1
  properties: any,       // frontmatter key-value pairs
  aliases: { title: string }[],
  sections: { label: string; level: number; range: {...} }[],
  links: ResourceLink[], // outgoing [[wikilinks]]
  tags: { label: string }[],
}
```

### FoamGraph API

```typescript
foam.graph.getBacklinks(uri)   // Connection[] — incoming links
foam.graph.getLinks(uri)       // Connection[] — outgoing links
foam.graph.placeholders        // Map<string, URI> — broken link targets
foam.graph.onDidUpdate(fn)     // → IDisposable

// Connection = { source: URI, target: URI, link: ResourceLink }
```

### Integration service

See: `src/services/foam-integration.ts` — ready-to-use wrapper with:
- `foamIntegration.connect()` → `Promise<boolean>` (connect at extension activate)
- `foamIntegration.getNoteList()` → `WikilinkNote[]` (cached, auto-invalidates)
- `foamIntegration.findNote(identifier)` → `WikilinkNote | null`
- `foamIntegration.resolveWikilinkUri(identifier)` → `vscode.Uri | null`
- `foamIntegration.getBacklinks(fsPath)` → `BacklinkEntry[]`
- `foamIntegration.onDidChange(fn)` → `IDisposable`
- `foamIntegration.isAvailable` → `boolean`

### Usage in MarkdownEditorProvider

```typescript
// On extension activate (extension.ts):
await foamIntegration.connect();

// On webview message 'wikilinkSuggest':
case 'wikilinkSuggest': {
  const query = (message.query as string).toLowerCase();
  const notes = foamIntegration.getNoteList()
    .filter(n =>
      n.title.toLowerCase().includes(query) ||
      n.identifier.toLowerCase().includes(query) ||
      n.aliases.some(a => a.toLowerCase().includes(query))
    )
    .slice(0, 20);
  webview.postMessage({ type: 'wikilinkSuggestions', notes });
  break;
}

// On webview message 'openWikilink':
case 'openWikilink': {
  const uri = foamIntegration.resolveWikilinkUri(message.identifier as string);
  if (uri) {
    vscode.commands.executeCommand('vscode.openWith', uri, 'markdown-for-humans.editor');
  }
  break;
}
```

### Edge cases & reliability

| Situation | Behaviour |
|-----------|-----------|
| Foam not installed | `connect()` returns `false`; all methods return empty/null |
| No workspace folder open | Foam's `activate()` returns `undefined`; same graceful degradation |
| Foam activation throws | Caught in `connect()`; logs error; service disabled |
| Notes added/deleted | `onDidAdd/Update/Delete` events invalidate cache automatically |
| Calling `connect()` twice | Safe — activation is memoised; same instance returned |

---

```
packages/foam-core/src/
├── model/
│   ├── workspace.ts ........... FoamWorkspace (reversed trie, onDidAdd/Update/Delete)
│   ├── graph.ts ............... FoamGraph (links+backlinks maps, Connection type)
│   ├── note.ts ................ Resource, ResourceLink, Section, Block, Tag
│   ├── uri.ts ................. URI (wikilink targets, placeholder support)
│   ├── tags.ts ................ FoamTags (hashtag + frontmatter tag index)
│   └── foam.ts ................ Foam bootstrap interface
│
├── services/
│   ├── markdown-parser.ts ..... Remark AST → Resource; ParserPlugin hooks; cache
│   ├── markdown-provider.ts ... Link resolution + file watching; MarkdownResourceProvider
│   ├── markdown-link.ts ....... [[note#section|alias]] syntax parsing + edit operations
│   ├── graph-data-builder.ts .. buildGraphData() for visualization format
│   ├── attachment-provider.ts . Non-markdown resource support
│   └── datastore.ts ........... IDataStore interface (file watching, I/O boundary)
│
├── commands/
│   └── outline.ts ............. outlineData() pure function
│
└── utils/
    └── template-frontmatter-parser.ts ... foam_template: frontmatter parsing

packages/foam-vscode/src/vscode/features/
├── navigation/
│   ├── link-completion.ts ...... WikilinkCompletionProvider (triggered on [[)
│   ├── hover-provider.ts ....... HoverProvider (backlink preview on hover)
│   └── workspace-symbol-provider.ts ... Ctrl+T note search
│
├── notes/
│   ├── notes-explorer.ts ....... Notes tree panel
│   ├── connections.ts .......... Forward/backward links tree panel
│   ├── placeholders.ts ......... Broken links panel (+ create note)
│   └── orphans.ts .............. Notes with no backlinks
│
├── preview/
│   ├── wikilink-embed.ts ....... ![[note]] embedding in markdown preview
│   ├── wikilink-navigation.ts .. [[note]] → clickable command links
│   └── index.ts ................ Chain all markdown-it preview plugins
│
├── editing/
│   ├── update-wikilinks.ts ..... Link reference definitions + CodeLens
│   ├── refactor.ts ............. Bulk note rename + wikilink update
│   ├── heading-rename-provider.ts ... Rename heading → update fragments
│   ├── convert-links.ts ........ Wikilink ↔ markdown link conversion
│   └── block-rename-provider.ts .... Rename ^blockid → update references
│
├── tags/
│   ├── tag-completion.ts ....... Tag autocomplete in frontmatter + inline
│   ├── tags-explorer.ts ........ Tags tree panel
│   └── rename-tag.ts ........... Bulk tag rename
│
├── graph-webview/
│   └── index.ts ................ Graph visualization panel
│
└── janitor/
    └── wikilink-diagnostics.ts . Link validation diagnostics
```

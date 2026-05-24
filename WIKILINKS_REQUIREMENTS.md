# Wikilinks Implementation Requirements

Extracted from: main-chat-vs-code-file-commit-issue.jsonl
Total foam/wikilink mentions: 106

## Section 1

```
debug\nCwd: /Users/kamran/Documents/GitHub/gpt-ai-markdown-editor\nExit Code: 0\n\n</context>\n<reminderInstructions>\nWhen using replace_string_in_file, include 3-5 lines of unchanged context before and after the target string.\nFor multiple independent edits, use multi_replace_string_in_file simultaneously rather than sequential replace_string_in_file calls.\nDo NOT create markdown files to document changes unless requested.\n\n</reminderInstructions>\n<userRequest>\nCheck out the Tolaria and Foam code \n- I need to copy a few features from those repos\n- Create a local index .md of Tolaria design and another .md of foam, the source code files, a brief note about what each does, etc.\n- The goals is so you can copy from there whenever I ask you - without needing to scan the entire Tolaria source code - so summarize what you need.\n\nHere are the features I am interested in:\nTolaria:\n- The TOC panel\n- The properties window which will show front matter variables\n- The wikilink syst
```

## Section 2

```
lse I want to see what you recommend\n\nSource code for tolaria and foam:\n/Users/kamran/Documents/GitHub/tolaria\n/Users/kamran/Documents/GitHub/foam\n</userRequest>\n"}],"promptTokens":70375,"outputTokens":1818,"toolCallRounds":[{"response":"","toolCalls":[{"id":"toolu_01JsEhRrzMsbtbUwWBQXagzi__vscode-1779494824814","name":"manage_todo_list","arguments":"{\"todoList\": [{\"id\":1,\"title\":\"Explore Tolaria codebase features\",\"status\":\"in-progress\"},{\"id\":2,\"title\":\"Explore Foam codebase features\",\"status\":\"not-started\"},{\"id\":3,\"title\":\"Create Tolaria index .md\",\"status\":\"not-started\"},{\"id\":4,\"title\":\"Create Foam index .md\",\"status\":\"not-started\"},{\"id\":5,\"title\":\"Write implementation advice\",\"status\":\"not-started\"}]}"}],"toolInputRetry":0,"id":"e9a23642-9942-4462-8d5e-2774a79281c4","thinking":{"id":"thinking_0","text":"The user wants me to:\n1. Explore Tolaria and Foam codebases to understand specific features\n2. Create local index .md
```

## Section 3

```
view + toolbar button\n\n\n- Git history list with diff view using CodeMirror\n\n**Foam:**\n- Wikilink system (indexing, insertion, hover preview)\n\nLet me run parallel exploration of both repos.","encrypted":"EtwHCmUIDhgCKkC5Mljh5UW/Tuiveyq2H5YAMeJvO0MZYXjDE6Y4faj2y3vHKxZtV26Ky2zHDwemGWLu9kJgAAR+F87LcTbs3K2BMhFjbGF1ZGUtc29ubmV0LTQtNjgAQgh0aGlua2luZxIMtt13aszbua/LsdNdGgxmSMJalnW7HtsPZwUiMNaYX25VWqvplifFK5xl+qrzIQjYnMdchQ6kx3a0qVXAbnb9HhsE5pbxIDOwOnGdhCqkBlnC0Cqj00a2goNXV84sCbzaa4cbhkajwRo3VFSiT+bt7oek5EwoKu+/D6vpq3Ic64uSzyXJKeAvQEQO5i5BF7MS2CcFn9giYw3t7lFAgjoN+CjXeubkyg2tWMUMIfcd00Ir/far2lUpR4XcJahZMDTHqQEkBX4+74OWdUTOi7mW7lP7JC08DieaVWc4d/jR1gpCIHzJV9qfaE899xDyNTQu5jV/iy+Z41BeQX7s20vqE68D6OD4I45QPE/l+XViNz05/KVkeZgPTzngX5afEDJBc+IiaAM5YCeK/Tipf7oEQUYQRnCDaXSe5J4IB8zY23Hbdg0/R65uNQsops5z1+BEDq7a0CCqFDVSMtopbil9asreOxPgPuWtgIxt0cAc3FwX6M0sMQ0EZTRdTroKylhQI1xUYjZcIr1FBnpBjpGVjXtAujREyHLEnqWQ5lFQbAH9XCOuvZkUaD7RMiUbiPGseeQ2AEJULx1Kta7SRKsSK8aib/qiXt6AMENt7tseB6Bipi9tNtuaXfNp9Xoq4ocCl+PgM
```

## Section 4

```
l path\\n- Key exports (component name, function name, etc.)\\n- What it does (1-2 sentences)\\n- How it connects to other files (imports/uses)\\n\\nAlso note: What CSS framework does Tolaria use? What component library? What state management? Does it use Tauri?\\n\\nReturn a comprehensive, structured report I can use to write documentation.\\n\\nThoroughness: thorough\"}"},{"id":"toolu_01Ktj5b39qBetR2HQBV8sHF1__vscode-1779494824816","name":"runSubagent","arguments":"{\"description\": \"Explore Foam wikilink features\", \"agentName\": \"Explore\", \"prompt\": \"Explore the Foam codebase at /Users/kamran/Documents/GitHub/foam and find ALL source files related to these features. For each feature, return: the exact file paths, the key exports/components/functions, and a 1-3 sentence description of what each file does and how it fits in.\\n\\nFeatures to find:\\n1. **Wikilink indexing** - how Foam indexes/tracks all notes and builds the wikilink graph\\n2. **Wikilink autocomplete/completio
```

## Section 5

```
mGraph, toc, outline, frontmatter, front-matter, properties, graph.\\n\\nFor each file found, include:\\n- Full path (relative to /Users/kamran/Documents/GitHub/foam)\\n- Key exports (class name, function name, etc.)\\n- What it does (1-2 sentences)\\n- Key interfaces/types defined\\n- How it connects to other files\\n\\nAlso note: \\n- How does Foam index files? (FoamWorkspace, FoamGraph, etc.)\\n- What VS Code API does it use for hover/completion?\\n- How does the wikilink resolution algorithm work?\\n\\nReturn a comprehensive, structured report I can use to write documentation.\\n\\nThoroughness: thorough\"}"}],"toolInputRetry":0,"id":"2094b7b8-e9b6-4896-8d6c-b9de1912f871","timestamp":1779496547895,"modelId":"claude-sonnet-4.6"},{"response":"","toolCalls":[{"id":"toolu_01Lpw8pCzUuq5fTYXzbd6dPz__vscode-1779494824904","name":"read_file","arguments":"{\"filePath\": \"/Users/kamran/Library/Application Support/Code/User/workspaceStorage/d95d53f41e55afd81a2222127e8e900e/GitHub.copilot-cha
```

## Section 6

```
j5b39qBetR2HQBV8sHF1__vscode-1779494824816/content.txt\", \"startLine\": 1, \"endLine\": 400}"}],"toolInputRetry":0,"id":"eeed8caa-525c-4818-972b-b7824621db76","timestamp":1779496663641,"modelId":"claude-sonnet-4.6"},{"response":"","toolCalls":[{"id":"toolu_01EYz6MKgecBcpJzUHmbTuCn__vscode-1779494824906","name":"manage_todo_list","arguments":"{\"todoList\": [{\"id\":1,\"status\":\"completed\",\"title\":\"Explore Tolaria codebase features\"},{\"id\":2,\"status\":\"completed\",\"title\":\"Explore Foam codebase features\"},{\"id\":3,\"status\":\"in-progress\",\"title\":\"Create Tolaria index .md\"},{\"id\":4,\"status\":\"not-started\",\"title\":\"Create Foam index .md\"},{\"id\":5,\"status\":\"not-started\",\"title\":\"Write implementation advice\"}]}"}],"toolInputRetry":0,"id":"4a8c18e7-59d3-4a83-b562-4dbbfea9797b","thinking":{"id":"thinking_0","text":"Excellent! I now have comprehensive information about both codebases. Let me now create the two index .md files and then write implementa
```

## Section 7

```
ng `tolaria-reference.md` and `foam-reference.md` files there, then follow up with implementation guidance.\n\nNow I'm thinking through what features would be most valuable to implement first. The key constraint is that this is a VS Code extension using a webview-based editor, which is fundamentally different from Tolaria's Tauri architecture—so while I can draw inspiration from Tolaria's design patterns, I can't directly port its code. I should focus on what's feasible within the VS Code extension model and prioritize the features that would have the most impact. TextEditorProvider\n- TipTap-based webview editor\n- No React (or minimal - since TipTap doesn't require React)\n\nFor the **wikilink system**, Foam is the MUCH better source to learn from because:\n- It's already a VS Code extension\n- Uses VS Code APIs directly (CompletionItemProvider, HoverProvider)\n- The hover and completion work natively in the VS Code extension host\n- The indexing is proper VS Code file watching\n\nBU
```

## Section 8

```
 uses a WYSIWYG webview, not the raw VS Code text editor. So Foam's CompletionItemProvider won't work directly (it registers on the markdown language in VS Code text editor, not in a webview).\n\nLet me think about each feature:\n\n1. **TOC panel** - I could use VS Code's TreeView API with a sidebar panel, parsing content in the extension host. DocumentSymbolProvider would handle this more elegantly than copying Tolaria's React approach.\n\n2. **Properties window (front matter)** - Either a VS Code panel or built into the webview as a collapsible section. The webview approach lets me leverage TipTap's frontmatter handling directly.\n\n3. **Wikilink system** - For indexing, Foam's workspace approach works well in VS Code. Completion needs to happen inside the webview via a TipTap extension since VS Code's CompletionItemProvider won't fire there. Hover support would work through Foam's HoverProvider in the text view, but not in the WYSIWYG editor.\n\n4. **CodeMirror source view** - Tolar
```

## Section 9

```
ters. When they select a file, it inserts the wikilink.\n\nThis is exactly what TipTap's Mention extension does, so I can use that as a base.\n\nFor the hover preview, I'll add a custom event listener that detects when the user hovers over a wikilink and displays a preview tooltip.\n\nAlright, let me start coding the extension host first.\n\nI need to:\n1. Create a FileSystemWatcher to watch for markdown file changes\n2.\n\nSo the key insight here is that this isn't about wholesale copying from Foam or Tolaria—it's about understanding where each feature belongs architecturally and adapting the right patterns for each layer.","encrypted":"EqIoCmUIDhgCKkBP2qsnI8Wvgju8mzMGmge2pw/wN6dFyh/TTR6XFABtG2Rj/m4dfiWn3DttSQdVsgrJPkIr5GN6DWvBHtL/Yv4NMhFjbGF1ZGUtc29ubmV0LTQtNjgAQgh0aGlua2luZxIMeathZKbhhfMYAnlZGgyIuU4JKiN0YWBoScIiMH2xnWqhMUQZS/J8/pKCW0Y0QZvDSef4kfl3nJJFzMg1nObzs9TZW0ai9BkwLNbz/yrqJmhoo0R+lJkBXwBcnLFNM5ZHunDVRFa6xT5ehJZ2ysvTN1ZUZS7PNf0FsgY1cyTsU2TmRQW5UK9GIW1wE5RNsqjTc26mVDguQBgY7+HVar
```

## Section 10

```
copy-safe)\\n└── rawEditorUtils.ts ────────── CodeMirror cursor → query detection\\n```\\n\"}"}],"toolInputRetry":0,"id":"8fc1f31e-84a6-4c86-8102-c8c6410e982a","timestamp":1779496784782,"modelId":"claude-sonnet-4.6"},{"response":"","toolCalls":[{"id":"toolu_017RbYGxdUdqf1HW2LrcRCHr__vscode-1779494824909","name":"manage_todo_list","arguments":"{\"todoList\": [{\"id\":1,\"status\":\"completed\",\"title\":\"Explore Tolaria codebase features\"},{\"id\":2,\"status\":\"completed\",\"title\":\"Explore Foam codebase features\"},{\"id\":3,\"status\":\"completed\",\"title\":\"Create Tolaria index .md\"},{\"id\":4,\"status\":\"in-progress\",\"title\":\"Create Foam index .md\"},{\"id\":5,\"status\":\"not-started\",\"title\":\"Write implementation advice\"}]}"}],"toolInputRetry":0,"id":"68ab3b9b-9052-4747-bbae-a2e71ccc4cfc","timestamp":1779496788817,"modelId":"claude-sonnet-4.6"},{"response":"","toolCalls":[{"id":"toolu_016Qh5vcQDEs8m7q3AdQnEoC__vscode-1779494824910","name":"create_file","arguments
```

## Section 11

```
wn parser | Remark + custom plugins (`remark-wiki-link`, `remark-frontmatter`) |\\n| Indexing | Reversed trie (`TrieMap`) for fast resource lookup |\\n| Graph | Custom `FoamGraph` with `Map<string, Connection[]>` |\\n| Completion | `vscode.languages.registerCompletionItemProvider()` |\\n| Hover | `vscode.languages.registerHoverProvider()` |\\n| Tree views | `vscode.window.createTreeView()` |\\n| Tests | Vitest (unit) + VS Code Extension Host (integration) |\\n\\n> **Important:** Foam's wikilink completion and hover work on the **native VS Code text editor**. They register on the `markdown` language ID. They do NOT work inside a webview CustomTextEditorProvider. This is the key architectural difference when adapting for this project.\\n\\n---\\n\\n## Feature 1: Wikilink Indexing (Workspace + Graph)\\n\\n### Core model (platform-agnostic — `packages/foam-core/src/model/`)\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-core/src/model/workspace.ts` 
```

## Section 12

```
 build | `Connection = {source: URI, target: URI, link: ResourceLink}` |\\n| `packages/foam-core/src/model/note.ts` | `Resource`, `ResourceLink`, `Section`, `Block`, `Tag`, `Alias`, `Footnote` | Core note type: `Resource.properties` = frontmatter, `Resource.sections` = headings, `Resource.blocks` = code/list/paragraph with `^id` anchors, `Resource.links` = outgoing wikilinks |\\n| `packages/foam-core/src/model/uri.ts` | `URI` class | Immutable wrapper; `URI.isPlaceholder()` for broken links; supports wikilink fragments `note#section`, `note#^blockid` |\\n| `packages/foam-core/src/model/tags.ts` | `FoamTags` | Indexes all `#hashtags` + frontmatter `tags:` → `Map<label, location[]>` |\\n| `packages/foam-core/src/model/foam.ts` | `Foam` interface | Bootstrap: `{workspace, graph, tags, ...}` |\\n\\n### Services (parsing + resolution)\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-core/src/services/markdown-parser.ts` | `createMarkdownParser()`, `Par
```

## Section 13

```
rovider` interface |\\n| `packages/foam-core/src/services/markdown-link.ts` | `MarkdownLink.analyzeLink()`, `MarkdownLink.createUpdateLinkEdit()` | Parses `[[note|alias]]`, `[[note#section]]`, `[[note#^blockid]]`, `[alias](link#section)`; used for link refactoring |\\n| `packages/foam-core/src/services/attachment-provider.ts` | `AttachmentProvider` class | Handles non-markdown files (images, PDFs) as lightweight `attachment` resources |\\n| `packages/foam-core/src/services/datastore.ts` | `IDataStore` interface | Abstract file system; watches files; filters by extension; platform-agnostic I/O boundary |\\n| `packages/foam-core/src/services/graph-data-builder.ts` | `buildGraphData()` | Transforms workspace resources + connections into graph visualization format `BuiltGraphData = {nodeInfo, links}` |\\n\\n### Resolution Algorithm\\n\\n```\\n1. Parse: [[note#section|alias]]  →  target=\\\"note\\\", fragment=\\\"#section\\\"\\n2. workspace.find(\\\"note\\\", relativeToUri):\\n   a. Exact U
```

## Section 14

```
)\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-vscode/src/vscode/features/navigation/link-completion.ts` | `WikilinkCompletionProvider`, `SectionCompletionProvider`, `WIKILINK_REGEX`, `linkCommitCharacters` | Triggered on `[[`; filters resources by cursor prefix; supports `\\\\|` alias divider and `#` section divider; `completion.label` config = path/title/identifier; `completion.linkFormat` = wikilink vs. markdown. Implements `vscode.CompletionItemProvider` |\\n| `packages/foam-vscode/src/vscode/features/tags/tag-completion.ts` | `TagCompletionProvider`, `HASH_REGEX` | Triggered on `#`; works in frontmatter `tags:` field AND inline hashtags; detects YAML boundaries. Implements `vscode.CompletionItemProvider` |\\n| `packages/foam-vscode/src/vscode/features/daily-notes/completion-provider.ts` | `DateCompletionProvider` | Date snippet completion for daily note templates |\\n\\n**Registration pattern:**\\n```typescript\\nvscode.languages.register
```

## Section 15

```
foam),\\n  '[', '['  // trigger characters\\n)\\n```\\n\\n> **⚠️ Webview caveat:** These providers fire on native VS Code markdown text editors ONLY. Inside a CustomTextEditorProvider webview they never trigger. For TipTap-based WYSIWYG, completion must be implemented as a TipTap `@tiptap/suggestion` extension sending messages to extension host for file list.\\n\\n---\\n\\n## Feature 3: Wikilink Hover Preview\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-vscode/src/vscode/features/navigation/hover-provider.ts` | `HoverProvider`, `CONFIG_KEY = 'links.hover.enable'` | Registers `vscode.HoverProvider`; on hover → parse document links → resolve target via `workspace.resolveLink()` → get backlinks from `graph.getBacklinks(uri)` → render markdown with up to 10 backlinks + command links to open them |\\n\\n**Flow:**\\n```\\n1. User hovers over [[note]] in VS Code text editor\\n2. HoverProvider.provideHover(document, position) fires\\n3. Parse document
```

## Section 16

```
eature 4: TOC / Document Outline\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-core/src/commands/outline.ts` | `outlineData()`, `OutlineSection`, `OutlineResult` | Pure function; given a Resource, returns sections with label, level, range. `OutlineResult = {id, uri, sections: OutlineSection[]}` |\\n| `packages/foam-core/src/model/note.ts` | `Resource.sections: Section[]` | Populated by markdown parser during AST traversal; includes level (1-6), heading text, range |\\n\\n**How it works:**\\n- `outlineData(workspace, resource)` → `OutlineResult`\\n- Each `Section` has: `label`, `level`, `range: {start, end}` (line numbers)\\n- Foam does NOT provide a custom outline panel in VS Code sidebar — uses VS Code's native outline/breadcrumbs via built-in symbol resolution\\n\\n**Adaptation note:** `outlineData()` is a pure function — directly portable. Pair with VS Code `DocumentSymbolProvider` registration to power native outline, OR call from extension
```

## Section 17

```
 `gray-matter`; returns `[Map<string, string>, remainingContent]` |\\n| `packages/foam-core/src/services/markdown-parser.ts` | (frontmatter plugin) | `remark-frontmatter` plugin populates `Resource.properties: Record<string, any>` from YAML |\\n| `packages/foam-core/src/model/note.ts` | `Resource.properties` | Any YAML frontmatter key → `properties` dict; used for type, status, date, tags |\\n| `packages/foam-vscode/src/vscode/features/preview/foam-query-renderer.ts` | Query renderer | Foam query language supports `properties.status`, `properties.date` dot notation |\\n| `packages/foam-vscode/src/vscode/features/tags/tag-completion.ts` | `isInFrontMatter()` helper | Detects YAML frontmatter region (checks `---` delimiters at file start) for scoping completion |\\n\\n**Key pattern — frontmatter detection:**\\n```typescript\\nfunction isInFrontMatter(document, position): boolean {\\n  // Scans backwards from position for '---' delimiter at line 0\\n}\\n```\\n\\n---\\n\\n## Feature 6: Not
```

## Section 18

```
ve note; syncs on editor change + graph updates |\\n| `packages/foam-vscode/src/vscode/utils/tree-views/tree-view-utils.ts` | `createConnectionItemsForResource()`, `createBacklinkItemsForResource()` | Render connection tree items with link ranges, clickable URIs |\\n| `packages/foam-vscode/src/vscode/features/graph-webview/index.ts` | Graph webview activation | Opens graph visualization webview using `@foam/graph-view`; sends `buildGraphData()` result; updates on workspace changes |\\n| `packages/foam-vscode/src/vscode/features/notes/placeholders.ts` | `PlaceholderTreeView` | Panel showing broken links (placeholders); click to create note |\\n| `packages/foam-vscode/src/vscode/features/notes/orphans.ts` | `OrphansTreeView` | Panel showing notes with no incoming backlinks |\\n\\n---\\n\\n## Preview Rendering (Wikilink Embedding)\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-vscode/src/vscode/features/preview/wikilink-embed.ts` | markdown-it plug
```

## Section 19

```
ag highlighting |\\n\\n---\\n\\n## Link Refactoring / Editing\\n\\n| File | Key Exports | Notes |\\n|------|-------------|-------|\\n| `packages/foam-vscode/src/vscode/features/editing/update-wikilinks.ts` | `CONVERT_WIKILINK_TO_MDLINK` command | Auto-generate link reference definitions; CodeLens showing definition count |\\n| `packages/foam-vscode/src/vscode/features/editing/refactor.ts` | Bulk rename | Renames note + updates all wikilinks referencing it via `getRenameOperations()` |\\n| `packages/foam-vscode/src/vscode/features/editing/heading-rename-provider.ts` | `vscode.RenameProvider` | Rename heading → update all `[[note#heading]]` fragments |\\n| `packages/foam-vscode/src/vscode/features/editing/block-rename-provider.ts` | `vscode.RenameProvider` | Rename block anchor → update all `[[note#^blockid]]` fragments |\\n| `packages/foam-vscode/src/vscode/features/editing/convert-links.ts` | Convert command | Toggle between `[[wikilink]]` and `[title](path)` format |\\n| `packages/foa
```

## Section 20

```
r.ts |\\n| `createTreeView()` | Notes, connections, placeholders, orphans, tags panels | notes-explorer.ts, connections.ts, etc. |\\n| `registerWebviewPanelSerializer()` | Graph panel persistence | graph-webview/index.ts |\\n| `registerRenameProvider()` | Rename heading/block anchors | heading-rename-provider.ts, block-rename-provider.ts |\\n| `registerCodeLensProvider()` | Link reference definition count | update-wikilinks.ts |\\n\\n---\\n\\n## File Location Quick Reference\\n\\n```\\npackages/foam-core/src/\\n├── model/\\n│   ├── workspace.ts ........... FoamWorkspace (reversed trie, onDidAdd/Update/Delete)\\n│   ├── graph.ts ............... FoamGraph (links+backlinks maps, Connection type)\\n│   ├── note.ts ................ Resource, ResourceLink, Section, Block, Tag\\n│   ├── uri.ts ................. URI (wikilink targets, placeholder support)\\n│   ├── tags.ts ................ FoamTags (hashtag + frontmatter tag index)\\n│   └── foam.ts ................ Foam bootstrap interface\\n
```


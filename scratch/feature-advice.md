# Feature Implementation Advice
> Based on analysis of Tolaria + Foam source code and the current gpt-ai-markdown-editor architecture.

---

## 1. TOC Panel — Update vs. Rebuild

**Current state:** A full-screen modal overlay (`tocOverlay.ts`). It shows a flat list with indentation levels. Opens as a dialog, you pick a heading, it closes.

**Tolaria's approach:** A persistent right-side panel that stays visible while editing. Hierarchical tree with visual connector lines between parent/child headings. Heading-type icons (H1/H2/H3). Updates live as you type.

**Recommendation:** Update the existing overlay into a proper persistent panel. The heading extraction logic (`buildOutlineFromEditor` in `utils/outline.ts`) is already correct — keep it. What to change:
- Move the TOC from a modal overlay to a VS Code `WebviewView` sidebar panel (registered in `package.json` as a view in the Explorer or a dedicated activity bar container). This lives in the extension host, not inside the main editor webview.
- When active editor changes, send the outline via `postMessage` to the sidebar webview.
- Sidebar webview renders the tree with nested indentation.

**What to steal from Tolaria** (`src/components/TableOfContentsPanel.tsx`):
- The visual connector line logic: an `absolute` 1px line on the left edge of each `TocChildren` block, showing nesting at a glance
- The H1/H2/H3 SVG icon per item (not just indentation)  
- `getFolderDepthIndent(depth)` formula: `12 + depth * 16` pixels left padding
- `getFolderConnectorLeft(depth)`: connector line offset = `12 + depth * 16 + 8`

These are pure CSS + layout values — copy them into your sidebar webview CSS. No React dependency.

---

## 2. Properties Window — Simple Key-Value Pairs

**Current state:** Frontmatter is wrapped as a `yaml` code block for webview rendering and unwrapped on save. No editing UI.

**Recommendation:** A VS Code `WebviewView` sidebar panel (same sidebar as TOC, different tab). Shows editable name-value fields for the frontmatter of the active document.

### MARP handling

Simple rule: if `marp: true` is in the frontmatter, show a banner "MARP Presentation — edit frontmatter in source view" and don't show editable fields. Leave that YAML block alone.

For all other documents, parse with `gray-matter` in the extension host and show fields. The extension host already parses frontmatter (see `wrapFrontmatterForWebview`). Extend that to also extract `key: value` pairs and send them to the properties panel.

**What to steal from Tolaria:**

From `src/utils/frontmatter.ts` — `parseFrontmatter()` pure function. Copy it directly (strip Tauri-specific imports).

From `src/utils/propertyTypes.ts` — `detectPropertyType()`. Detects string/number/boolean/array/date from value shape. Copy directly.

### Recommended property types to support (v1):
| Type | Detection | UI |
|------|-----------|-----|
| String | default | Single-line text input |
| Number | `!isNaN(Number(value))` | Number input |
| Boolean | `value === true/false` | Toggle |
| Array | `Array.isArray(value)` | Comma-separated tags |
| Date | ISO date string pattern | Text (date picker is scope creep) |

**Skip for now:** wikilink chips, color pickers, status dropdowns — those are Tolaria-specific and complex.

### Data flow:
```
File changes (extension host)
  → parseFrontmatter(raw) → { key: value }[]
  → postMessage({ type: 'frontmatter', fields: [...] }) → Properties WebviewView
  ← postMessage({ type: 'updateFrontmatter', key, value }) ← user edits
  → extension host patches TextDocument (string replace between --- delimiters)
  → VS Code marks document dirty → normal save flow
```

**Do NOT** use `marp` keys as editable fields even if `marp: false`. Reserve them.

---

## 3. Foam Integration — The Full Picture

This is the most consequential architectural decision. Here is the honest analysis:

### What Foam gives you out of the box (if users install it)

| Foam Feature | Available to your users | Your work required |
|---|---|---|
| Graph view | ✅ YES — `foam-vscode.show-graph` command exists | Add toolbar button that calls this command |
| Orphan notes detection | ✅ YES — Foam's "Orphans" tree panel | Nothing |
| Broken links detection | ✅ YES — Foam's "Placeholders" tree panel | Nothing |
| Multi-folder workspace indexing | ✅ YES — Foam indexes all workspace `.md` files | Nothing |
| Connections panel (backlinks) | ✅ YES — Foam's Connections tree view | Nothing |
| Backlink diagnostics | ✅ YES — Foam's janitor shows broken/ambiguous links | Nothing |
| Re-indexing | ✅ Automatic — Foam uses VS Code's file system watchers | Nothing |
| Wikilink completion in webview | ❌ NO — fires on native text editor only | Must build separately |
| Wikilink hover in webview | ❌ NO — same limitation | Must build separately |

### The tight coupling risk

You could access Foam's workspace via `vscode.extensions.getExtension('foam.foam-vscode')?.exports`. But:
- Foam does not publish a stable extension API contract
- Their `exports` could change between versions without notice
- You'd be depending on their internals
- If Foam is not installed, everything calling their API would fail

**This is too fragile.** Don't do it.

### Recommended approach: Loose coupling + own lightweight indexer

**What to build in your extension:**

A minimal file indexer in the extension host — ~100 lines of code:
```typescript
// Scans workspace .md files, extracts title (first H1 or filename), builds Map
type NoteIndex = Map<string, { title: string; uri: vscode.Uri; relativePath: string }>
```

Built using `vscode.workspace.findFiles('**/*.md', '**/node_modules/**')` + `vscode.workspace.createFileSystemWatcher`. This is the ONLY thing you need for in-webview wikilink autocomplete and hover previews.

**What to delegate to Foam (user installs it):**

Add a setting `markdown-for-humans.foamIntegration.enable` (default: true).

When enabled:
- Check if `foam.foam-vscode` extension is installed via `vscode.extensions.getExtension('foam.foam-vscode')`
- If yes: add toolbar buttons for "Show Graph" (`foam-vscode.show-graph`), "Show Orphans", etc.
- If no: show a notification "Install Foam for graph view and backlink analysis"

This is robust because:
- You're only calling VS Code **commands** (public API, stable)
- Not touching Foam's internal TypeScript exports
- Gracefully degrades if Foam isn't installed
- Users get the full Foam UI (Foam knows how to render its own graph well)

**For graph view with current file selected:**

Foam's graph command opens the graph and the webview selects the active file automatically (it listens to `vscode.window.onDidChangeActiveTextEditor`). So just calling `foam-vscode.show-graph` already does what you want.

### Wikilink completion in webview

Build a TipTap extension using `@tiptap/suggestion`:

```
User types [[ in webview
  → TipTap suggestion triggers
  → webview sends postMessage({ type: 'requestNoteList', query: 'foo' })
  → extension host filters NoteIndex by query
  → responds with postMessage({ type: 'noteList', items: [...] })
  → webview renders dropdown
  → user selects → TipTap inserts [[note title]]
```

Copy the filtering logic from Tolaria's `src/utils/wikilinkSuggestions.ts` (`preFilterWikilinks()`) — it's a pure function with no dependencies.

### Wikilink hover preview in webview

TipTap extension with a `NodeView` or mark for `[[...]]` patterns:

```
User hovers over [[note]] in webview
  → mouseover on wikilink span
  → webview sends postMessage({ type: 'requestNotePreview', target: 'note' })
  → extension host: find URI in NoteIndex, read first ~500 chars of file
  → respond with postMessage({ type: 'notePreview', title, excerpt })
  → webview shows tooltip
```

For the tooltip UI, look at Foam's `hover-provider.ts` for content structure (title + backlinks), but render it yourself in the webview.

### Summary of Foam integration work

| Task | Effort | Source |
|------|--------|--------|
| Build NoteIndex (file watcher + title extractor) | ~2h | Build fresh |
| Wikilink autocomplete TipTap extension | ~1 day | Copy Tolaria filter logic |
| Wikilink hover preview | ~half day | Build fresh |
| Foam graph button (if installed) | ~1h | Just execute command |
| Foam install nag/suggestion | ~30min | Build fresh |

---

## CSS / Tailwind Question

**Short answer: No to Tailwind. Your current CSS approach is correct.**

### Why Tolaria can use Tailwind and you cannot

Tolaria is a standalone Tauri/Electron app. It controls its entire CSS environment:
- Sets its own CSS reset
- Defines its own color tokens (`--foreground`, `--background`, `--border`, `--accent`)
- Never competes with a host application's theme

Your webview lives **inside VS Code**, which:
- Has its own CSS injected into every webview
- Provides `--vscode-*` CSS variables as the theming contract
- Has its own font size, font family, scrollbar styles

Tailwind in a VS Code webview would:
1. **Fight VS Code's theming** — Tailwind resets `body { font-family: ... }`, which breaks VS Code's font inheritance
2. **Double the build complexity** — You'd need to configure Tailwind to exclude resets and map `--vscode-*` tokens to Tailwind tokens
3. **Increase bundle size** by ~20-40KB for a feature you'd use 10% of
4. **Provide zero benefit** — VS Code's `--vscode-*` variables already are a design token system

### What IS better in Tolaria's CSS that you should adopt

The semantic tokens you already have (`--md-*`) are the right idea. Two things worth borrowing:

**1. More semantic tokens** — Tolaria uses `--border`, `--muted-foreground`, `--accent`, `--foreground`. You could add these as aliases over `--vscode-*` to write slightly cleaner CSS:
```css
--md-accent: var(--vscode-list-hoverBackground);
--md-muted-fg: var(--vscode-descriptionForeground);
```

**2. The connector line pattern** (for TOC) — a single `position: absolute; width: 1px; background: var(--md-border)` element alongside a nested list. Pure CSS, no framework needed.

**3. Consistent spacing scale** — Tolaria uses Tailwind's 4px grid (p-3 = 12px, gap-0.5 = 2px). Worth adopting as a mental model even in plain CSS.

### The verdict

Your `--vscode-*` + `--md-*` CSS variables approach is **already the industry standard** for VS Code extensions. Tolaria's CSS looks "better" because it has Tailwind's utility ergonomics — not because the underlying design decisions are superior. Don't add Tailwind.

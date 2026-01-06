---
name: Marketplace SEO Optimization
overview: Optimize VS Code extension marketplace discoverability by updating package.json metadata (displayName, description, keywords) and restructuring README.md with comparison table and improved SEO positioning.
todos:
  - id: update-package-displayname
    content: Update package.json displayName to 'Markdown WYSIWYG Editor for Humans'
    status: pending
  - id: update-package-description
    content: Update package.json description to SEO-optimized version (160 chars max)
    status: pending
  - id: expand-keywords
    content: Expand keywords array in package.json from 6 to 30 terms (prioritized by search volume)
    status: pending
  - id: update-custom-editor-displayname
    content: Update customEditors.displayName in package.json to match new displayName
    status: pending
    dependencies:
      - update-package-displayname
  - id: update-command-titles
    content: Update command titles in package.json that reference 'Markdown for Humans'
    status: pending
    dependencies:
      - update-package-displayname
  - id: update-view-names
    content: Update view names in package.json (Outline view) to match new displayName
    status: pending
    dependencies:
      - update-package-displayname
  - id: update-config-title
    content: Update configuration.title in package.json to match new displayName
    status: pending
    dependencies:
      - update-package-displayname
  - id: update-readme-title
    content: Update README.md H1 title to 'Markdown WYSIWYG Editor for Humans'
    status: pending
  - id: add-comparison-table
    content: Add comparison table to README.md after badges section (before Why We Built This)
    status: pending
  - id: move-vibe-coded-section
    content: Move 'Vibe Coded' section in README.md to bottom (after Contributing)
    status: pending
  - id: verify-build
    content: Run npm run lint and npm run build:debug to verify all changes work correctly
    status: pending
    dependencies:
      - update-package-displayname
      - update-package-description
      - expand-keywords
      - update-custom-editor-displayname
      - update-command-titles
      - update-view-names
      - update-config-title
  - id: update-changelog
    content: Update CHANGELOG.md with metadata optimization changes
    status: pending
    dependencies:
      - verify-build
---

# Marketplace SEO Optimization Plan

## 1. Context & Problem

**Current state:**

- Extension displayName is "Markdown for Humans" - missing critical search keywords "editor" and "WYSIWYG"
- Only 6 keywords in package.json (should be 30 for maximum discoverability)
- Description is good but could be more SEO-optimized
- README lacks comparison table and has "Vibe Coded" section too early, pushing core features down

**Pain points:**

- **Search invisibility:** Extension doesn't rank in top 5-20 for "markdown editor" searches (most common search term)
- **Missing keywords:** Competitors include "editor" in displayName, ensuring they rank higher
- **Low discoverability:** Users searching for "md editor" or "wysiwyg markdown" won't find the extension

**Why it matters:**

- **10-50x install velocity potential:** Audit suggests proper optimization could dramatically increase installs
- **Market positioning:** Currently invisible to primary search patterns despite superior features
- **Competitive disadvantage:** Every direct competitor includes "editor" in their name

## 2. Desired Outcome & Scope

**Success criteria:**

- Extension appears in top 5-10 results for "markdown editor" searches
- Extension appears in top 3-5 results for "wysiwyg markdown" searches
- All 30 keyword slots utilized in package.json
- README includes comparison table in top 3 sections
- Brand identity preserved with "for Humans" tagline

**In scope:**

- Update `package.json` metadata (displayName, description, keywords)
- Restructure `README.md` (add comparison table, move sections, update H1)
- Update command titles in `package.json` that reference displayName

**Out of scope:**

- Wiki documentation updates (can be done in follow-up)
- Other documentation files (docs/, CHANGELOG.md, etc.)
- Marketing/launch activities (separate task)

## 3. Technical Plan

**Key changes:**

### `package.json` - Marketplace Metadata

- **displayName:** Change from `"Markdown for Humans"` to `"Markdown WYSIWYG Editor for Humans"`
  - Adds "editor" and "WYSIWYG" keywords for search algorithm
  - Preserves "for Humans" brand identity
- **description:** Update to SEO-optimized version (160 chars max for search results)
  - Current: `"Seamless WYSIWYG markdown editing for VS Code — Write markdown the way humans think"`
  - New: `"A full-featured WYSIWYG Markdown editor with visual table editing, drag-and-drop images, Mermaid diagrams, and distraction-free writing—all inside VS Code."`
- **keywords:** Expand from 6 to 30 keywords
  - Tier 1 (high-priority): markdown, editor, wysiwyg, preview, visual, md
  - Tier 2 (differentiation): table, tables, mermaid, diagram, image, drag-drop
  - Tier 3 (long-tail): github-flavored-markdown, gfm, notion-like, writing, documentation, readme
  - Tier 4 (competitive): alternative, better, modern, human-friendly, formatting, syntax-highlighting, live-preview, full-screen, distraction-free, cover-images, image-resizing, export, html, pdf, docx
- **customEditors.displayName:** Update to match new displayName
- **commands.title:** Update "Open with Markdown for Humans" to "Open with Markdown WYSIWYG Editor for Humans"
- **views.explorer.name:** Update "Markdown for Humans: Outline" to "Markdown WYSIWYG Editor for Humans: Outline"
- **configuration.title:** Update to match new displayName

### `README.md` - Structure & SEO

- **H1 title:** Change from `# Markdown for Humans` to `# Markdown WYSIWYG Editor for Humans`
- **Add comparison table:** Insert after badges, before "Why We Built This" section
  - Compare with "Markdown All in One" and "Standard Editors"
  - Highlight WYSIWYG, visual table editor, image management, Mermaid, distraction-free mode
- **Move "Vibe Coded" section:** Relocate from top (after Quick Start) to bottom (after Contributing)
- **Keep existing content:** All other sections remain, just reordered for better SEO flow

**Architecture notes:**

- No code changes required - this is purely metadata/documentation
- Changes are backward compatible (existing users will see new name after update)
- VS Code marketplace will re-index after publishing new version

**Performance considerations:**

- No performance impact - metadata-only changes
- README restructuring improves user experience and conversion

## 4. Work Breakdown

- [ ] **Phase 1: Update package.json metadata**
  - [ ] Change displayName to "Markdown WYSIWYG Editor for Humans"
  - [ ] Update description to SEO-optimized version
  - [ ] Expand keywords array to 30 terms (prioritized by search volume)
  - [ ] Update customEditors.displayName
  - [ ] Update commands.title for "Open with" command
  - [ ] Update views.explorer.name for Outline view
  - [ ] Update configuration.title
  - [ ] Verify all changes with `npm run lint`

- [ ] **Phase 2: Restructure README.md**
  - [ ] Update H1 title to include "WYSIWYG Editor"
  - [ ] Add comparison table after badges section
  - [ ] Move "Vibe Coded" section to bottom (after Contributing)
  - [ ] Verify markdown formatting and links work correctly

- [ ] **Phase 3: Testing & Verification**
  - [ ] Run `npm run lint` to ensure no syntax errors
  - [ ] Run `npm run build:debug` to verify extension builds correctly
  - [ ] Test extension locally to ensure all UI text displays correctly
  - [ ] Verify README renders correctly on GitHub
  - [ ] Check that all internal links in README still work

- [ ] **Phase 4: Documentation**
  - [ ] Update CHANGELOG.md with metadata optimization changes
  - [ ] Note in release that this improves marketplace discoverability

## 5. Implementation Details

### package.json Changes

**displayName update:**

```json
"displayName": "Markdown WYSIWYG Editor for Humans"
```

**description update:**

```json
"description": "A full-featured WYSIWYG Markdown editor with visual table editing, drag-and-drop images, Mermaid diagrams, and distraction-free writing—all inside VS Code."
```

**keywords expansion (30 total):**

```json
"keywords": [
  "markdown",
  "editor",
  "wysiwyg",
  "preview",
  "visual",
  "md",
  "table",
  "tables",
  "mermaid",
  "diagram",
  "image",
  "drag-drop",
  "github-flavored-markdown",
  "gfm",
  "notion-like",
  "writing",
  "documentation",
  "readme",
  "formatting",
  "syntax-highlighting",
  "live-preview",
  "full-screen",
  "distraction-free",
  "cover-images",
  "image-resizing",
  "export",
  "html",
  "pdf",
  "docx",
  "human-friendly"
]
```

### README.md Changes

**Comparison table to add (after badges, before "Why We Built This"):**

```markdown
## ✨ What Makes It Different

| Feature | Markdown for Humans | Markdown All in One | Standard Editors |
|---------|---------------------|---------------------|------------------|
| **WYSIWYG Editing** | ✅ Full-screen, no split pane | ❌ Split pane only | ❌ Plain text |
| **Visual Table Editor** | ✅ Drag, resize, edit cells | ⚠️ Basic syntax | ❌ Manual syntax |
| **Image Management** | ✅ Rename, resize inline | ❌ Manual file ops | ❌ Manual file ops |
| **Mermaid Diagrams** | ✅ Live rendering | ✅ Preview only | ❌ Not supported |
| **Distraction-Free** | ✅ Full-screen mode | ❌ No focus mode | ❌ No focus mode |
```

## 6. Risks & Mitigation

**Risk 1: Name change causes user confusion**

- **Mitigation:** Keep "for Humans" in name for brand continuity
- **Mitigation:** Announce change in release notes and CHANGELOG

**Risk 2: VS Code marketplace requires uniqueness check**

- **Mitigation:** Verify name availability before publishing
- **Mitigation:** If name taken, use alternative: "Markdown Editor – Visual & WYSIWYG (For Humans)"

**Risk 3: Extension doesn't rank despite optimization**

- **Mitigation:** This is expected - ranking takes time. Supplement with community outreach (separate task)

## 7. Success Metrics

**3-month targets:**

- Appears in top 5-10 for "markdown editor" searches
- Appears in top 3-5 for "wysiwyg markdown" searches
- Install velocity increases (track via marketplace analytics)

**Validation:**

- Manually test searches in VS Code Extensions panel
- Monitor install count trends after publishing
- Track search ranking position weekly

## 8. Follow-up Work

- Update wiki documentation with new name (separate task)
- Update other documentation files (docs/, etc.) with new name
- Create marketing/launch plan for Reddit, Product Hunt, etc. (separate task)
- Monitor search rankings and adjust keywords if needed
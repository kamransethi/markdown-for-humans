/**
 * Wikilinks Test Harness for Playwright Component Tests
 *
 * Initializes a TipTap editor with WikilinkNode + WikilinkSuggestion extensions
 * and exposes a minimal API on `window` for Playwright to drive without any
 * VS Code dependency.
 *
 * Pre-seeded note index:
 *   "active-note"   → title "Active Note"   (valid, blue)
 *   "another-note"  → title "Another Note"  (valid, blue)
 *   "missing-note"  is NOT in the index     (broken, red)
 *
 * Mock vscode API captures all postMessage calls. `getWikilinkPreview`
 * messages are auto-responded to so hover tooltip tests work without a host.
 *
 * Exposed API:
 *   window.editorAPI.setMarkdown(md: string): void
 *   window.editorAPI.getMarkdown(): string
 *   window.editorAPI.setNoteIndex(ids: string[], titles: Record<string,string>): void
 *   window.editorAPI.getLastMessage(): unknown
 *   window.editorAPI.getCapturedMessages(): unknown[]
 *   window.editorAPI.clearMessages(): void
 *   window.editorAPI.isReady(): boolean
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Paragraph from '@tiptap/extension-paragraph';
import {
  WikilinkNode,
  setWikilinkNoteIndex,
  setWikilinkTitleMap,
} from '../../../webview/extensions/WikilinkNode';
import {
  WikilinkSuggestion,
  setWikilinkSuggestionNotes,
} from '../../../webview/extensions/WikilinkSuggestion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WikilinkNote {
  identifier: string;
  title: string;
  fsPath: string;
  aliases: string[];
  sections: { label: string; level: number }[];
}

// ---------------------------------------------------------------------------
// Mock vscode API — captures messages and auto-responds to preview requests
// ---------------------------------------------------------------------------

const capturedMessages: unknown[] = [];

const MOCK_PREVIEWS: Record<string, { excerpt: string; broken: boolean }> = {
  'active-note': { excerpt: 'This is a detailed preview of the Active Note content.\n\nSecond paragraph of the note.', broken: false },
  'another-note': { excerpt: 'Preview content for Another Note.', broken: false },
  'missing-note': { excerpt: '', broken: true },
};

(window as unknown as Record<string, unknown>).vscode = {
  postMessage(msg: unknown) {
    capturedMessages.push(msg);
    const m = msg as Record<string, string>;

    // Auto-respond to hover preview requests
    if (m.type === 'getWikilinkPreview') {
      const id = m.identifier;
      const preview = MOCK_PREVIEWS[id] ?? { excerpt: '', broken: true };
      // Simulate the extension host response via the wikilinkPreview handler
      setTimeout(() => handleWikilinkPreview(id, preview.excerpt || null, preview.broken), 0);
    }
  },
};

// ---------------------------------------------------------------------------
// Tooltip renderer (mirrors editor.ts case 'wikilinkPreview')
// ---------------------------------------------------------------------------

function handleWikilinkPreview(
  identifier: string,
  excerpt: string | null,
  broken: boolean
): void {
  const win = window as unknown as Record<string, unknown>;
  if (win.__wikilinkHoverId !== identifier) return;

  document.getElementById('wikilink-preview-tooltip')?.remove();
  const rect = win.__wikilinkHoverRect as DOMRect | undefined;
  if (!rect) return;

  const titleMap = win.__wikilinkTitleMap as Map<string, string> | undefined;
  const displayTitle = titleMap?.get(identifier.toLowerCase()) || identifier;

  const tooltip = document.createElement('div');
  tooltip.id = 'wikilink-preview-tooltip';
  tooltip.className = broken
    ? 'wikilink-preview-tooltip wikilink-preview-tooltip--broken'
    : 'wikilink-preview-tooltip';

  if (broken || !excerpt) {
    tooltip.innerHTML =
      `<span class="wikilink-preview-tooltip__broken">Note not found: ${displayTitle}</span>` +
      `<button class="wikilink-preview-tooltip__create" data-id="${identifier}">Create page</button>`;
  } else {
    const safe = excerpt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    tooltip.innerHTML =
      `<div class="wikilink-preview-tooltip__title">${displayTitle}</div>` +
      `<pre class="wikilink-preview-tooltip__body">${safe}</pre>`;
  }

  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 6}px`;

  tooltip.addEventListener('mouseenter', () => {
    const dismissTimer = win.__wikilinkDismissTimer as ReturnType<typeof setTimeout> | null;
    if (dismissTimer) { clearTimeout(dismissTimer); win.__wikilinkDismissTimer = null; }
  });
  tooltip.addEventListener('mouseleave', () => {
    win.__wikilinkDismissTimer = setTimeout(() => {
      tooltip.remove();
      win.__wikilinkDismissTimer = null;
    }, 200);
  });

  document.body.appendChild(tooltip);
}

// ---------------------------------------------------------------------------
// Default note index
// ---------------------------------------------------------------------------

const DEFAULT_NOTES: WikilinkNote[] = [
  { identifier: 'active-note', title: 'Active Note', fsPath: '/vault/active-note.md', aliases: [], sections: [] },
  { identifier: 'another-note', title: 'Another Note', fsPath: '/vault/another-note.md', aliases: [], sections: [] },
];

function seedNoteIndex(notes: WikilinkNote[]): void {
  const ids = notes.map(n => n.identifier);
  const titleMap = new Map(notes.map(n => [n.identifier.toLowerCase(), n.title]));
  setWikilinkNoteIndex(ids);
  setWikilinkTitleMap(titleMap);
  setWikilinkSuggestionNotes(notes);
  // Expose title map for tooltip renderer
  (window as unknown as Record<string, unknown>).__wikilinkTitleMap = titleMap;
}

// ---------------------------------------------------------------------------
// Editor initialisation
// ---------------------------------------------------------------------------

const mountEl = document.getElementById('editor')!;
let ready = false;

const editor = new Editor({
  element: mountEl,
  extensions: [
    StarterKit.configure({
      paragraph: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      link: false,
    }),
    Paragraph,
    Markdown.configure({
      markedOptions: { gfm: true, breaks: true },
    }),
    WikilinkNode,
    WikilinkSuggestion,
  ],
  content: '',
  onCreate() { ready = true; },
});

// Seed default index after editor initialises
seedNoteIndex(DEFAULT_NOTES);

// ---------------------------------------------------------------------------
// Exposed API
// ---------------------------------------------------------------------------

(window as unknown as Record<string, unknown>).editorAPI = {
  setMarkdown(md: string): void {
    editor.commands.setContent(md, { contentType: 'markdown' } as Parameters<typeof editor.commands.setContent>[1]);
  },
  getMarkdown(): string {
    return (editor as unknown as { getMarkdown(): string }).getMarkdown();
  },
  setNoteIndex(ids: string[], titles: Record<string, string>): void {
    const notes: WikilinkNote[] = ids.map(id => ({
      identifier: id,
      title: titles[id] ?? id,
      fsPath: `/vault/${id}.md`,
      aliases: [],
      sections: [],
    }));
    seedNoteIndex(notes);
  },
  getLastMessage(): unknown {
    return capturedMessages[capturedMessages.length - 1] ?? null;
  },
  getCapturedMessages(): unknown[] {
    return [...capturedMessages];
  },
  clearMessages(): void {
    capturedMessages.length = 0;
  },
  isReady(): boolean {
    return ready;
  },
};

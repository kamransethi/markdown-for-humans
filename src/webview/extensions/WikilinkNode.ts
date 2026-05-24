/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

/**
 * WikilinkNode Extension
 *
 * TipTap inline node for rendering [[wikilinks]] with:
 * - Input rules for [[text]] conversion
 * - Paste rules for clipboard wikilinks
 * - Visual distinction between valid (blue) and broken (red) links
 * - Click handler to open the linked note
 */

import { Node, InputRule, PasteRule } from '@tiptap/core';

// Module-level state for the note identifier set
let noteIdentifiers: Set<string> = new Set();
// Maps identifier (lowercase) → display title
let noteTitleMap: Map<string, string> = new Map();
// Callback fired when the index changes so NodeViews can re-render
let noteIndexChangeCallback: (() => void) | null = null;

export function setWikilinkNoteIndex(identifiers: string[]): void {
  noteIdentifiers = new Set(identifiers.map(id => id.toLowerCase()));
  // Refresh all rendered wikilink nodes so loading->valid/broken transitions apply
  document.querySelectorAll<HTMLElement>('[data-wikilink]').forEach(el => {
    const id = el.getAttribute('data-wikilink-id') || '';
    const state = getWikilinkState(id);
    el.className = `wikilink wikilink--${state}`;
    el.setAttribute('data-wikilink-state', state);
    el.textContent = getDisplayTitle(id);
  });
  noteIndexChangeCallback?.();
}

export function setWikilinkTitleMap(map: Map<string, string>): void {
  noteTitleMap = map;
}

export function registerNoteIndexChangeHandler(cb: () => void): void {
  noteIndexChangeCallback = cb;
}

export function getDisplayTitle(identifier: string): string {
  return noteTitleMap.get(identifier.toLowerCase()) || identifier;
}

export function getIsBroken(identifier: string): boolean {
  if (noteIdentifiers.size === 0) return false;
  return !noteIdentifiers.has(identifier.toLowerCase());
}

export function getWikilinkState(identifier: string): 'loading' | 'valid' | 'broken' {
  if (noteIdentifiers.size === 0) return 'loading';
  return noteIdentifiers.has(identifier.toLowerCase()) ? 'valid' : 'broken';
}

export const WIKILINK_REGEX = /\[\[([^\]|[\n]+)\]\]/;
export const WIKILINK_REGEX_GLOBAL = /\[\[([^\]|[\n]+)\]\]/g;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikilink: (identifier: string) => ReturnType;
    };
  }
}

export const WikilinkNode = Node.create({
  name: 'wikilink',
  group: 'inline',
  atom: true,
  inline: true,

  addAttributes() {
    return {
      identifier: { default: '' },
      broken: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
        getAttrs: el => {
          const elem = el as HTMLElement;
          const id = elem.getAttribute('data-wikilink-id') || '';
          const broken = elem.classList.contains('wikilink--broken');
          return { identifier: id, broken };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const identifier = node.attrs.identifier as string;
    const state = getWikilinkState(identifier);
    const cls = `wikilink wikilink--${state}`;
    return [
      'span',
      {
        'data-wikilink': '',
        'data-wikilink-id': identifier,
        class: cls,
      },
      `[[${identifier}]]`,
    ];
  },

  markdownTokenName: 'wikilink',

  markdownTokenizer: {
    name: 'wikilink',
    level: 'inline' as const,
    start: '[[',
    tokenize(src: string) {
      const match = /^\[\[([^\]|\n]+)\]\]/.exec(src);
      if (match) {
        return { type: 'wikilink', raw: match[0], identifier: match[1].trim() };
      }
      return undefined;
    },
  },

  parseMarkdown: (token, helpers) => {
    const identifier = ((token as unknown as Record<string, string>).identifier ?? '').trim();
    if (!identifier) return [];
    return helpers.createNode('wikilink', { identifier, broken: false });
  },

  renderMarkdown: (node, _helpers) => {
    const identifier = (node.attrs?.identifier as string) ?? '';
    return `[[${identifier}]]`;
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]|[\n]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const identifier = match[1];
          state.tr.replaceRangeWith(
            range.from,
            range.to,
            this.type.create({ identifier, broken: getIsBroken(identifier) })
          );
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: WIKILINK_REGEX_GLOBAL,
        handler: ({ state, range, match }) => {
          const identifier = match[1];
          state.tr.replaceRangeWith(
            range.from,
            range.to,
            this.type.create({ identifier, broken: getIsBroken(identifier) })
          );
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, getPos: _getPos }) => {
      const dom = document.createElement('span');
      const identifier = node.attrs.identifier as string;
      const state = getWikilinkState(identifier);

      dom.setAttribute('data-wikilink', '');
      dom.setAttribute('data-wikilink-id', identifier);
      dom.setAttribute('data-wikilink-state', state);
      dom.className = `wikilink wikilink--${state}`;
      dom.textContent = getDisplayTitle(identifier);

      dom.addEventListener('click', () => {
        const api = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } })
          .vscode;
        if (api) {
          api.postMessage({ type: 'openWikilink', identifier });
        }
      });

      let hoverTimer: ReturnType<typeof setTimeout> | null = null;

      dom.addEventListener('mouseenter', () => {
        // Cancel any pending dismiss from a previous leave
        const win = window as unknown as Record<string, unknown>;
        const dismissTimer = win.__wikilinkDismissTimer as ReturnType<typeof setTimeout> | null;
        if (dismissTimer) {
          clearTimeout(dismissTimer);
          win.__wikilinkDismissTimer = null;
        }
        const rect = dom.getBoundingClientRect();
        win.__wikilinkHoverRect = rect;
        win.__wikilinkHoverId = identifier;
        hoverTimer = setTimeout(() => {
          const api = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } })
            .vscode;
          if (api) {
            api.postMessage({ type: 'getWikilinkPreview', identifier });
          }
        }, 350);
      });

      dom.addEventListener('mouseleave', () => {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          hoverTimer = null;
        }
        // Delay dismiss so the user can move mouse into the tooltip
        const win = window as unknown as Record<string, unknown>;
        win.__wikilinkDismissTimer = setTimeout(() => {
          (win.__wikilinkHoverId as unknown) = null;
          document.getElementById('wikilink-preview-tooltip')?.remove();
          win.__wikilinkDismissTimer = null;
        }, 200);
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertWikilink:
        (identifier: string) =>
        ({ commands }: { commands: import('@tiptap/core').SingleCommands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { identifier, broken: getIsBroken(identifier) },
          });
        },
    };
  },
});

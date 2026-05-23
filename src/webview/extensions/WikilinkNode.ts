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

import { Node } from '@tiptap/core';

// Module-level state for the note identifier set
let noteIdentifiers: Set<string> = new Set();

export function setWikilinkNoteIndex(identifiers: string[]): void {
  noteIdentifiers = new Set(identifiers.map(id => id.toLowerCase()));
}

export function getIsBroken(identifier: string): boolean {
  // If index not loaded yet, don't mark as broken
  if (noteIdentifiers.size === 0) {
    return false;
  }
  return !noteIdentifiers.has(identifier.toLowerCase());
}

export const WIKILINK_REGEX = /\[\[([^\]|[\n]+)\]\]/;
export const WIKILINK_REGEX_GLOBAL = /\[\[([^\]|[\n]+)\]\]/g;

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
    const broken = getIsBroken(identifier);
    const cls = broken ? 'wikilink wikilink--broken' : 'wikilink wikilink--valid';
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

  parseMarkdown(token) {
    const identifier = ((token as unknown as Record<string, string>).identifier ?? '').trim();
    if (!identifier) return [];
    return this.type.create({ identifier, broken: false });
  },

  renderMarkdown(node) {
    const identifier = (node.attrs?.identifier as string) ?? '';
    return `[[${identifier}]]`;
  },

  addInputRules() {
    return [
      {
        find: /\[\[([^\]|[\n]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const identifier = match[1];
          state.tr.replaceRangeWith(
            range.from,
            range.to,
            this.type.create({ identifier, broken: getIsBroken(identifier) })
          );
        },
      },
    ];
  },

  addPasteRules() {
    return [
      {
        find: WIKILINK_REGEX_GLOBAL,
        handler: ({ state, range, match }) => {
          const identifier = match[1];
          state.tr.replaceRangeWith(
            range.from,
            range.to,
            this.type.create({ identifier, broken: getIsBroken(identifier) })
          );
        },
      },
    ];
  },

  addNodeView() {
    return ({ node, getPos: _getPos }) => {
      const dom = document.createElement('span');
      const identifier = node.attrs.identifier as string;
      const broken = node.attrs.broken as boolean;

      dom.setAttribute('data-wikilink', '');
      dom.setAttribute('data-wikilink-id', identifier);
      dom.className = broken ? 'wikilink wikilink--broken' : 'wikilink wikilink--valid';
      dom.textContent = `[[${identifier}]]`;

      dom.addEventListener('click', () => {
        const api = (window as unknown as { vscode?: { postMessage: (msg: unknown) => void } })
          .vscode;
        if (api) {
          api.postMessage({ type: 'openWikilink', identifier });
        }
      });

      let hoverTimer: ReturnType<typeof setTimeout> | null = null;

      dom.addEventListener('mouseenter', () => {
        const rect = dom.getBoundingClientRect();
        // Stash position so tooltip can be placed even after async round-trip
        (window as unknown as Record<string, unknown>).__wikilinkHoverRect = rect;
        (window as unknown as Record<string, unknown>).__wikilinkHoverId = identifier;
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
        (window as unknown as Record<string, unknown>).__wikilinkHoverId = null;
        document.getElementById('wikilink-preview-tooltip')?.remove();
      });

      return { dom };
    };
  },

  addCommands() {
    return {
      insertWikilink:
        (identifier: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { identifier, broken: getIsBroken(identifier) },
          });
        },
    };
  },
});

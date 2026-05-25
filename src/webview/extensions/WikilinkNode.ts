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
    const alias = el.getAttribute('data-wikilink-alias') || '';
    const state = getWikilinkState(id);
    el.className = `wikilink wikilink--${state}`;
    el.setAttribute('data-wikilink-state', state);
    el.textContent = alias || getDisplayTitle(id);
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
  // Strip heading anchor (#section) for title/index lookup
  const baseId = identifier.split('#')[0];
  return noteTitleMap.get(baseId.toLowerCase()) || baseId;
}

export function getIsBroken(identifier: string): boolean {
  if (noteIdentifiers.size === 0) return false;
  return !noteIdentifiers.has(identifier.toLowerCase());
}

export function getWikilinkState(identifier: string): 'loading' | 'valid' | 'broken' {
  if (noteIdentifiers.size === 0) return 'loading';
  // Strip heading anchor (#section) before checking the index
  const baseId = identifier.split('#')[0];
  return noteIdentifiers.has(baseId.toLowerCase()) ? 'valid' : 'broken';
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
      alias: { default: '' },
      broken: { default: false },
      embedded: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
        getAttrs: el => {
          const elem = el as HTMLElement;
          const id = elem.getAttribute('data-wikilink-id') || '';
          const alias = elem.getAttribute('data-wikilink-alias') || '';
          const broken = elem.classList.contains('wikilink--broken');
          const embedded = elem.hasAttribute('data-wikilink-embedded');
          return { identifier: id, alias, broken, embedded };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const identifier = node.attrs.identifier as string;
    const alias = (node.attrs.alias as string) || '';
    const embedded = node.attrs.embedded as boolean;
    const state = getWikilinkState(identifier);
    const cls = `wikilink wikilink--${state}${embedded ? ' wikilink--embedded' : ''}`;
    const attrs: Record<string, string> = {
      'data-wikilink': '',
      'data-wikilink-id': identifier,
      class: cls,
    };
    if (alias) attrs['data-wikilink-alias'] = alias;
    if (embedded) attrs['data-wikilink-embedded'] = '';
    const displayText = alias || getDisplayTitle(identifier);
    return ['span', attrs, displayText];
  },

  markdownTokenName: 'wikilink',

  markdownTokenizer: {
    name: 'wikilink',
    level: 'inline' as const,
    // Match both ![[embedded]] and [[normal]] patterns
    start: (src: string) => {
      const embedded = src.indexOf('![[');
      const normal = src.indexOf('[[');
      if (embedded === -1) return normal;
      if (normal === -1) return embedded;
      return Math.min(embedded, normal);
    },
    tokenize(src: string) {
      // Try embedded first: ![[target]] or ![[target|alias]]
      const embeddedMatch = /^!\[\[([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/.exec(src);
      if (embeddedMatch) {
        return {
          type: 'wikilink',
          raw: embeddedMatch[0],
          identifier: embeddedMatch[1].trim(),
          alias: embeddedMatch[2]?.trim() ?? '',
          embedded: true,
        };
      }
      // Normal: [[target]] or [[target|alias]] or [[target#anchor]] or [[target#anchor|alias]]
      const match = /^\[\[([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/.exec(src);
      if (match) {
        return {
          type: 'wikilink',
          raw: match[0],
          identifier: match[1].trim(),
          alias: match[2]?.trim() ?? '',
          embedded: false,
        };
      }
      return undefined;
    },
  },

  parseMarkdown: (token, helpers) => {
    const tok = token as unknown as Record<string, unknown>;
    const identifier = ((tok.identifier as string) ?? '').trim();
    if (!identifier) return [];
    const alias = ((tok.alias as string) ?? '').trim();
    const embedded = (tok.embedded as boolean) ?? false;
    return helpers.createNode('wikilink', { identifier, alias, broken: false, embedded });
  },

  renderMarkdown: (node, _helpers) => {
    const identifier = (node.attrs?.identifier as string) ?? '';
    const alias = (node.attrs?.alias as string) ?? '';
    const embedded = (node.attrs?.embedded as boolean) ?? false;
    const prefix = embedded ? '!' : '';
    return alias ? `${prefix}[[${identifier}|${alias}]]` : `${prefix}[[${identifier}]]`;
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]|[\n]+?)(?:\|([^\]\n]+))?\]\]$/,
        handler: ({ state, range, match }) => {
          const identifier = match[1];
          const alias = match[2]?.trim() ?? '';
          state.tr.replaceRangeWith(
            range.from,
            range.to,
            this.type.create({ identifier, alias, broken: getIsBroken(identifier) })
          );
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: /!?\[\[([^\]|[\n]+?)(?:\|([^\]\n]+))?\]\]/g,
        handler: ({ state, range, match }) => {
          const raw = match[0];
          const embedded = raw.startsWith('!');
          const identifier = match[1];
          const alias = match[2]?.trim() ?? '';
          state.tr.replaceRangeWith(
            range.from,
            range.to,
            this.type.create({ identifier, alias, broken: getIsBroken(identifier), embedded })
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

      const alias = node.attrs.alias as string;
      const embedded = node.attrs.embedded as boolean;

      dom.setAttribute('data-wikilink', '');
      dom.setAttribute('data-wikilink-id', identifier);
      dom.setAttribute('data-wikilink-state', state);
      if (alias) dom.setAttribute('data-wikilink-alias', alias);
      if (embedded) dom.setAttribute('data-wikilink-embedded', '');
      dom.className = `wikilink wikilink--${state}${embedded ? ' wikilink--embedded' : ''}`;
      dom.textContent = alias || getDisplayTitle(identifier);

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
        }, 1200);
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

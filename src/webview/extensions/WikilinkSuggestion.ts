/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

/**
 * WikilinkSuggestion Extension
 *
 * Uses @tiptap/suggestion to provide an autocomplete dropdown triggered by [[.
 * - char: '[[' with allowSpaces so note names with spaces work
 * - Shows all notes on empty query, filters as user types
 * - Keyboard navigation (↑↓ Enter/Tab Esc)
 * - "Create: [[query]]" option when no matches found
 */

import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion';
import { getIsBroken } from './WikilinkNode';
import type { WikilinkNote } from '../../services/foam-integration';

// Module-level cache populated by the extension host noteIndex message
let noteCache: WikilinkNote[] = [];

export function setWikilinkSuggestionNotes(notes: WikilinkNote[]): void {
  noteCache = notes;
}

function filterNotes(query: string): WikilinkNote[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return noteCache.slice(0, 15);
  return noteCache
    .filter(
      note =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.identifier.toLowerCase().includes(lowerQuery) ||
        note.aliases.some(a => a.toLowerCase().includes(lowerQuery))
    )
    .slice(0, 15);
}

function buildItems(query: string): WikilinkNote[] {
  const matches = filterNotes(query);
  if (matches.length === 0 && query.trim()) {
    // Offer to create a new note with the typed query as identifier
    return [{ identifier: query.trim(), title: `Create: [[${query.trim()}]]`, fsPath: '', aliases: [], sections: [] }];
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Dropdown DOM helpers
// ---------------------------------------------------------------------------

function renderDropdown(
  el: HTMLElement,
  items: WikilinkNote[],
  selectedIndex: number,
  query: string,
  onSelect: (note: WikilinkNote) => void,
  onHover: (idx: number) => void
): void {
  el.innerHTML = '';
  items.forEach((note, idx) => {
    const item = document.createElement('div');
    const isCreate = note.identifier === CREATE_SENTINEL;
    item.className = [
      'wikilink-suggestion__item',
      isCreate ? 'wikilink-suggestion__create' : '',
      idx === selectedIndex ? 'selected' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (isCreate) {
      item.textContent = note.title;
    } else {
      const titleEl = document.createElement('span');
      titleEl.className = 'wikilink-suggestion__title';
      titleEl.textContent = note.title;

      const idEl = document.createElement('span');
      idEl.className = 'wikilink-suggestion__id';
      idEl.textContent = note.identifier !== note.title ? note.identifier : '';

      item.appendChild(titleEl);
      item.appendChild(idEl);
    }

    item.addEventListener('mousedown', e => {
      e.preventDefault(); // keep editor focus
      onSelect(note);
    });
    item.addEventListener('mouseenter', () => onHover(idx));
    el.appendChild(item);
  });

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'wikilink-suggestion__empty';
    empty.textContent = query.trim() ? `No notes matching "${query}"` : 'No notes in index';
    el.appendChild(empty);
  }
}

function positionDropdown(el: HTMLElement, decorationNode: Element | null): void {
  const anchor = decorationNode ?? (window.getSelection()?.getRangeAt(0)?.getBoundingClientRect() as unknown as Element);
  if (!anchor) return;
  const rect = anchor instanceof Element ? anchor.getBoundingClientRect() : (anchor as unknown as DOMRect);
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export const WikilinkSuggestion = Extension.create({
  name: 'wikilinkSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion<WikilinkNote>({
        editor: this.editor,

        char: '[[',
        allowSpaces: true,

        // Only activate when preceded by whitespace, start-of-line, or nothing
        allowedPrefixes: null,

        items: ({ query }) => buildItems(query),

        command: ({ editor, range, props: note }) => {
          const { identifier } = note;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'wikilink',
              attrs: { identifier, broken: getIsBroken(identifier) },
            })
            .run();
        },

        render: () => {
          let el: HTMLElement | null = null;
          let currentProps: SuggestionProps<WikilinkNote> | null = null;
          let selectedIndex = 0;

          function redraw(): void {
            if (!el || !currentProps) return;
            renderDropdown(
              el,
              currentProps.items,
              selectedIndex,
              currentProps.query,
              note => currentProps?.command(note),
              idx => {
                selectedIndex = idx;
                redraw();
              }
            );
            positionDropdown(el, currentProps.decorationNode);
          }

          function mount(): void {
            el = document.createElement('div');
            el.className = 'wikilink-suggestion';
            document.body.appendChild(el);
          }

          function unmount(): void {
            el?.remove();
            el = null;
            currentProps = null;
            selectedIndex = 0;
          }

          return {
            onStart(props) {
              currentProps = props;
              selectedIndex = 0;
              mount();
              redraw();
            },

            onUpdate(props) {
              currentProps = props;
              selectedIndex = 0;
              if (!el) mount();
              redraw();
            },

            onKeyDown({ event }: SuggestionKeyDownProps): boolean {
              if (!currentProps?.items.length) return false;

              if (event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % currentProps.items.length;
                redraw();
                return true;
              }
              if (event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + currentProps.items.length) % currentProps.items.length;
                redraw();
                return true;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                const selected = currentProps.items[selectedIndex];
                if (selected) {
                  currentProps.command(selected);
                  return true;
                }
              }
              if (event.key === 'Escape') {
                unmount();
                return true;
              }
              return false;
            },

            onExit() {
              unmount();
            },
          };
        },
      }),
    ];
  },
});

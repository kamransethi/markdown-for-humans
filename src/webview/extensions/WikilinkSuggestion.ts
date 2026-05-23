/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

/**
 * WikilinkSuggestion Extension
 *
 * ProseMirror plugin for autocomplete dropdown triggered by [[
 * - Floating dropdown with note suggestions
 * - Keyboard navigation (↑↓ Enter/Tab Esc)
 * - Case-insensitive filtering on title/identifier/aliases
 * - Real-time positioning following cursor
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { WikilinkNote } from '../../services/foam-integration';

// Module-level state for suggestion data
let noteCache: WikilinkNote[] = [];

export function setWikilinkSuggestionNotes(notes: WikilinkNote[]): void {
  noteCache = notes;
}

interface DropdownState {
  query: string;
  from: number;
  selectedIndex: number;
  items: WikilinkNote[];
  el: HTMLElement | null;
}

function filterNotes(query: string): WikilinkNote[] {
  const lowerQuery = query.toLowerCase().trim();
  // Show all notes (up to 15) when no query yet — this is the initial [[  state
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

function createDropdownUI(state: DropdownState): void {
  if (!state.el) {
    state.el = document.createElement('div');
    state.el.className = 'wikilink-suggestion';
    document.body.appendChild(state.el);
  }

  state.el.innerHTML = '';

  if (state.items.length === 0) {
    if (state.query.trim()) {
      // Offer to create a new note with this name
      const createItem = document.createElement('div');
      createItem.className = 'wikilink-suggestion__item wikilink-suggestion__create';
      createItem.textContent = `Create: [[${state.query}]]`;
      createItem.addEventListener('click', () => {
        const event = new CustomEvent('wikilink:select', {
          detail: { note: { identifier: state.query, title: state.query, fsPath: '', aliases: [], sections: [] }, from: state.from },
        });
        document.dispatchEvent(event);
      });
      state.el.appendChild(createItem);
    } else {
      const empty = document.createElement('div');
      empty.className = 'wikilink-suggestion__empty';
      empty.textContent = 'No notes found';
      state.el.appendChild(empty);
    }
    return;
  }

  state.items.forEach((note, idx) => {
    const item = document.createElement('div');
    item.className = `wikilink-suggestion__item ${idx === state.selectedIndex ? 'selected' : ''}`;

    const title = document.createElement('span');
    title.className = 'wikilink-suggestion__title';
    title.textContent = note.title;

    const id = document.createElement('span');
    id.className = 'wikilink-suggestion__id';
    id.textContent = note.identifier;

    item.appendChild(title);
    item.appendChild(id);

    item.addEventListener('click', () => {
      // Fire selectItem on the editor view
      const event = new CustomEvent('wikilink:select', { detail: { note, from: state.from } });
      document.dispatchEvent(event);
    });

    item.addEventListener('mouseenter', () => {
      state.selectedIndex = idx;
      createDropdownUI(state);
    });

    state.el!.appendChild(item);
  });
}

function positionDropdown(el: HTMLElement, _from: number): void {
  // Find cursor position via prosemirror DOM
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return;

  el.style.position = 'fixed';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
}

function destroyDropdown(state: DropdownState): void {
  if (state.el) {
    state.el.remove();
    state.el = null;
  }
}

export const WikilinkSuggestion = Extension.create({
  name: 'wikilinkSuggestion',

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('wikilinkSuggestion');
    const dropdownState: DropdownState = {
      query: '',
      from: 0,
      selectedIndex: 0,
      items: [],
      el: null,
    };

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => dropdownState,
          apply: (tr, state) => state,
        },
        props: {
          handleKeyDown: (view, event) => {
            if (!dropdownState.el || dropdownState.items.length === 0) {
              return false;
            }

            if (event.key === 'ArrowDown') {
              dropdownState.selectedIndex =
                (dropdownState.selectedIndex + 1) % dropdownState.items.length;
              createDropdownUI(dropdownState);
              return true;
            }

            if (event.key === 'ArrowUp') {
              dropdownState.selectedIndex =
                (dropdownState.selectedIndex - 1 + dropdownState.items.length) %
                dropdownState.items.length;
              createDropdownUI(dropdownState);
              return true;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
              const selected = dropdownState.items[dropdownState.selectedIndex];
              if (selected) {
                const tr = view.state.tr;
                tr.deleteRange(dropdownState.from, view.state.selection.$anchor.pos);
                view.dispatch(tr);
                view.dispatch(
                  view.state.tr.insertText(`[[${selected.identifier}]]`, dropdownState.from)
                );
                destroyDropdown(dropdownState);
                return true;
              }
            }

            if (event.key === 'Escape') {
              destroyDropdown(dropdownState);
              return true;
            }

            return false;
          },
          decorations: () => null,
        },
        view: (_view: EditorView) => {
          return {
            update: (updatedView: EditorView) => {
              const { doc, selection } = updatedView.state;
              const { from } = selection;

              // Read text before cursor in current text block
              const $pos = doc.resolve(from);
              const lineStart = $pos.start();
              const textInNode = doc.textBetween(lineStart, from);

              // Find last [[ that hasn't been closed
              const bracketIdx = textInNode.lastIndexOf('[[');
              if (bracketIdx === -1) {
                destroyDropdown(dropdownState);
                return;
              }

              // Extract query between [[ and cursor
              const query = textInNode.substring(bracketIdx + 2);

              // If query contains ]], close dropdown
              if (query.includes(']]')) {
                destroyDropdown(dropdownState);
                return;
              }

              // Update dropdown state
              dropdownState.query = query;
              dropdownState.from = lineStart + bracketIdx;
              dropdownState.selectedIndex = 0;
              dropdownState.items = filterNotes(query);

              if (dropdownState.items.length === 0) {
                destroyDropdown(dropdownState);
                return;
              }

              // Create/update dropdown UI
              createDropdownUI(dropdownState);
              if (dropdownState.el) {
                positionDropdown(dropdownState.el, dropdownState.from);
              }
            },
          };
        },
      }),
    ];
  },
});

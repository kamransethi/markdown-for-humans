/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

export type TocPaneAnchor = {
  id: string;
  textContent: string;
  level: number;
  itemIndex: number | string;
  pos: number;
  isActive: boolean;
};

export type NavigationTab = 'headings' | 'references' | 'search';

export type NavigationPanelState = {
  activeTab: NavigationTab;
  searchQuery: string;
  selectedItemId: string | null;
  documentUri: string;
  lastUpdatedAt: number;
  statusMessage: string | null;
};

export type NavigationReferenceItem = {
  key: string;
  notePath: string;
  title: string;
  fragment: string | null;
  occurrenceCount: number;
  broken: boolean;
};

export type NavigationContextResultPayload = {
  type: 'navigationContextResult';
  requestId: string;
  documentUri: string;
  headings: Array<{
    id: string;
    text: string;
    level: number;
    pos: number;
  }>;
  references: {
    outgoing: NavigationReferenceItem[];
    backlinks: NavigationReferenceItem[];
  };
};

export type NavigationSearchResultPayload = {
  type: 'navigationSearchResult';
  requestId: string;
  query: string;
  results: Array<{
    resultId: string;
    blockId: string;
    snippet: string;
    pos: number;
  }>;
};

export type NavigationStatusPayload = {
  type: 'navigationStatus';
  level: 'info' | 'warning';
  code:
    | 'EXACT_TARGET_RESOLVED'
    | 'FALLBACK_TO_NEAREST_BLOCK'
    | 'REFERENCE_TARGET_BROKEN'
    | 'NO_RESULTS';
  message: string;
};

type TocPaneOptions = {
  mount: HTMLElement;
  onNavigate: (anchor: TocPaneAnchor) => void;
  onSearch?: (query: string) => void;
};

type TocPaneController = {
  update: (anchors: TocPaneAnchor[]) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setReferences: (references: {
    outgoing: NavigationReferenceItem[];
    backlinks: NavigationReferenceItem[];
  }) => void;
  setSearchResults: (results: NavigationSearchResultPayload['results']) => void;
  setStatusMessage: (message: string | null) => void;
  setVisible: (visible: boolean) => void;
  toggle: () => void;
  isVisible: () => boolean;
  destroy: () => void;
  getFilterQuery: () => string;
};

function renderTocItems(
  listEl: HTMLElement,
  anchors: TocPaneAnchor[],
  onNavigate: (anchor: TocPaneAnchor) => void,
  emptyMessage = 'No headings yet'
): void {
  listEl.innerHTML = '';

  if (anchors.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'toc-pane-empty';
    empty.textContent = emptyMessage;
    listEl.appendChild(empty);
    return;
  }

  anchors.forEach(anchor => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `toc-pane-item toc-pane-level-${Math.max(1, Math.min(anchor.level, 6))}`;
    if (anchor.isActive) {
      item.classList.add('is-active');
    }

    item.setAttribute('title', anchor.textContent || '(Untitled)');
    item.setAttribute('data-id', anchor.id);
    item.setAttribute('data-pos', String(anchor.pos));

    const text = document.createElement('span');
    text.className = 'toc-pane-item-text';
    text.textContent = anchor.textContent || '(Untitled)';

    item.appendChild(text);
    item.addEventListener('click', () => onNavigate(anchor));

    listEl.appendChild(item);
  });

  const activeItem = listEl.querySelector('.toc-pane-item.is-active') as HTMLElement | null;
  if (activeItem) {
    const itemTop = activeItem.offsetTop - listEl.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    if (itemTop < listEl.scrollTop) {
      listEl.scrollTop = itemTop;
    } else if (itemBottom > listEl.scrollTop + listEl.clientHeight) {
      listEl.scrollTop = itemBottom - listEl.clientHeight;
    }
  }
}

export function createTocPane({ mount, onNavigate, onSearch }: TocPaneOptions): TocPaneController {
  const pane = document.createElement('aside');
  pane.className = 'toc-pane';
  pane.setAttribute('aria-label', 'Navigation');

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'toc-pane-resize-handle';

  const header = document.createElement('div');
  header.className = 'toc-pane-header';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'toc-pane-collapse-btn';
  collapseBtn.title = 'Hide outline pane';
  collapseBtn.setAttribute('aria-label', 'Hide outline pane');
  collapseBtn.innerHTML = '&rsaquo;&rsaquo;';
  collapseBtn.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggleTocPane'));
  });

  header.appendChild(collapseBtn);

  const tabStrip = document.createElement('div');
  tabStrip.className = 'toc-pane-tabstrip';

  const tabButtons = new Map<NavigationTab, HTMLButtonElement>();
  const makeTabButton = (tab: NavigationTab, label: string): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toc-pane-tab';
    button.setAttribute('role', 'tab');
    button.dataset.tab = tab;
    button.textContent = label;
    tabStrip.appendChild(button);
    tabButtons.set(tab, button);
    return button;
  };

  makeTabButton('headings', 'Headings');
  makeTabButton('references', 'References');
  makeTabButton('search', 'Search');

  const status = document.createElement('div');
  status.className = 'toc-pane-status';
  status.hidden = true;
  status.setAttribute('aria-live', 'polite');

  const sections = document.createElement('div');
  sections.className = 'toc-pane-sections';

  const makeSection = (tab: NavigationTab): HTMLElement => {
    const section = document.createElement('section');
    section.className = 'toc-pane-section';
    section.dataset.tab = tab;
    section.setAttribute('role', 'tabpanel');
    return section;
  };

  const headingsSection = makeSection('headings');
  const headingsList = document.createElement('div');
  headingsList.className = 'toc-pane-list';
  headingsSection.appendChild(headingsList);

  const referencesSection = makeSection('references');
  const referencesList = document.createElement('div');
  referencesList.className = 'toc-pane-list toc-pane-list--references';
  referencesSection.appendChild(referencesList);

  const searchSection = makeSection('search');

  const searchContainer = document.createElement('div');
  searchContainer.className = 'toc-pane-search-container';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'toc-pane-search-input';
  searchInput.placeholder = 'Search document\u2026';
  searchInput.setAttribute('aria-label', 'Search document');

  const searchClearBtn = document.createElement('button');
  searchClearBtn.type = 'button';
  searchClearBtn.className = 'toc-pane-search-clear';
  searchClearBtn.title = 'Clear search';
  searchClearBtn.setAttribute('aria-label', 'Clear search');
  searchClearBtn.innerHTML = '&times;';
  searchClearBtn.style.display = 'none';

  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchClearBtn);
  searchSection.appendChild(searchContainer);

  const searchList = document.createElement('div');
  searchList.className = 'toc-pane-list toc-pane-list--search';
  searchSection.appendChild(searchList);

  sections.appendChild(headingsSection);
  sections.appendChild(referencesSection);
  sections.appendChild(searchSection);

  pane.appendChild(resizeHandle);
  pane.appendChild(header);
  pane.appendChild(tabStrip);
  pane.appendChild(status);
  pane.appendChild(sections);
  mount.appendChild(pane);

  let activeTab: NavigationTab = 'headings';
  let lastAnchors: TocPaneAnchor[] = [];
  let visible = false;

  function setActiveTab(nextTab: NavigationTab) {
    activeTab = nextTab;
    tabButtons.forEach((button, tab) => {
      const isActive = tab === activeTab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });

    headingsSection.hidden = activeTab !== 'headings';
    referencesSection.hidden = activeTab !== 'references';
    searchSection.hidden = activeTab !== 'search';
  }

  function applyFilter() {
    renderTocItems(headingsList, lastAnchors, onNavigate, 'No headings yet');
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    searchClearBtn.style.display = q.length > 0 ? '' : 'none';
    if (onSearch) {
      onSearch(q);
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    if (onSearch) {
      onSearch('');
    }
    searchInput.focus();
  });

  searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      if (onSearch) {
        onSearch('');
      }
      searchInput.blur();
    }
  });

  tabStrip.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('.toc-pane-tab');
    const nextTab = target?.dataset.tab as NavigationTab | undefined;
    if (nextTab) {
      setActiveTab(nextTab);
    }
  });

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (event: MouseEvent) => {
    event.preventDefault();
    isResizing = true;
    startX = event.clientX;
    startWidth = pane.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing) return;
    const delta = startX - event.clientX;
    const newWidth = Math.max(180, Math.min(500, startWidth + delta));
    pane.style.width = `${newWidth}px`;
  };

  const onMouseUp = () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return {
    update: (anchors: TocPaneAnchor[]) => {
      lastAnchors = anchors;
      applyFilter();
    },
    setActiveTab,
    setReferences: references => {
      referencesList.innerHTML = '';

      const renderGroup = (titleText: string, items: NavigationReferenceItem[]) => {
        const headerEl = document.createElement('div');
        headerEl.className = 'toc-pane-group-header';

        const arrow = document.createElement('span');
        arrow.className = 'toc-pane-group-arrow';
        arrow.innerHTML = '&#9662;'; // Down arrow

        const title = document.createElement('span');
        title.className = 'toc-pane-group-title';
        title.textContent = `${titleText} (${items.length})`;

        headerEl.appendChild(arrow);
        headerEl.appendChild(title);
        referencesList.appendChild(headerEl);

        const container = document.createElement('div');
        container.className = 'toc-pane-group-container';
        referencesList.appendChild(container);

        headerEl.addEventListener('click', () => {
          const collapsed = container.classList.toggle('is-collapsed');
          arrow.innerHTML = collapsed ? '&#9656;' : '&#9662;'; // Right or Down arrow
        });

        if (items.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'toc-pane-empty';
          empty.textContent = `No ${titleText.toLowerCase()} yet`;
          container.appendChild(empty);
          return;
        }

        items.forEach(ref => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'toc-pane-reference-item';
          if (ref.broken) {
            btn.classList.add('is-broken');
          }

          const topRow = document.createElement('div');
          topRow.className = 'toc-pane-ref-top';

          const docTitle = document.createElement('span');
          docTitle.className = 'toc-pane-ref-title';
          // Strip extension for title if not provided
          let refName = ref.title;
          if (!refName) {
            const parts = ref.notePath.split('/');
            const filename = parts[parts.length - 1] || ref.notePath;
            refName = filename.replace(/\.md$/i, '');
          }
          docTitle.textContent = refName;
          if (ref.broken) {
            docTitle.textContent += ' (broken)';
          }

          topRow.appendChild(docTitle);

          if (ref.occurrenceCount > 1) {
            const badge = document.createElement('span');
            badge.className = 'toc-pane-ref-badge';
            badge.textContent = `x${ref.occurrenceCount}`;
            topRow.appendChild(badge);
          }

          const pathRow = document.createElement('div');
          pathRow.className = 'toc-pane-ref-path';
          pathRow.textContent = ref.notePath;

          btn.appendChild(topRow);
          btn.appendChild(pathRow);

          if (ref.fragment) {
            const contextRow = document.createElement('div');
            contextRow.className = 'toc-pane-ref-context';
            contextRow.textContent = ref.fragment;
            btn.appendChild(contextRow);
          }

          btn.addEventListener('click', () => {
            window.vscode?.postMessage({
              type: 'openFileLink',
              path: ref.notePath,
            });
          });

          container.appendChild(btn);
        });
      };

      renderGroup('Outgoing Links', references.outgoing);
      renderGroup('Backlinks', references.backlinks);
    },
    setSearchResults: results => {
      searchList.innerHTML = '';
      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'toc-pane-empty';
        empty.textContent = 'No search results yet';
        searchList.appendChild(empty);
        return;
      }

      results.forEach(res => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toc-pane-search-item';

        const snippet = document.createElement('div');
        snippet.className = 'toc-pane-search-snippet';
        snippet.innerHTML = res.snippet; // contains <mark> tags

        const position = document.createElement('div');
        position.className = 'toc-pane-search-pos';
        position.textContent = `Position: ${res.pos}`;

        btn.appendChild(snippet);
        btn.appendChild(position);

        btn.addEventListener('click', () => {
          if (onNavigate) {
            onNavigate({
              id: res.blockId,
              textContent: res.snippet.replace(/<[^>]*>/g, ''), // strip highlight tags
              level: 0,
              itemIndex: res.resultId,
              pos: res.pos,
              isActive: true,
            });
          }
        });

        searchList.appendChild(btn);
      });
    },
    setStatusMessage: message => {
      status.textContent = message || '';
      status.hidden = !message;
    },
    setVisible: (nextVisible: boolean) => {
      visible = nextVisible;
      pane.classList.toggle('is-visible', visible);
      mount.classList.toggle('toc-pane-visible', visible);
      if (!visible) {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
      }
    },
    toggle: () => {
      visible = !visible;
      pane.classList.toggle('is-visible', visible);
      mount.classList.toggle('toc-pane-visible', visible);
      if (!visible) {
        searchInput.value = '';
        searchClearBtn.style.display = 'none';
      }
    },
    isVisible: () => visible,
    getFilterQuery: () => searchInput.value,
    destroy: () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      pane.remove();
    },
  };
}

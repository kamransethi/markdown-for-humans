/**
 * @jest-environment jsdom
 */

import { createTocPane, type TocPaneAnchor } from '../../../webview/features/tocPane';

describe('TOC left pane', () => {
  const makeAnchors = (): TocPaneAnchor[] => [
    {
      id: 'first-heading',
      textContent: 'First Heading',
      level: 1,
      itemIndex: '0',
      pos: 1,
      isActive: true,
    },
    {
      id: 'second-heading',
      textContent: 'Second Heading',
      level: 2,
      itemIndex: '1',
      pos: 24,
      isActive: false,
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders anchors and emits navigate callback when clicked', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const onNavigate = jest.fn();
    const tocPane = createTocPane({ mount, onNavigate });

    tocPane.update(makeAnchors());

    const items = mount.querySelectorAll('.toc-pane-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('First Heading');
    expect(items[0].classList.contains('is-active')).toBe(true);

    (items[1] as HTMLButtonElement).click();
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'second-heading', pos: 24 })
    );
  });

  it('toggles visibility state and class', () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);

    const tocPane = createTocPane({ mount, onNavigate: jest.fn() });

    expect(tocPane.isVisible()).toBe(false);

    tocPane.setVisible(true);
    expect(tocPane.isVisible()).toBe(true);
    expect(mount.querySelector('.toc-pane')?.classList.contains('is-visible')).toBe(true);

    tocPane.toggle();
    expect(tocPane.isVisible()).toBe(false);
    expect(mount.querySelector('.toc-pane')?.classList.contains('is-visible')).toBe(false);
  });

  describe('tab switching', () => {
    it('defaults to headings tab', () => {
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      const tocPane = createTocPane({ mount, onNavigate: jest.fn() });
      tocPane.setActiveTab('headings');

      const headingsSection = mount.querySelector(
        '.toc-pane-section[data-tab="headings"]'
      ) as HTMLElement;
      const referencesSection = mount.querySelector(
        '.toc-pane-section[data-tab="references"]'
      ) as HTMLElement;
      const searchSection = mount.querySelector(
        '.toc-pane-section[data-tab="search"]'
      ) as HTMLElement;

      expect(headingsSection?.hidden).toBe(false);
      expect(referencesSection?.hidden).toBe(true);
      expect(searchSection?.hidden).toBe(true);
    });

    it('switches to search tab when search tab is clicked', () => {
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      createTocPane({ mount, onNavigate: jest.fn() });

      const searchTabBtn = mount.querySelector(
        '.toc-pane-tab[data-tab="search"]'
      ) as HTMLButtonElement;
      searchTabBtn.click();

      const searchSection = mount.querySelector(
        '.toc-pane-section[data-tab="search"]'
      ) as HTMLElement;
      expect(searchSection?.hidden).toBe(false);

      const headingsSection = mount.querySelector(
        '.toc-pane-section[data-tab="headings"]'
      ) as HTMLElement;
      expect(headingsSection?.hidden).toBe(true);
    });

    it('switches to references tab when references tab is clicked', () => {
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      createTocPane({ mount, onNavigate: jest.fn() });

      const refsTabBtn = mount.querySelector(
        '.toc-pane-tab[data-tab="references"]'
      ) as HTMLButtonElement;
      refsTabBtn.click();

      const refsSection = mount.querySelector(
        '.toc-pane-section[data-tab="references"]'
      ) as HTMLElement;
      expect(refsSection?.hidden).toBe(false);
    });
  });

  describe('search tab', () => {
    function setup() {
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      const onNavigate = jest.fn();
      const onSearch = jest.fn();
      const tocPane = createTocPane({ mount, onNavigate, onSearch });
      tocPane.setVisible(true);

      // Switch to search tab
      tocPane.setActiveTab('search');

      const searchInput = mount.querySelector('.toc-pane-search-input') as HTMLInputElement;
      const clearBtn = mount.querySelector('.toc-pane-search-clear') as HTMLButtonElement;

      function typeSearch(text: string) {
        searchInput.value = text;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return { mount, onNavigate, onSearch, tocPane, searchInput, clearBtn, typeSearch };
    }

    it('calls onSearch callback when typing in search input', () => {
      const { onSearch, typeSearch } = setup();

      typeSearch('hello');
      expect(onSearch).toHaveBeenCalledWith('hello');
    });

    it('shows clear button only when search has text', () => {
      const { clearBtn, typeSearch } = setup();

      expect(clearBtn.style.display).toBe('none');
      typeSearch('test');
      expect(clearBtn.style.display).toBe('');
      typeSearch('');
      expect(clearBtn.style.display).toBe('none');
    });

    it('clear button resets search and calls onSearch with empty string', () => {
      const { onSearch, clearBtn, typeSearch, searchInput } = setup();

      typeSearch('deploy');
      onSearch.mockClear();

      clearBtn.click();
      expect(searchInput.value).toBe('');
      expect(onSearch).toHaveBeenCalledWith('');
    });

    it('Escape key clears search input', () => {
      const { onSearch, typeSearch, searchInput } = setup();

      typeSearch('hello');
      onSearch.mockClear();

      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(searchInput.value).toBe('');
      expect(onSearch).toHaveBeenCalledWith('');
    });

    it('clears search when pane is hidden via toggle', () => {
      const { tocPane, typeSearch, searchInput } = setup();

      typeSearch('test');
      expect(searchInput.value).toBe('test');

      tocPane.toggle(); // hide
      expect(searchInput.value).toBe('');
    });

    it('renders search results with snippet and position', () => {
      const { mount, tocPane } = setup();

      tocPane.setSearchResults([
        {
          resultId: 'r1',
          blockId: 'block-1',
          snippet: 'This is a <mark>test</mark> result',
          pos: 42,
        },
        {
          resultId: 'r2',
          blockId: 'block-2',
          snippet: 'Another <mark>test</mark> match',
          pos: 100,
        },
      ]);

      const items = mount.querySelectorAll('.toc-pane-search-item');
      expect(items.length).toBe(2);

      const snippet1 = items[0].querySelector('.toc-pane-search-snippet');
      expect(snippet1?.innerHTML).toContain('<mark>test</mark>');

      const pos1 = items[0].querySelector('.toc-pane-search-pos');
      expect(pos1?.textContent).toContain('42');
    });

    it('shows empty message when no search results', () => {
      const { mount, tocPane } = setup();

      tocPane.setSearchResults([]);

      const empty = mount.querySelector('.toc-pane-list--search .toc-pane-empty');
      expect(empty?.textContent).toBe('No search results yet');
    });

    it('navigates to search result when clicked', () => {
      const { mount, tocPane, onNavigate } = setup();

      tocPane.setSearchResults([
        {
          resultId: 'r1',
          blockId: 'block-1',
          snippet: 'Test <mark>match</mark>',
          pos: 42,
        },
      ]);

      const item = mount.querySelector('.toc-pane-search-item') as HTMLButtonElement;
      item.click();

      expect(onNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'block-1',
          pos: 42,
          level: 0,
        })
      );
    });
  });

  describe('references tab', () => {
    function setup() {
      const mount = document.createElement('div');
      document.body.appendChild(mount);

      // Mock window.vscode for the click handler
      Object.defineProperty(window, 'vscode', {
        value: { postMessage: jest.fn() },
        writable: true,
        configurable: true,
      });

      const onNavigate = jest.fn();
      const tocPane = createTocPane({ mount, onNavigate });
      tocPane.setVisible(true);
      tocPane.setActiveTab('references');

      return { mount, tocPane };
    }

    it('renders outgoing and backlinks groups', () => {
      const { mount, tocPane } = setup();

      tocPane.setReferences({
        outgoing: [
          {
            key: 'notes/other.md',
            notePath: 'notes/other.md',
            title: 'Other Note',
            fragment: null,
            occurrenceCount: 1,
            broken: false,
          },
        ],
        backlinks: [
          {
            key: 'notes/linking.md',
            notePath: 'notes/linking.md',
            title: 'Linking Note',
            fragment: 'mentioned in context',
            occurrenceCount: 2,
            broken: false,
          },
        ],
      });

      const headers = mount.querySelectorAll('.toc-pane-group-header');
      expect(headers.length).toBe(2);
      expect(headers[0].textContent).toContain('Outgoing Links');
      expect(headers[0].textContent).toContain('(1)');
      expect(headers[1].textContent).toContain('Backlinks');
      expect(headers[1].textContent).toContain('(1)');

      const refItems = mount.querySelectorAll('.toc-pane-reference-item');
      expect(refItems.length).toBe(2);

      const firstTitle = refItems[0].querySelector('.toc-pane-ref-title');
      expect(firstTitle?.textContent).toBe('Other Note');

      const secondTitle = refItems[1].querySelector('.toc-pane-ref-title');
      expect(secondTitle?.textContent).toBe('Linking Note');

      const badge = refItems[1].querySelector('.toc-pane-ref-badge');
      expect(badge?.textContent).toBe('x2');

      const context = refItems[1].querySelector('.toc-pane-ref-context');
      expect(context?.textContent).toBe('mentioned in context');
    });

    it('marks broken links with is-broken class', () => {
      const { mount, tocPane } = setup();

      tocPane.setReferences({
        outgoing: [
          {
            key: 'missing.md',
            notePath: 'missing.md',
            title: 'Missing',
            fragment: null,
            occurrenceCount: 1,
            broken: true,
          },
        ],
        backlinks: [],
      });

      const refItem = mount.querySelector('.toc-pane-reference-item');
      expect(refItem?.classList.contains('is-broken')).toBe(true);
      expect(refItem?.querySelector('.toc-pane-ref-title')?.textContent).toContain('(broken)');
    });

    it('shows empty message when no outgoing or backlinks', () => {
      const { mount, tocPane } = setup();

      tocPane.setReferences({ outgoing: [], backlinks: [] });

      const emptyMessages = mount.querySelectorAll('.toc-pane-list--references .toc-pane-empty');
      expect(emptyMessages.length).toBe(2);
      expect(emptyMessages[0].textContent).toBe('No outgoing links yet');
      expect(emptyMessages[1].textContent).toBe('No backlinks yet');
    });

    it('collapses group when header is clicked', () => {
      const { mount, tocPane } = setup();

      tocPane.setReferences({
        outgoing: [
          {
            key: 'notes/a.md',
            notePath: 'notes/a.md',
            title: 'A',
            fragment: null,
            occurrenceCount: 1,
            broken: false,
          },
        ],
        backlinks: [],
      });

      const header = mount.querySelector('.toc-pane-group-header') as HTMLElement;
      const container = mount.querySelector('.toc-pane-group-container') as HTMLElement;

      expect(container.classList.contains('is-collapsed')).toBe(false);

      header.click();
      expect(container.classList.contains('is-collapsed')).toBe(true);

      header.click();
      expect(container.classList.contains('is-collapsed')).toBe(false);
    });
  });

  describe('status message', () => {
    it('shows and hides status message', () => {
      const mount = document.createElement('div');
      document.body.appendChild(mount);
      const tocPane = createTocPane({ mount, onNavigate: jest.fn() });

      const statusEl = mount.querySelector('.toc-pane-status') as HTMLElement;
      expect(statusEl.hidden).toBe(true);

      tocPane.setStatusMessage('Loading references...');
      expect(statusEl.hidden).toBe(false);
      expect(statusEl.textContent).toBe('Loading references...');

      tocPane.setStatusMessage(null);
      expect(statusEl.hidden).toBe(true);
    });
  });
});

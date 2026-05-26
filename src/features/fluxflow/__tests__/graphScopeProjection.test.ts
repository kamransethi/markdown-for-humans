import { describe, expect, it } from '@jest/globals';
import { buildScopedGraphPayload } from '../graphProjection';
import { createProjectionContext } from './graphTestUtils';

describe('graph scope projection', () => {
  it('includes only open-workspace contexts in the payload', () => {
    const wsA = '/vault/a';
    const wsB = '/vault/b';

    const payload = buildScopedGraphPayload(
      [
        createProjectionContext(wsA, [{ path: 'a.md', title: 'A' }], {
          'a.md': [{ targetTitle: 'B', targetPath: null }],
        }),
        createProjectionContext(wsB, [{ path: 'b.md', title: 'B' }], { b: [] }),
      ],
      [wsA],
      'scope_changed'
    );

    expect(payload.graph.nodes.some(n => n.workspacePath === wsA)).toBe(true);
    expect(payload.graph.nodes.some(n => n.workspacePath === wsB)).toBe(false);
  });

  it('drops malformed unresolved placeholders and keeps intentional unresolved nodes', () => {
    const ws = '/vault/a';
    const payload = buildScopedGraphPayload(
      [
        createProjectionContext(ws, [{ path: 'root.md', title: 'Root' }], {
          'root.md': [
            { targetTitle: 'intended-missing', targetPath: null },
            { targetTitle: '\\\\', targetPath: null },
          ],
        }),
      ],
      [ws],
      'index_changed'
    );

    expect(
      payload.graph.nodes.some(n => n.kind === 'unresolved' && n.title === 'intended-missing')
    ).toBe(true);
    expect(payload.graph.nodes.some(n => n.kind === 'unresolved' && n.title.length === 0)).toBe(
      false
    );
  });

  it('includes tags on resolved note nodes from projection db', () => {
    const ws = '/vault/a';
    const payload = buildScopedGraphPayload(
      [
        createProjectionContext(
          ws,
          [{ path: 'note.md', title: 'Note' }],
          { 'note.md': [] },
          { 'note.md': ['alpha', 'beta'] }
        ),
      ],
      [ws],
      'index_changed'
    );

    const note = payload.graph.nodes.find(n => n.nodeId.endsWith('note.md'));
    expect(note?.tags).toEqual([{ label: 'alpha' }, { label: 'beta' }]);
  });

  it('returns empty-state when no resolved note nodes are in scope', () => {
    const ws = '/vault/a';
    const payload = buildScopedGraphPayload([], [ws], 'panel_opened');

    expect(payload.graph.nodes).toHaveLength(0);
    expect(payload.emptyState?.title).toBe('No notes in scope');
  });
});

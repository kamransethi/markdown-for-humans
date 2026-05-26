import { describe, expect, it } from '@jest/globals';
import { createGraphModel } from '../foam/lib/graph-utils';
import type { GraphData } from '../foam/protocol';

describe('createGraphModel tag synthesis', () => {
  it('creates tag nodes and links from note tags', () => {
    const graphData: GraphData = {
      nodeInfo: {
        'ws::note.md': {
          id: 'ws::note.md',
          type: 'note',
          title: 'Note',
          properties: {},
          tags: [{ label: 'alpha' }, { label: 'parent/child' }],
        },
      },
      links: [],
    };

    const model = createGraphModel(graphData);
    expect(model.nodeInfo.alpha?.type).toBe('tag');
    expect(model.nodeInfo.parent?.type).toBe('tag');
    expect(model.nodeInfo['parent/child']?.type).toBe('tag');
    expect(model.links.some(l => l.source === 'alpha' && l.target === 'ws::note.md')).toBe(true);
  });
});

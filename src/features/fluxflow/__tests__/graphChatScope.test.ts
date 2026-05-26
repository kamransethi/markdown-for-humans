import { describe, expect, it } from '@jest/globals';
import { isWorkspaceScoped } from '../graphChat';

describe('graph chat scope enforcement', () => {
  it('allows retrieval when active workspace is open', () => {
    expect(isWorkspaceScoped('docs/a.md', '/ws-a', ['/ws-a', '/ws-b'])).toBe(true);
  });

  it('rejects retrieval when active workspace is out of scope', () => {
    expect(isWorkspaceScoped('docs/a.md', '/ws-a', ['/ws-b'])).toBe(false);
  });

  it('rejects paths that escape workspace via relative traversal', () => {
    expect(isWorkspaceScoped('../outside.md', '/ws-a', ['/ws-a'])).toBe(false);
  });
});

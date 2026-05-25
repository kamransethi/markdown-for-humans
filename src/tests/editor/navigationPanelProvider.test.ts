import { MessageType } from '../../shared/messageTypes';

describe('Navigation panel provider scaffolding', () => {
  it('exposes required navigation contract message types', () => {
    expect(MessageType.NAVIGATION_CONTEXT_REQUEST).toBe('navigationContextRequest');
    expect(MessageType.NAVIGATION_CONTEXT_RESULT).toBe('navigationContextResult');
    expect(MessageType.NAVIGATION_SEARCH_REQUEST).toBe('navigationSearchRequest');
    expect(MessageType.NAVIGATION_SEARCH_RESULT).toBe('navigationSearchResult');
    expect(MessageType.NAVIGATE_TO_BLOCK).toBe('navigateToBlock');
    expect(MessageType.NAVIGATION_STATUS).toBe('navigationStatus');
  });

  it.todo('returns grouped outgoing and backlink payloads for the active document');
  it.todo('returns strict top-to-bottom search results with block IDs');
  it.todo('returns fallback status when exact block resolution fails');
});

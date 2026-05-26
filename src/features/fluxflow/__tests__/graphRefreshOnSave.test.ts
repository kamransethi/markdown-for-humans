import { describe, expect, it } from '@jest/globals';
import { emitActiveDocumentChanged, emitIndexChanged, onFluxFlowEvent } from '../events';

describe('graph refresh lifecycle events', () => {
  it('emits index-changed and active-document-changed refresh events', () => {
    const seen: string[] = [];
    const sub = onFluxFlowEvent(event => {
      seen.push(event.type);
    });

    emitIndexChanged('/ws-a', 'kg-incremental');
    emitActiveDocumentChanged('file:///ws-a/notes/a.md');

    sub.dispose();
    expect(seen).toContain('index-changed');
    expect(seen).toContain('active-document-changed');
  });
});

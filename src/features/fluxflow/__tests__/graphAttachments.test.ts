import { describe, expect, it } from '@jest/globals';
import initSqlJs from 'sql.js';
import { GraphDatabase } from '../database';
import { parseMarkdownFile } from '../indexer';
import { buildScopedGraphPayload } from '../graphProjection';
import { createProjectionContext } from './graphTestUtils';

describe('graph attachments', () => {
  it('resolves wikilinks to csv/txt resources and projects attachment nodes', async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`),
    });
    const graphDb = new GraphDatabase() as unknown as {
      db: import('sql.js').Database;
      initSchema: () => void;
      upsertDocument: (relativePath: string, title: string, hash: string) => number;
      clearLinksForDocument: (docId: number) => void;
      insertLink: (
        sourceId: number,
        targetTitle: string,
        lineNumber: number,
        context: string
      ) => void;
      resolveLinks: () => void;
      getAllDocuments: () => Array<{ path: string; title: string }>;
      getOutgoingLinks: (docPath: string) => Array<{
        targetTitle: string;
        targetPath: string | null;
      }>;
      getTagsForDocument: (docPath: string) => string[];
    };

    graphDb.db = new SQL.Database();
    graphDb.initSchema();

    const md = parseMarkdownFile(
      'See [[data/dealer-codes.txt]] and [[data/sample-transactions.csv]].',
      'note.md'
    );
    const docId = graphDb.upsertDocument('note.md', md.title, 'h1');
    graphDb.clearLinksForDocument(docId);
    for (const link of md.links) {
      graphDb.insertLink(docId, link.target, link.lineNumber, link.context);
    }

    graphDb.upsertDocument('data/dealer-codes.txt', 'dealer-codes', 'h2');
    graphDb.upsertDocument('data/sample-transactions.csv', 'sample-transactions', 'h3');
    graphDb.resolveLinks();

    const outgoing = graphDb.getOutgoingLinks('note.md');
    expect(outgoing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetTitle: 'data/dealer-codes.txt',
          targetPath: 'data/dealer-codes.txt',
        }),
        expect.objectContaining({
          targetTitle: 'data/sample-transactions.csv',
          targetPath: 'data/sample-transactions.csv',
        }),
      ])
    );

    const ws = '/vault';
    const payload = buildScopedGraphPayload(
      [
        createProjectionContext(
          ws,
          graphDb.getAllDocuments(),
          {
            'note.md': outgoing,
          },
          {}
        ),
      ],
      [ws],
      'index_changed'
    );

    const attachmentNodes = payload.graph.nodes.filter(
      n => n.uri?.includes('dealer-codes.txt') || n.uri?.includes('sample-transactions.csv')
    );
    expect(attachmentNodes).toHaveLength(2);
    expect(payload.graph.edges.some(e => e.targetNodeId.includes('dealer-codes.txt'))).toBe(true);
  });
});

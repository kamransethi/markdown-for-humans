import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';
import { GraphDatabase } from '../database';
import { parseDocumentFile } from '../indexer';

type DbDoc = {
  path: string;
  title: string;
};

function collectMarkdownFiles(root: string): string[] {
  const out: string[] = [];

  const visit = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (entry.isFile() && full.toLowerCase().endsWith('.md')) {
        out.push(full);
      }
    }
  };

  visit(root);
  return out.sort();
}

function toPathStem(lowerPath: string): string {
  if (lowerPath.endsWith('.markdown')) {
    return lowerPath.slice(0, -9);
  }
  if (lowerPath.endsWith('.md')) {
    return lowerPath.slice(0, -3);
  }
  return lowerPath;
}

function canResolveTarget(target: string, docs: DbDoc[]): boolean {
  const lowerTarget = target.toLowerCase();
  return docs.some(doc => {
    const lowerTitle = doc.title.toLowerCase();
    const lowerPath = doc.path.toLowerCase();
    const stem = toPathStem(lowerPath);

    return (
      lowerTitle === lowerTarget ||
      stem === lowerTarget ||
      lowerPath === `${lowerTarget}.md` ||
      lowerPath === `${lowerTarget}.markdown` ||
      lowerPath.endsWith(`/${lowerTarget}.md`) ||
      lowerPath.endsWith(`/${lowerTarget}.markdown`)
    );
  });
}

describe('FluxFlow stress_test indexing and resolution', () => {
  it('indexes markdown docs and resolves valid stress_test wikilinks', async () => {
    const root = path.resolve(process.cwd(), 'specs/040-wikilinks/stress_test');
    const markdownFiles = collectMarkdownFiles(root);
    expect(markdownFiles.length).toBeGreaterThan(0);

    const SQL = await initSqlJs({
      locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`),
    });

    const graphDb = new GraphDatabase() as unknown as {
      db: any;
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
      getDocumentCount: () => number;
      getAllDocuments: () => DbDoc[];
      getOutgoingLinks: (docPath: string) => Array<{
        targetTitle: string;
        lineNumber: number;
        context: string;
        targetPath: string | null;
      }>;
    };

    graphDb.db = new SQL.Database();
    graphDb.initSchema();

    for (const file of markdownFiles) {
      const relPath = path.relative(root, file).split(path.sep).join('/');
      const content = fs.readFileSync(file, 'utf8');
      const parsed = parseDocumentFile(content, relPath);

      const docId = graphDb.upsertDocument(relPath, parsed.title, `h-${relPath}`);
      graphDb.clearLinksForDocument(docId);
      for (const link of parsed.links) {
        graphDb.insertLink(docId, link.target, link.lineNumber, link.context);
      }
    }

    graphDb.resolveLinks();

    const dataDir = path.join(root, 'data');
    const dataFiles = fs
      .readdirSync(dataDir)
      .filter(name => /\.(csv|txt)$/i.test(name))
      .map(name => path.join(dataDir, name));
    expect(dataFiles.length).toBeGreaterThanOrEqual(2);

    for (const dataPath of dataFiles) {
      const relPath = path.relative(root, dataPath).split(path.sep).join('/');
      const content = fs.readFileSync(dataPath, 'utf-8');
      const parsed = parseDocumentFile(content, relPath);
      graphDb.upsertDocument(relPath, parsed.title, `h-${relPath}`);
    }
    graphDb.resolveLinks();

    expect(graphDb.getDocumentCount()).toBe(markdownFiles.length + dataFiles.length);

    const docs = graphDb.getAllDocuments();
    const knownDocPaths = new Set(docs.map(d => d.path));

    // Core regression target: this file exists and must resolve from stress docs.
    expect(knownDocPaths.has('credit-policy/credit-policy-overview.md')).toBe(true);

    const transactionOutgoing = graphDb.getOutgoingLinks('workflow/transaction-intake.md');
    expect(
      transactionOutgoing.some(
        l => l.targetTitle === 'message-queue' && l.targetPath === 'architecture/message-queue.md'
      )
    ).toBe(true);

    const readmeOutgoing = graphDb.getOutgoingLinks('README.md');
    expect(
      readmeOutgoing.some(
        l =>
          l.targetTitle === 'credit-policy-overview' &&
          l.targetPath === 'credit-policy/credit-policy-overview.md'
      )
    ).toBe(true);

    const creditOverviewOutgoing = graphDb.getOutgoingLinks(
      'credit-policy/credit-policy-overview.md'
    );
    expect(
      creditOverviewOutgoing.some(
        l =>
          l.targetTitle === 'soft-pull-vs-hard-pull' &&
          l.targetPath === 'equifax/soft-pull-vs-hard-pull.md'
      )
    ).toBe(true);

    const dealerOutgoing = graphDb.getOutgoingLinks('dealership/dealer-network.md');
    expect(
      dealerOutgoing.some(
        l => l.targetTitle === 'data/dealer-codes.txt' && l.targetPath === 'data/dealer-codes.txt'
      )
    ).toBe(true);

    const declineOutgoing = graphDb.getOutgoingLinks('decisions/decline-reasons.md');
    expect(
      declineOutgoing.some(
        l => l.targetTitle === 'dti-rules' && l.targetPath === 'credit-policy/dti-rules.md'
      )
    ).toBe(true);
    expect(
      declineOutgoing.some(
        l =>
          l.targetTitle === 'ltv-guidelines' && l.targetPath === 'credit-policy/ltv-guidelines.md'
      )
    ).toBe(true);

    // Collect unresolved targets from DB and ensure they are truly non-resolvable
    // based on current document set and resolution semantics.
    const unresolvedRows = graphDb.db.exec(`
      SELECT DISTINCT l.target_title
      FROM links l
      WHERE l.target_id IS NULL
      ORDER BY l.target_title ASC
    `);

    const unresolvedTargets: string[] = unresolvedRows.length
      ? unresolvedRows[0].values.map((row: unknown[]) => String(row[0]))
      : [];

    const falseUnresolved = unresolvedTargets.filter(target => canResolveTarget(target, docs));
    expect(falseUnresolved).toEqual([]);

    const trailingBackslashTargets = unresolvedTargets.filter(target => target.endsWith('\\'));
    expect(trailingBackslashTargets).toEqual([]);

    // Simulate stale persisted rows from older parser output and ensure resolveLinks
    // self-heals them without requiring a full parser re-run.
    graphDb.db.run(
      "UPDATE links SET target_id = NULL, target_title = 'soft-pull-vs-hard-pull\\' WHERE target_title = 'soft-pull-vs-hard-pull'"
    );
    graphDb.resolveLinks();

    const staleRepairRows = graphDb.db.exec(`
      SELECT l.target_title, d.path
      FROM links l
      LEFT JOIN documents d ON d.id = l.target_id
      WHERE l.target_title = 'soft-pull-vs-hard-pull'
    `);
    expect(staleRepairRows.length).toBe(1);
    expect(staleRepairRows[0].values.length).toBeGreaterThan(0);
    expect(
      staleRepairRows[0].values.every((row: unknown[]) => row[0] === 'soft-pull-vs-hard-pull')
    ).toBe(true);
    expect(
      staleRepairRows[0].values.some(
        (row: unknown[]) => row[1] === 'equifax/soft-pull-vs-hard-pull.md'
      )
    ).toBe(true);

    // Sanity checks for expected broken links in this vault.
    expect(unresolvedTargets).toContain('reg-b-checklist');
    expect(unresolvedTargets).toContain('dealer-scorecard');
  });
});

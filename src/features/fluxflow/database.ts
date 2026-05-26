/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

import initSqlJs, { Database } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import type { GraphDocument, BacklinkEntry, SearchResult, Chunk } from './types';

const SCHEMA_VERSION = 2;

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT    NOT NULL UNIQUE,
  title       TEXT    NOT NULL DEFAULT '',
  hash        TEXT    NOT NULL DEFAULT '',
  indexed_at  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id   INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_title TEXT   NOT NULL,
  target_id   INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL DEFAULT 0,
  context     TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tags (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag         TEXT    NOT NULL,
  source      TEXT    NOT NULL DEFAULT 'inline'
);

CREATE TABLE IF NOT EXISTS properties (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  key         TEXT    NOT NULL,
  value       TEXT    NOT NULL DEFAULT ''
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts4(
  title,
  body,
  tokenize=porter
);

CREATE TABLE IF NOT EXISTS chunks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  header_path TEXT    NOT NULL DEFAULT '',
  content     TEXT    NOT NULL DEFAULT '',
  token_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
CREATE INDEX IF NOT EXISTS idx_links_target_title ON links(target_title);
CREATE INDEX IF NOT EXISTS idx_tags_doc ON tags(doc_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
CREATE INDEX IF NOT EXISTS idx_properties_doc ON properties(doc_id);
CREATE INDEX IF NOT EXISTS idx_properties_key ON properties(key);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
`;

export function getDataDir(): string {
  const custom = vscode.workspace
    .getConfiguration('gptAiMarkdownEditor')
    .get<string>('knowledgeGraph.dataDir', '');
  if (custom) {
    return custom.startsWith('~') ? path.join(os.homedir(), custom.slice(1)) : custom;
  }
  return path.join(os.homedir(), '.fluxflow');
}

export function getWorkspaceHash(workspacePath: string): string {
  return crypto.createHash('sha256').update(workspacePath).digest('hex').slice(0, 16);
}

function normalizeStoredTargetTitle(rawTarget: string): string {
  let target = rawTarget.trim().toLowerCase();
  if (!target) return '';

  target = target.replace(/\\([\\|#[\]])/g, '$1');
  target = target.replace(/\\+$/g, '');

  return target.trim();
}

export class GraphDatabase {
  private db: Database | null = null;
  private dbPath: string = '';
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty: boolean = false;

  async open(workspacePath: string): Promise<void> {
    const dataDir = getDataDir();
    const hash = getWorkspaceHash(workspacePath);
    this.dbPath = path.join(dataDir, 'workspaces', hash, 'graph.db');

    const SQL = await initSqlJs({
      locateFile: (file: string) => path.join(__dirname, file),
    });

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON;');
    this.initSchema();
  }

  close(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveNow();
    this.db?.close();
    this.db = null;
  }

  private initSchema(): void {
    if (!this.db) return;
    const result = this.db.exec('PRAGMA user_version;');
    const currentVersion = (result[0]?.values[0]?.[0] as number) ?? 0;

    if (currentVersion < SCHEMA_VERSION) {
      if (currentVersion > 0) {
        // Old schema — drop everything and start fresh
        this.db.run('DROP TABLE IF EXISTS chunks;');
        this.db.run('DROP TABLE IF EXISTS properties;');
        this.db.run('DROP TABLE IF EXISTS tags;');
        this.db.run('DROP TABLE IF EXISTS links;');
        this.db.run('DELETE FROM fts;');
        this.db.run('DROP TABLE IF EXISTS documents;');
      }

      for (const statement of SCHEMA_DDL.split(/;\s*\n/)) {
        const trimmed = statement.trim();
        if (trimmed) {
          this.db.run(trimmed + ';');
        }
      }
      this.db.run(`PRAGMA user_version = ${SCHEMA_VERSION};`);
      this.dirty = true;
    }
  }

  scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveNow();
      this.saveTimer = null;
    }, 5000);
  }

  saveNow(): void {
    if (!this.db || !this.dirty) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, buffer);
    this.dirty = false;
  }

  // --- Document operations ---

  upsertDocument(relativePath: string, title: string, hash: string): number {
    this.db!.run(
      `INSERT INTO documents (path, title, hash, indexed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET title=excluded.title, hash=excluded.hash, indexed_at=excluded.indexed_at`,
      [relativePath, title, hash, Date.now()]
    );
    const rows = this.db!.exec('SELECT id FROM documents WHERE path = ?', [relativePath]);
    this.dirty = true;
    return rows[0].values[0][0] as number;
  }

  getDocumentByPath(relativePath: string): GraphDocument | null {
    const rows = this.db!.exec(
      'SELECT id, path, title, hash, indexed_at FROM documents WHERE path = ?',
      [relativePath]
    );
    if (!rows.length || !rows[0].values.length) return null;
    const r = rows[0].values[0];
    return {
      id: r[0] as number,
      path: r[1] as string,
      title: r[2] as string,
      hash: r[3] as string,
      indexedAt: r[4] as number,
    };
  }

  deleteDocument(relativePath: string): void {
    const doc = this.getDocumentByPath(relativePath);
    if (!doc) return;
    // FTS cleanup first (not cascaded automatically)
    this.clearFtsForDocument(doc.id);
    this.db!.run('DELETE FROM documents WHERE id = ?', [doc.id]);
    this.dirty = true;
  }

  getDocumentHash(relativePath: string): string | null {
    const rows = this.db!.exec('SELECT hash FROM documents WHERE path = ?', [relativePath]);
    if (!rows.length || !rows[0].values.length) return null;
    return rows[0].values[0][0] as string;
  }

  getDocumentCount(): number {
    const rows = this.db!.exec('SELECT COUNT(*) FROM documents');
    return rows[0].values[0][0] as number;
  }

  getAllDocuments(): Array<{ id: number; path: string; title: string }> {
    if (!this.db) return [];
    const rows = this.db.exec('SELECT id, path, title FROM documents ORDER BY path ASC');
    if (!rows.length) return [];
    return rows[0].values.map((row: unknown[]) => ({
      id: row[0] as number,
      path: row[1] as string,
      title: row[2] as string,
    }));
  }

  getDbPath(): string {
    return this.dbPath;
  }

  // --- Link operations ---

  clearLinksForDocument(docId: number): void {
    this.db!.run('DELETE FROM links WHERE source_id = ?', [docId]);
  }

  insertLink(sourceId: number, targetTitle: string, lineNumber: number, context: string): void {
    this.db!.run(
      'INSERT INTO links (source_id, target_title, line_number, context) VALUES (?, ?, ?, ?)',
      [sourceId, targetTitle, lineNumber, context]
    );
  }

  resolveLinks(): void {
    if (!this.db) return;

    const docs = this.getAllDocuments().map(doc => {
      const pathLower = doc.path.toLowerCase();
      const stemLower = pathLower.endsWith('.markdown')
        ? pathLower.slice(0, -9)
        : pathLower.endsWith('.md')
          ? pathLower.slice(0, -3)
          : pathLower;

      return {
        id: doc.id,
        path: doc.path,
        pathLower,
        stemLower,
        titleLower: (doc.title || '').toLowerCase(),
      };
    });

    const unresolvedRows = this.db.exec(
      'SELECT id, target_title FROM links WHERE target_id IS NULL ORDER BY id ASC'
    );
    if (!unresolvedRows.length) return;

    for (const row of unresolvedRows[0].values) {
      const linkId = row[0] as number;
      const rawTarget = String(row[1] ?? '')
        .trim()
        .toLowerCase();
      if (!rawTarget) continue;

      const target = normalizeStoredTargetTitle(rawTarget);
      if (!target) continue;

      if (target !== rawTarget) {
        this.db.run('UPDATE links SET target_title = ? WHERE id = ?', [target, linkId]);
      }

      const ranked = docs
        .map(doc => {
          let rank = Number.POSITIVE_INFINITY;

          if (doc.pathLower === target) {
            rank = 0;
          } else if (doc.titleLower === target) {
            rank = 1;
          } else if (doc.stemLower === target) {
            rank = 2;
          } else if (doc.pathLower === `${target}.md` || doc.pathLower === `${target}.markdown`) {
            rank = 3;
          } else if (
            doc.pathLower.endsWith(`/${target}.md`) ||
            doc.pathLower.endsWith(`/${target}.markdown`)
          ) {
            rank = 4;
          }

          return { rank, doc };
        })
        .filter(item => Number.isFinite(item.rank))
        .sort((a, b) => a.rank - b.rank || a.doc.path.localeCompare(b.doc.path));

      if (!ranked.length) continue;

      this.db.run('UPDATE links SET target_id = ? WHERE id = ?', [ranked[0].doc.id, linkId]);
    }

    this.dirty = true;
  }

  getBacklinks(docPath: string): BacklinkEntry[] {
    const doc = this.getDocumentByPath(docPath);
    if (!doc) return [];

    const titleLower = doc.title.toLowerCase();
    // Match by both display title and filename-derived identifier since
    // wikilink targets are stored from typed identifiers (e.g. "beta-note").
    const baseIdentifier = path.basename(docPath, path.extname(docPath)).toLowerCase();
    const rows = this.db!.exec(
      `SELECT DISTINCT d.path, d.title, l.context, l.line_number, l.target_title, l.target_id
       FROM links l
       JOIN documents d ON d.id = l.source_id
       WHERE (
         l.target_title = ?
         OR l.target_title = ?
         OR l.target_id = ?
         OR l.target_title LIKE ?
         OR l.target_title LIKE ?
       )
         AND d.id != ?
       ORDER BY d.path`,
      [titleLower, baseIdentifier, doc.id, `%/${baseIdentifier}%`, `${baseIdentifier}%`, doc.id]
    );

    if (!rows.length) return [];
    const toNormalizedIdentifier = (raw: string): string => {
      let value = raw.trim().toLowerCase();
      const aliasIdx = value.indexOf('|');
      if (aliasIdx !== -1) {
        value = value.slice(0, aliasIdx).trim();
      }
      value = value.split('#')[0].trim();
      if (!value) return '';
      const base = path.basename(value);
      return path.basename(base, path.extname(base)).trim().toLowerCase();
    };

    return rows[0].values
      .filter((row: any[]) => {
        const targetTitle = String(row[4] ?? '').toLowerCase();
        const targetId = row[5] as number | null;
        if (targetId === doc.id) {
          return true;
        }
        if (targetTitle === titleLower || targetTitle === baseIdentifier) {
          return true;
        }
        const normalized = toNormalizedIdentifier(targetTitle);
        return normalized === titleLower || normalized === baseIdentifier;
      })
      .map((row: any[]) => ({
        sourcePath: row[0] as string,
        sourceTitle: row[1] as string,
        context: row[2] as string,
        lineNumber: row[3] as number,
      }));
  }

  getUnlinkedReferences(docPath: string): BacklinkEntry[] {
    const doc = this.getDocumentByPath(docPath);
    if (!doc || !doc.title) return [];

    const titleLower = doc.title.toLowerCase();
    // Escape FTS special characters
    const safeTitle = doc.title.replace(/['"^*(){}[\]]/g, '').trim();
    if (!safeTitle) return [];

    try {
      const rows = this.db!.exec(
        `SELECT d.path, d.title, '' as context, 0 as line_number
         FROM fts
         JOIN documents d ON d.id = fts.rowid
         WHERE fts MATCH ?
           AND d.id != ?
           AND d.id NOT IN (
             SELECT source_id FROM links WHERE target_title = ? OR target_id = ?
           )
         LIMIT 50`,
        [`"${safeTitle}"`, doc.id, titleLower, doc.id]
      );

      if (!rows.length) return [];
      return rows[0].values.map((row: any[]) => ({
        sourcePath: row[0] as string,
        sourceTitle: row[1] as string,
        context: row[2] as string,
        lineNumber: row[3] as number,
      }));
    } catch {
      // FTS query can fail on unusual input — return empty
      return [];
    }
  }

  // --- Tag operations ---

  clearTagsForDocument(docId: number): void {
    this.db!.run('DELETE FROM tags WHERE doc_id = ?', [docId]);
  }

  insertTag(docId: number, tag: string, source: 'inline' | 'frontmatter'): void {
    this.db!.run('INSERT INTO tags (doc_id, tag, source) VALUES (?, ?, ?)', [docId, tag, source]);
  }

  getAllTags(): Array<{ tag: string; count: number }> {
    const rows = this.db!.exec(
      'SELECT tag, COUNT(*) as cnt FROM tags GROUP BY tag ORDER BY cnt DESC'
    );
    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => ({
      tag: row[0] as string,
      count: row[1] as number,
    }));
  }

  getTagsForDocument(docPath: string): string[] {
    const rows = this.db!.exec(
      `SELECT t.tag FROM tags t
       INNER JOIN documents d ON d.id = t.doc_id
       WHERE d.path = ?
       ORDER BY t.tag`,
      [docPath]
    );
    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => row[0] as string);
  }

  // --- Property operations ---

  clearPropertiesForDocument(docId: number): void {
    this.db!.run('DELETE FROM properties WHERE doc_id = ?', [docId]);
  }

  insertProperty(docId: number, key: string, value: string): void {
    this.db!.run('INSERT INTO properties (doc_id, key, value) VALUES (?, ?, ?)', [
      docId,
      key,
      value,
    ]);
  }

  // --- FTS operations ---

  clearFtsForDocument(docId: number): void {
    this.db!.run('DELETE FROM fts WHERE rowid = ?', [docId]);
  }

  upsertFts(docId: number, title: string, body: string): void {
    // Delete old entry then insert new one
    this.db!.run('DELETE FROM fts WHERE rowid = ?', [docId]);
    this.db!.run('INSERT INTO fts (rowid, title, body) VALUES (?, ?, ?)', [docId, title, body]);
  }

  search(query: string, snippetTokens = 40, limit = 50): SearchResult[] {
    const safeQuery = query.replace(/['"]/g, '').trim();
    if (!safeQuery) return [];

    try {
      const rows = this.db!.exec(
        `SELECT d.path, d.title, snippet(fts, '**', '**', '...', 1, ?) as snippet
         FROM fts
         JOIN documents d ON d.id = fts.rowid
         WHERE fts MATCH ?
         LIMIT ?`,
        [snippetTokens, safeQuery, limit]
      );

      if (!rows.length) return [];
      return rows[0].values.map((row: any[]) => ({
        path: row[0] as string,
        title: row[1] as string,
        snippet: row[2] as string,
      }));
    } catch {
      return [];
    }
  }

  // --- Transaction helpers ---

  begin(): void {
    this.db!.run('BEGIN TRANSACTION;');
  }

  commit(): void {
    this.db!.run('COMMIT;');
    this.dirty = true;
  }

  // --- Chunk operations (Phase 2) ---

  clearChunksForDocument(docId: number): void {
    this.db!.run('DELETE FROM chunks WHERE doc_id = ?', [docId]);
  }

  insertChunk(docId: number, headerPath: string, content: string, tokenCount: number): number {
    this.db!.run(
      'INSERT INTO chunks (doc_id, header_path, content, token_count) VALUES (?, ?, ?, ?)',
      [docId, headerPath, content, tokenCount]
    );
    const rows = this.db!.exec('SELECT last_insert_rowid()');
    return rows[0].values[0][0] as number;
  }

  getChunksForDocument(docId: number): Chunk[] {
    const rows = this.db!.exec(
      'SELECT id, doc_id, header_path, content, token_count FROM chunks WHERE doc_id = ? ORDER BY id',
      [docId]
    );
    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => ({
      id: row[0] as number,
      docId: row[1] as number,
      headerPath: row[2] as string,
      content: row[3] as string,
      tokenCount: row[4] as number,
    }));
  }

  getChunkById(chunkId: number): Chunk | null {
    const rows = this.db!.exec(
      'SELECT id, doc_id, header_path, content, token_count FROM chunks WHERE id = ?',
      [chunkId]
    );
    if (!rows.length || !rows[0].values.length) return null;
    const row = rows[0].values[0];
    return {
      id: row[0] as number,
      docId: row[1] as number,
      headerPath: row[2] as string,
      content: row[3] as string,
      tokenCount: row[4] as number,
    };
  }

  getAllChunkIds(): number[] {
    const rows = this.db!.exec('SELECT id FROM chunks ORDER BY id');
    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => row[0] as number);
  }

  getChunkCount(): number {
    const rows = this.db!.exec('SELECT COUNT(*) FROM chunks');
    return rows[0].values[0][0] as number;
  }

  /** Get linked document IDs from the links table (for graph expansion) */
  getLinkedDocIds(docId: number): number[] {
    const rows = this.db!.exec(
      `SELECT DISTINCT target_id FROM links WHERE source_id = ? AND target_id IS NOT NULL
       UNION
       SELECT DISTINCT source_id FROM links WHERE target_id = ?`,
      [docId, docId]
    );
    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => row[0] as number);
  }

  getDocumentById(docId: number): GraphDocument | null {
    const rows = this.db!.exec(
      'SELECT id, path, title, hash, indexed_at FROM documents WHERE id = ?',
      [docId]
    );
    if (!rows.length || !rows[0].values.length) return null;
    const r = rows[0].values[0];
    return {
      id: r[0] as number,
      path: r[1] as string,
      title: r[2] as string,
      hash: r[3] as string,
      indexedAt: r[4] as number,
    };
  }

  getOutgoingLinks(docPath: string): Array<{
    targetTitle: string;
    lineNumber: number;
    context: string;
    targetPath: string | null;
  }> {
    if (!this.db) return [];
    const doc = this.getDocumentByPath(docPath);
    if (!doc) return [];

    const rows = this.db.exec(
      `SELECT l.target_title, l.line_number, l.context, d2.path
       FROM links l
       LEFT JOIN documents d2 ON d2.id = l.target_id
       WHERE l.source_id = ?`,
      [doc.id]
    );
    if (!rows.length || !rows[0].values.length) return [];
    return rows[0].values.map((row: any[]) => ({
      targetTitle: row[0] as string,
      lineNumber: row[1] as number,
      context: row[2] as string,
      targetPath: row[3] as string | null,
    }));
  }
}

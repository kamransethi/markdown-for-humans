/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { GraphDatabase } from './database';
import { parseDocumentFile } from './indexer';
import { chunkMarkdown } from './chunker';

import { FluxFlowWatcher } from './watcher';
import { registerFluxFlowCommands } from './commands';
import { openChatPanel } from './chatPanel';
import { createEmbeddingEngine, type EmbeddingEngine } from './embeddingEngine';
import { VectorStore } from './vectorStore';
import { openGraphPanel } from './graphPanel';
import { emitIndexChanged, emitScopeChanged } from './events';

let database: GraphDatabase | null = null;
let watcher: FluxFlowWatcher | null = null;
let vectorStore: VectorStore | null = null;
let embeddingEngine: EmbeddingEngine | null = null;
let embeddingStatus: 'ready' | 'server-unavailable' | 'model-missing' = 'server-unavailable';
let embeddingError: string | null = null;
let embeddingErrorFull: string | null = null;
let currentWorkspacePath: string | null = null;
let disposables: vscode.Disposable[] = [];

// ---- Wikilink multi-root index (always-on, independent of KG flag) ----
const wikilinkDatabases = new Map<string, GraphDatabase>();
export function getWikilinkDatabase(workspacePath: string): GraphDatabase | undefined {
  return wikilinkDatabases.get(workspacePath);
}
const wikilinkChangeCallbacks: Array<() => void> = [];

export interface WikilinkDocument {
  identifier: string; // filename stem (e.g. "notes" for "notes.md")
  title: string;
  fsPath: string; // absolute path
  workspacePath: string;
}

export interface WikilinkBacklinkSummary {
  sourcePath: string;
  sourceTitle: string;
}

function notifyWikilinkChange(): void {
  for (const cb of wikilinkChangeCallbacks) {
    cb();
  }
}

async function indexMarkdownFileForWikilinks(
  db: GraphDatabase,
  workspacePath: string,
  fsPath: string
): Promise<void> {
  try {
    const content = await fs.promises.readFile(fsPath, 'utf-8');
    const relPath = path.relative(workspacePath, fsPath).split(path.sep).join('/');
    const parsed = parseDocumentFile(content, relPath);
    const docId = db.upsertDocument(relPath, parsed.title, '');
    db.clearLinksForDocument(docId);
    for (const link of parsed.links) {
      db.insertLink(docId, link.target, link.lineNumber, link.context);
    }
  } catch {
    // Skip unreadable files
  }
}

async function indexAllMarkdownForWikilinks(
  workspacePath: string,
  db: GraphDatabase
): Promise<void> {
  const mdFiles = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspacePath, '**/*.md'),
    '**/node_modules/**'
  );
  for (const fileUri of mdFiles) {
    await indexMarkdownFileForWikilinks(db, workspacePath, fileUri.fsPath);
  }
  db.resolveLinks();
  db.saveNow();
}

async function openWikilinkFolder(workspacePath: string): Promise<void> {
  // Re-use existing KG database if already open for this workspace
  if (currentWorkspacePath === workspacePath && database) {
    wikilinkDatabases.set(workspacePath, database);
    return;
  }
  if (wikilinkDatabases.has(workspacePath)) {
    return; // already open
  }
  const db = new GraphDatabase();
  await db.open(workspacePath);
  wikilinkDatabases.set(workspacePath, db);
  await indexAllMarkdownForWikilinks(workspacePath, db);
}

/**
 * Initialize the always-on wikilink indexer for all workspace folders.
 * Call from extension.ts activate() unconditionally (not gated on KG flag).
 */
export async function initializeForWikilinks(context: vscode.ExtensionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    await openWikilinkFolder(folder.uri.fsPath);
  }
  emitScopeChanged(
    folders.map(folder => folder.uri.fsPath),
    'initialize'
  );

  // Track workspace folder additions/removals
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async event => {
      for (const folder of event.added) {
        await openWikilinkFolder(folder.uri.fsPath);
        notifyWikilinkChange();
      }
      for (const folder of event.removed) {
        const fp = folder.uri.fsPath;
        const db = wikilinkDatabases.get(fp);
        // Only close if not the shared KG database
        if (db && db !== database) {
          db.close();
        }
        wikilinkDatabases.delete(fp);
        notifyWikilinkChange();
      }
      emitScopeChanged(
        (vscode.workspace.workspaceFolders ?? []).map(folder => folder.uri.fsPath),
        'workspace-folders-changed'
      );
    })
  );

  // Always-on file watcher for .md files — re-index on change/create/delete
  const mdWatcher = vscode.workspace.createFileSystemWatcher('**/*.md');
  context.subscriptions.push(mdWatcher);

  const handleUpsert = async (uri: vscode.Uri): Promise<void> => {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) return;
    const db = wikilinkDatabases.get(folder.uri.fsPath);
    if (!db) return;
    await indexMarkdownFileForWikilinks(db, folder.uri.fsPath, uri.fsPath);
    notifyWikilinkChange();
    emitIndexChanged(folder.uri.fsPath, 'wikilink');
  };

  const handleDelete = (uri: vscode.Uri): void => {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) return;
    const db = wikilinkDatabases.get(folder.uri.fsPath);
    if (!db) return;
    const relPath = path.relative(folder.uri.fsPath, uri.fsPath).split(path.sep).join('/');
    db.deleteDocument(relPath);
    notifyWikilinkChange();
    emitIndexChanged(folder.uri.fsPath, 'wikilink');
  };

  context.subscriptions.push(
    mdWatcher.onDidChange(uri => void handleUpsert(uri)),
    mdWatcher.onDidCreate(uri => void handleUpsert(uri)),
    mdWatcher.onDidDelete(handleDelete)
  );
}

/** Get all wikilink documents for a workspace folder (or all folders if omitted). */
export function getWikilinkDocuments(workspacePath?: string): WikilinkDocument[] {
  const toProcess: Array<[string, GraphDatabase]> = workspacePath
    ? (
        [[workspacePath, wikilinkDatabases.get(workspacePath)!]] as Array<
          [string, GraphDatabase | undefined]
        >
      ).filter((pair): pair is [string, GraphDatabase] => !!pair[1])
    : Array.from(wikilinkDatabases.entries());

  const docs: WikilinkDocument[] = [];
  for (const [folder, db] of toProcess) {
    for (const row of db.getAllDocuments()) {
      const stem = row.path.replace(/\.md$/, '');
      // Use the full relative path as identifier (e.g. "workflow/loan-orchestration")
      // so [[folder/note]] wikilinks resolve correctly. Basename-only identifiers
      // (e.g. [[loan-orchestration]]) are also added in the editor.ts noteIndex
      // handler via the flattened set.
      const identifier = stem;
      docs.push({
        identifier,
        title: row.title || path.basename(stem),
        fsPath: path.join(folder, row.path),
        workspacePath: folder,
      });
    }
  }
  return docs;
}

/** Resolve a [[identifier]] to an absolute file path within a workspace folder. */
export function resolveWikilinkPath(
  identifier: string,
  workspacePath?: string
): string | undefined {
  const normalizeIdentifier = (raw: string): string => {
    let normalized = raw.trim();
    const aliasIndex = normalized.indexOf('|');
    if (aliasIndex !== -1) {
      normalized = normalized.slice(0, aliasIndex);
    }
    const anchorIndex = normalized.indexOf('#');
    if (anchorIndex !== -1) {
      normalized = normalized.slice(0, anchorIndex);
    }
    normalized = normalized.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
    if (normalized.toLowerCase().endsWith('.md')) {
      normalized = normalized.slice(0, -3);
    }
    return normalized.toLowerCase();
  };

  const foldersToSearch: Array<[string, GraphDatabase]> = workspacePath
    ? (
        [[workspacePath, wikilinkDatabases.get(workspacePath)!]] as Array<
          [string, GraphDatabase | undefined]
        >
      ).filter((pair): pair is [string, GraphDatabase] => !!pair[1])
    : Array.from(wikilinkDatabases.entries());

  const lower = normalizeIdentifier(identifier);
  if (!lower) {
    return undefined;
  }

  for (const [folder, db] of foldersToSearch) {
    const docs = db.getAllDocuments();
    // Try exact stem match first, then basename match
    const match =
      docs.find(doc => {
        const stem = doc.path.replace(/\.md$/, '').toLowerCase();
        return stem === lower;
      }) ??
      docs.find(doc => {
        const basename = path.basename(doc.path.replace(/\.md$/, '')).toLowerCase();
        return basename === lower;
      });
    if (match) {
      return path.join(folder, match.path);
    }
  }
  return undefined;
}

/** Subscribe to wikilink index changes (file created/modified/deleted). */
export function onWikilinkIndexChange(callback: () => void): vscode.Disposable {
  wikilinkChangeCallbacks.push(callback);
  return {
    dispose: () => {
      const idx = wikilinkChangeCallbacks.indexOf(callback);
      if (idx !== -1) {
        wikilinkChangeCallbacks.splice(idx, 1);
      }
    },
  };
}

/**
 * Get backlinks for an indexed document path in a given workspace.
 */
export function getWikilinkBacklinks(
  relativePath: string,
  workspacePath: string,
  limit: number = 10
): { total: number; sources: WikilinkBacklinkSummary[] } {
  const db = wikilinkDatabases.get(workspacePath);
  if (!db) {
    return { total: 0, sources: [] };
  }

  const backlinks = db.getBacklinks(relativePath);
  const deduped = new Map<string, WikilinkBacklinkSummary>();
  for (const entry of backlinks) {
    if (!deduped.has(entry.sourcePath)) {
      deduped.set(entry.sourcePath, {
        sourcePath: entry.sourcePath,
        sourceTitle: entry.sourceTitle,
      });
    }
  }

  const all = Array.from(deduped.values());
  return {
    total: all.length,
    sources: all.slice(0, Math.max(0, limit)),
  };
}

/** Live progress state — updated during indexing and embedding phases. */
const progressState = {
  phase: 'idle' as 'idle' | 'indexing' | 'embedding' | 'ready',
  indexTotal: 0,
  indexDone: 0,
  embedTotal: 0,
  embedDone: 0,
};

/** Optional push channel: set by SettingsPanel to receive live progress updates. */
let onProgressPush: (() => void) | null = null;

export function setProgressPushCallback(cb: () => void): void {
  onProgressPush = cb;
}

function normalizeGraphFileTypes(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(ext => (ext.startsWith('*.') ? ext.slice(1) : ext))
    .map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
    .map(ext => ext.toLowerCase())
    .filter(ext => {
      if (seen.has(ext)) return false;
      seen.add(ext);
      return true;
    });
}

function getConfiguredGraphFileTypes(): string[] {
  const workspaceCfg = vscode.workspace.getConfiguration('gptAiMarkdownEditor');
  const rawTypes = workspaceCfg.get<string>(
    'knowledgeGraph.indexedFileTypes',
    '.md, .csv, .html, .drawio.svg, .bpmn'
  );
  const fileTypes = normalizeGraphFileTypes(rawTypes);
  return fileTypes.length > 0 ? fileTypes : ['.md'];
}

function buildGraphGlobPatterns(fileTypes: string[]): string[] {
  return fileTypes.map(ext => `**/*${ext}`);
}

function createGraphWatcherPatterns(fileTypes: string[]): string[] {
  return fileTypes.length > 0 ? buildGraphGlobPatterns(fileTypes) : ['**/*.md'];
}

/** Register commands unconditionally (call from activate, always). */
export function registerCommands(context: vscode.ExtensionContext): void {
  const cmdDisposables = registerFluxFlowCommands(
    () => database,
    () => currentWorkspacePath,
    async () => {
      if (currentWorkspacePath) {
        await fullIndex(currentWorkspacePath, { force: true });
      }
    },
    () => vectorStore,
    () => embeddingEngine
  );
  context.subscriptions.push(...cmdDisposables);

  // Register Graph Chat command
  context.subscriptions.push(
    vscode.commands.registerCommand('gptAiMarkdownEditor.graphChat', () => {
      openChatPanel(
        context,
        () => database,
        () => currentWorkspacePath,
        () => vectorStore,
        () => embeddingEngine
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('gptAiMarkdownEditor.knowledgeGraph.openGraph', () => {
      openGraphPanel(
        context,
        () => database,
        () => currentWorkspacePath
      );
    })
  );
}

/**
 * Initialize the Knowledge Graph system.
 * Call from extension.ts activate() when the feature flag is enabled.
 */
export async function initialize(_context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const workspacePath = workspaceFolder.uri.fsPath;
  currentWorkspacePath = workspacePath;

  // Initial state push
  progressState.phase = 'idle';
  onProgressPush?.();

  // Set context key so the Backlinks view becomes visible
  await vscode.commands.executeCommand(
    'setContext',
    'gptAiMarkdownEditor.knowledgeGraph.active',
    true
  );

  // 1. Open database
  database = new GraphDatabase();
  await database.open(workspacePath);

  // Register the KG database in the wikilink databases map so
  // initializeForWikilinks() can re-use it instead of opening a duplicate.
  wikilinkDatabases.set(workspacePath, database);

  // 2. Start file watcher
  const fileTypes = getConfiguredGraphFileTypes();
  const watcherPatterns = createGraphWatcherPatterns(fileTypes);
  watcher = new FluxFlowWatcher(
    watcherPatterns,
    uri => {
      const relPath = path.relative(workspacePath, uri.fsPath).split(path.sep).join('/');
      indexSingleFile(workspacePath, relPath);
    },
    uri => {
      const relPath = path.relative(workspacePath, uri.fsPath).split(path.sep).join('/');
      const doc = database?.getDocumentByPath(relPath);
      if (doc && vectorStore) {
        vectorStore.removeByDocId(doc.id);
      }
      database?.deleteDocument(relPath);
      database?.scheduleSave();
    }
  );
  watcher.start();
  disposables.push(watcher);

  // 4. Run initial full index
  await fullIndex(workspacePath);

  // 5. Initialize semantic search (local AI embeddings)
  await reinitializeEmbeddings();

  // 6. Listen for setting changes
  disposables.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('gptAiMarkdownEditor.knowledgeGraph.enabled') ||
        e.affectsConfiguration('gptAiMarkdownEditor.knowledgeGraph.indexedFileTypes')
      ) {
        vscode.window
          .showInformationMessage(
            'Knowledge Graph setting changed. Reload window to apply.',
            'Reload'
          )
          .then(action => {
            if (action === 'Reload') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
      }
      if (
        e.affectsConfiguration('gptAiMarkdownEditor.knowledgeGraph.embeddingModel') ||
        e.affectsConfiguration('gptAiMarkdownEditor.ollamaEndpoint')
      ) {
        reinitializeEmbeddings().catch(err =>
          console.error('[FluxFlow] Failed to reinitialize embeddings:', err)
        );
      }
    })
  );

  const count = database.getDocumentCount();
  console.log(`[FluxFlow] Knowledge Graph initialized: ${count} documents indexed`);
}

/**
 * Full re-index of all configured Knowledge Graph file types in the workspace.
 */
async function fullIndex(workspacePath: string, options?: { force?: boolean }): Promise<void> {
  if (!database) return;
  const forceReindex = options?.force === true;

  const fileTypes = getConfiguredGraphFileTypes();
  const patterns = buildGraphGlobPatterns(fileTypes);
  const filesByPath = new Map<string, vscode.Uri>();
  for (const pattern of patterns) {
    const found = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    for (const fileUri of found) {
      filesByPath.set(fileUri.fsPath, fileUri);
    }
  }
  const files = Array.from(filesByPath.values());

  // Update progress state
  progressState.phase = 'indexing';
  progressState.indexTotal = files.length;
  progressState.indexDone = 0;
  onProgressPush?.();

  database.begin();
  try {
    for (const fileUri of files) {
      const relPath = path.relative(workspacePath, fileUri.fsPath).split(path.sep).join('/');

      let content: string;
      try {
        content = await fs.promises.readFile(fileUri.fsPath, 'utf-8');
      } catch {
        progressState.indexDone++;
        continue; // Skip unreadable files
      }

      // Skip unchanged files unless force mode is enabled.
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const existingHash = database.getDocumentHash(relPath);
      if (!forceReindex && existingHash === hash) {
        progressState.indexDone++;
        continue;
      }

      const parsed = parseDocumentFile(content, relPath);
      const docId = database.upsertDocument(relPath, parsed.title, hash);

      database.clearLinksForDocument(docId);
      database.clearTagsForDocument(docId);
      database.clearPropertiesForDocument(docId);
      database.clearFtsForDocument(docId);
      database.clearChunksForDocument(docId);

      for (const link of parsed.links) {
        database.insertLink(docId, link.target, link.lineNumber, link.context);
      }
      for (const tag of parsed.tags) {
        database.insertTag(docId, tag.tag, tag.source);
      }
      for (const prop of parsed.properties) {
        database.insertProperty(docId, prop.key, prop.value);
      }
      database.upsertFts(docId, parsed.title, parsed.bodyText);

      // Chunk the document for semantic search
      const workspaceCfg = vscode.workspace.getConfiguration('gptAiMarkdownEditor');
      const maxChars = workspaceCfg.get<number>('knowledgeGraph.rag.charsPerDoc', 2500);
      const chunks = chunkMarkdown(parsed.bodyText, parsed.title, parsed.properties, maxChars);
      for (const chunk of chunks) {
        database.insertChunk(docId, chunk.headerPath, chunk.content, chunk.tokenCount);
      }

      progressState.indexDone++;
      // Push progress every 10 files
      if (progressState.indexDone % 10 === 0) onProgressPush?.();
    }

    database.resolveLinks();
    database.commit();
  } catch (err) {
    console.error('[FluxFlow] Index error:', err);
    try {
      database.commit();
    } catch {
      /* ignore */
    }
    throw err;
  }

  progressState.indexDone = progressState.indexTotal;
  database.saveNow();
  emitIndexChanged(workspacePath, 'kg-full');
  onProgressPush?.();
}

/**
 * Re-index a single file (incremental update on save).
 */
function indexSingleFile(workspacePath: string, relPath: string): void {
  if (!database) return;

  const absPath = path.join(workspacePath, relPath);
  let content: string;
  try {
    content = fs.readFileSync(absPath, 'utf-8');
  } catch {
    return;
  }

  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const existingHash = database.getDocumentHash(relPath);
  if (existingHash === hash) return;

  const parsed = parseDocumentFile(content, relPath);
  const docId = database.upsertDocument(relPath, parsed.title, hash);

  database.clearLinksForDocument(docId);
  database.clearTagsForDocument(docId);
  database.clearPropertiesForDocument(docId);
  database.clearFtsForDocument(docId);
  database.clearChunksForDocument(docId);

  for (const link of parsed.links) {
    database.insertLink(docId, link.target, link.lineNumber, link.context);
  }
  for (const tag of parsed.tags) {
    database.insertTag(docId, tag.tag, tag.source);
  }
  for (const prop of parsed.properties) {
    database.insertProperty(docId, prop.key, prop.value);
  }
  database.upsertFts(docId, parsed.title, parsed.bodyText);

  // Chunk the document for semantic search
  const workspaceCfg = vscode.workspace.getConfiguration('gptAiMarkdownEditor');
  const maxChars = workspaceCfg.get<number>('knowledgeGraph.rag.charsPerDoc', 2500);
  const chunks = chunkMarkdown(parsed.bodyText, parsed.title, parsed.properties, maxChars);
  for (const chunk of chunks) {
    database.insertChunk(docId, chunk.headerPath, chunk.content, chunk.tokenCount);
  }

  database.resolveLinks();
  database.scheduleSave();
  emitIndexChanged(workspacePath, 'kg-incremental');

  // Remove old vectors for this doc and re-embed in background
  if (vectorStore) {
    vectorStore.removeByDocId(docId);
    embedChunksBackground().catch(err =>
      console.error('[FluxFlow] Background embedding error:', err)
    );
  }
}

/**
 * Embed un-embedded chunks in the background.
 * Runs after initial index and after single-file re-index.
 * Non-blocking — errors are logged but don't break the extension.
 */
let embeddingInProgress = false;
/**
 * (Re-)initialize the embedding engine and vector store.
 * Called at startup and when embedding model or server URL config changes.
 */
async function reinitializeEmbeddings(): Promise<void> {
  // Save existing vector store before switching
  vectorStore?.save();

  embeddingEngine = createEmbeddingEngine();
  const serverStatus = await embeddingEngine.checkStatus();

  // serverStatus may include an error message now. Keep full text for logs,
  // but expose only a short message to the webview UI.
  embeddingErrorFull = (serverStatus as any).error ?? null;
  embeddingError = null; // default; will set a short user-facing message below

  if (serverStatus.serverUp && serverStatus.modelInstalled) {
    try {
      const probe = await embeddingEngine.embed('test');
      const dims = probe.length;
      vectorStore = new VectorStore();
      vectorStore.open(currentWorkspacePath!, dims);
      embeddingStatus = 'ready';
      console.log(
        `[FluxFlow] Semantic search ready: ${embeddingEngine.getModel()} (${dims}D), ${vectorStore.count} vectors loaded`
      );

      embedChunksBackground().catch(err =>
        console.error('[FluxFlow] Background embedding error:', err)
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[FluxFlow] Failed to initialize embeddings:', errMsg);
      embeddingErrorFull = errMsg;
      embeddingError = 'Failed to initialize embedding model (see Output)';
      embeddingEngine = null;
      vectorStore = null;
      embeddingStatus = 'server-unavailable';
    }
  } else if (serverStatus.serverUp) {
    const modelName = embeddingEngine?.getModel() ?? '(unknown)';
    const msg = `Embedding model "${modelName}" not installed — semantic search disabled.`;
    console.log(`[FluxFlow] ${msg}`);
    embeddingErrorFull = (serverStatus as any).error ?? msg;
    embeddingError = `Embedding model "${modelName}" not installed (see Output)`;
    embeddingEngine = null;
    vectorStore = null;
    embeddingStatus = 'model-missing';
  } else {
    const msg = 'Local AI server not available — semantic search disabled. FTS-only mode.';
    console.log(`[FluxFlow] ${msg}`);
    embeddingErrorFull = (serverStatus as any).error ?? msg;
    embeddingError = 'Local AI server not available (see Output)';
    embeddingEngine = null;
    vectorStore = null;
    embeddingStatus = 'server-unavailable';
  }

  // Always surface the detailed error in the Output channel for debugging
  if (embeddingErrorFull) {
    try {
      const out = vscode.window.createOutputChannel('FluxFlow Debug');
      out.appendLine(`[FluxFlow] Embedding detailed error: ${embeddingErrorFull}`);
    } catch (e) {
      void e;
    }
  }
}

async function embedChunksBackground(): Promise<void> {
  if (embeddingInProgress || !database || !vectorStore || !embeddingEngine) return;
  embeddingInProgress = true;

  try {
    const allChunkIds = database.getAllChunkIds();
    const embeddedIds = vectorStore.getEmbeddedChunkIds();
    const toEmbed = allChunkIds.filter(id => !embeddedIds.has(id));

    if (toEmbed.length === 0) {
      progressState.phase = 'ready';
      progressState.embedTotal = vectorStore.count;
      progressState.embedDone = vectorStore.count;
      onProgressPush?.();
      return;
    }

    // Set embedding phase
    progressState.phase = 'embedding';
    progressState.embedTotal = embeddedIds.size + toEmbed.length;
    progressState.embedDone = embeddedIds.size;
    onProgressPush?.();

    console.log(`[FluxFlow] Embedding ${toEmbed.length} chunks...`);
    const BATCH = 32;

    for (let i = 0; i < toEmbed.length; i += BATCH) {
      const batchIds = toEmbed.slice(i, i + BATCH);
      const texts: string[] = [];
      const metas: Array<{ chunkId: number; docId: number }> = [];

      for (const chunkId of batchIds) {
        const chunk = database.getChunkById(chunkId);
        if (!chunk) continue;
        texts.push(chunk.content);
        metas.push({ chunkId: chunk.id, docId: chunk.docId });
      }

      if (texts.length === 0) continue;

      const vectors = await embeddingEngine.embedBatch(texts);
      for (let j = 0; j < vectors.length; j++) {
        if (vectors[j].length === 0) continue;
        vectorStore.upsert(metas[j].chunkId, metas[j].docId, new Float32Array(vectors[j]));
      }

      progressState.embedDone = embeddedIds.size + Math.min(i + BATCH, toEmbed.length);
      onProgressPush?.();
    }

    vectorStore.save();
    progressState.phase = 'ready';
    progressState.embedDone = progressState.embedTotal;
    onProgressPush?.();
    console.log(`[FluxFlow] Embedding complete: ${vectorStore.count} vectors stored`);
  } finally {
    embeddingInProgress = false;
  }
}

/**
 * Clean up on extension deactivation.
 */
export function deactivate(): void {
  for (const d of disposables) {
    d.dispose();
  }
  disposables = [];
  watcher = null;
  vectorStore?.save();
  vectorStore = null;
  embeddingEngine = null;
  database?.close();
  database = null;

  // Close wikilink databases that are not shared with KG database
  for (const [, db] of wikilinkDatabases) {
    if (db !== database) {
      db.close();
    }
  }
  wikilinkDatabases.clear();
  wikilinkChangeCallbacks.length = 0;
}

export function getGraphCallbacks(): {
  getStats: () => {
    docCount: number;
    tagCount: number;
    dbSizeKb: number;
    chunkCount: number;
    vectorCount: number;
    embeddingModel: string | null;
    embeddingStatus: 'ready' | 'server-unavailable' | 'model-missing';
    embeddingError?: string | null;
    phase: 'idle' | 'indexing' | 'embedding' | 'ready';
    indexTotal: number;
    indexDone: number;
    embedTotal: number;
    embedDone: number;
  } | null;
  rebuild: () => Promise<{ docCount: number; elapsedS: string }>;
} {
  return {
    getStats: () => {
      // Return partial stats even while DB is loading so the UI never shows 'null'
      const docCount = database?.getDocumentCount() ?? 0;
      const tagCount = database?.getAllTags().length ?? 0;
      const chunkCount = database?.getChunkCount() ?? 0;
      const vectorCount = vectorStore?.count ?? 0;
      const embeddingModel = embeddingEngine?.getModel() ?? null;
      const dbPath = database?.getDbPath();
      let dbSizeKb = 0;
      try {
        if (dbPath) {
          const stat = fs.statSync(dbPath);
          dbSizeKb = Math.round(stat.size / 1024);
        }
      } catch {
        /* not saved yet */
      }
      return {
        docCount,
        tagCount,
        dbSizeKb,
        chunkCount,
        vectorCount,
        embeddingModel,
        embeddingStatus,
        embeddingError,
        phase: progressState.phase,
        indexTotal: progressState.indexTotal,
        indexDone: progressState.indexDone,
        embedTotal: progressState.embedTotal,
        embedDone: progressState.embedDone,
      };
    },
    rebuild: async () => {
      if (!database || !currentWorkspacePath)
        throw new Error('Knowledge Graph is not initialized.');
      const wp = currentWorkspacePath!;
      const start = Date.now();
      // Reset progress for rebuild
      progressState.phase = 'idle';
      progressState.indexDone = 0;
      progressState.indexTotal = 0;
      progressState.embedDone = 0;
      progressState.embedTotal = 0;
      vectorStore?.clear();
      await fullIndex(wp, { force: true });
      // Re-embed after rebuild
      if (vectorStore && embeddingEngine) {
        await embedChunksBackground();
      }
      const elapsedS = ((Date.now() - start) / 1000).toFixed(1);
      const docCount = database?.getDocumentCount() ?? 0;
      return { docCount, elapsedS };
    },
  };
}

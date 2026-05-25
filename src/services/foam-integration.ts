import * as vscode from 'vscode';
import * as path from 'path';
import {
  getWikilinkDocuments,
  getWikilinkBacklinks,
  resolveWikilinkPath,
  onWikilinkIndexChange,
} from '../features/fluxflow/index';

export interface WikilinkNote {
  identifier: string; // shortest unambiguous id (filename stem)
  title: string; // first H1 or filename
  fsPath: string; // full path
  aliases: string[]; // frontmatter aliases (always [] for now)
  sections: { label: string; level: number }[]; // headings (always [] for now)
}

export interface WikilinkReferences {
  total: number;
  sources: Array<{ path: string; title: string }>;
}

type DidChangeCallback = () => void;

/**
 * WikilinkNoteIndexService
 *
 * Singleton service backed by FluxFlow's local markdown index.
 * Provides wikilink note index, resolution, and workspace-scoped queries.
 * Zero dependency on the external Foam extension.
 */
class WikilinkNoteIndexService {
  private static instance: WikilinkNoteIndexService;
  private changeCallbacks: DidChangeCallback[] = [];

  static getInstance(): WikilinkNoteIndexService {
    if (!WikilinkNoteIndexService.instance) {
      WikilinkNoteIndexService.instance = new WikilinkNoteIndexService();
    }
    return WikilinkNoteIndexService.instance;
  }

  /**
   * Wire up change notifications from FluxFlow wikilink index.
   * Call once from extension.ts after initializeForWikilinks().
   */
  connect(): void {
    onWikilinkIndexChange(() => this.notifyChange());
  }

  /**
   * Get all notes in the workspace. When a document URI is supplied,
   * returns only notes belonging to the same workspace folder.
   */
  getNoteList(documentUri?: vscode.Uri): WikilinkNote[] {
    let workspacePath: string | undefined;
    if (documentUri) {
      workspacePath = vscode.workspace.getWorkspaceFolder(documentUri)?.uri.fsPath;
    }
    return getWikilinkDocuments(workspacePath).map(doc => ({
      identifier: doc.identifier,
      title: doc.title,
      fsPath: doc.fsPath,
      aliases: [],
      sections: [],
    }));
  }

  /**
   * Resolve a [[identifier]] to a file URI, optionally scoped to a workspace folder.
   */
  resolveWikilinkUri(identifier: string, documentUri?: vscode.Uri): vscode.Uri | undefined {
    const workspacePath = documentUri
      ? vscode.workspace.getWorkspaceFolder(documentUri)?.uri.fsPath
      : undefined;

    // Strip anchor reference: [[notes#heading]] → "notes"
    const bareIdentifier = identifier.split('#')[0].trim();

    const fsPath = resolveWikilinkPath(bareIdentifier, workspacePath);
    return fsPath ? vscode.Uri.file(fsPath) : undefined;
  }

  /**
   * Return backlinks (source files that reference the target) for hover UI.
   */
  getWikilinkReferences(
    identifier: string,
    documentUri?: vscode.Uri,
    limit: number = 10
  ): WikilinkReferences {
    const workspacePath = documentUri
      ? vscode.workspace.getWorkspaceFolder(documentUri)?.uri.fsPath
      : undefined;

    // Strip anchor reference: [[notes#heading]] → "notes"
    const bareIdentifier = identifier.split('#')[0].trim();
    const fsPath = resolveWikilinkPath(bareIdentifier, workspacePath);
    if (!fsPath) {
      return { total: 0, sources: [] };
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath));
    const folderPath = workspaceFolder?.uri.fsPath;
    if (!folderPath) {
      return { total: 0, sources: [] };
    }

    const relPath = path.relative(folderPath, fsPath).split(path.sep).join('/');
    const refs = getWikilinkBacklinks(relPath, folderPath, limit);

    return {
      total: refs.total,
      sources: refs.sources.map(source => ({
        path: source.sourcePath,
        title: source.sourceTitle,
      })),
    };
  }

  /**
   * Register a callback for when the note index changes.
   */
  onDidChange(callback: DidChangeCallback): vscode.Disposable {
    this.changeCallbacks.push(callback);
    return {
      dispose: () => {
        const idx = this.changeCallbacks.indexOf(callback);
        if (idx !== -1) {
          this.changeCallbacks.splice(idx, 1);
        }
      },
    };
  }

  private notifyChange(): void {
    this.changeCallbacks.forEach(cb => cb());
  }
}

export const foamIntegration = WikilinkNoteIndexService.getInstance();

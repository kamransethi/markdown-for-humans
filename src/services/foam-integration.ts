import * as vscode from 'vscode';
import {
  getWikilinkDocuments,
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

import * as vscode from 'vscode';
import type { Uri } from 'vscode';

export interface WikilinkNote {
  identifier: string; // shortest unambiguous id
  title: string; // first H1 or filename
  fsPath: string; // full path
  aliases: string[]; // frontmatter aliases
  sections: { label: string; level: number }[];
}

type DidChangeCallback = () => void;

/**
 * FoamIntegrationService
 *
 * Singleton service that connects to the installed Foam VS Code extension
 * to provide wikilink note index, resolution, and graph navigation.
 *
 * Requires Foam v0.40.4+ with selectNoteInGraph command.
 */
class FoamIntegrationService {
  private static instance: FoamIntegrationService;
  private connected = false;
  private noteIndex: WikilinkNote[] = [];
  private changeCallbacks: DidChangeCallback[] = [];

  static getInstance(): FoamIntegrationService {
    if (!FoamIntegrationService.instance) {
      FoamIntegrationService.instance = new FoamIntegrationService();
    }
    return FoamIntegrationService.instance;
  }

  /**
   * Connect to Foam extension and listen for workspace changes
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      // Activate Foam extension
      const foam = vscode.extensions.getExtension('foam.foam-vscode');
      if (!foam) {
        console.warn(
          '[wikilinks] Foam extension not found. Install foam-vscode to enable wikilinks.'
        );
        return;
      }

      if (!foam.isActive) {
        await foam.activate();
      }

      // Export expected to be available from Foam's extension context
      const foamExports = foam.exports as { noteIndex?: WikilinkNote[] };
      if (foamExports?.noteIndex) {
        this.noteIndex = foamExports.noteIndex;
        this.connected = true;
        console.log(`[wikilinks] Connected to Foam. Loaded ${this.noteIndex.length} notes.`);
      } else {
        console.warn('[wikilinks] Foam extension does not export noteIndex.');
      }

      // Listen for Foam workspace changes via a custom event or polling
      // For now, we'll use a simple interval check
      this.setupChangeListener();
    } catch (err) {
      console.error('[wikilinks] Failed to connect to Foam:', err);
    }
  }

  private setupChangeListener(): void {
    // Listen to Foam's onDidChange event if available via extension exports
    // Fallback: poll Foam API periodically for changes
    const checkInterval = setInterval(() => {
      const foam = vscode.extensions.getExtension('foam.foam-vscode');
      if (!foam || !foam.isActive) {
        clearInterval(checkInterval);
        return;
      }

      const foamExports = foam.exports as { noteIndex?: WikilinkNote[] };
      if (foamExports?.noteIndex && foamExports.noteIndex !== this.noteIndex) {
        this.noteIndex = foamExports.noteIndex;
        this.notifyChange();
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Get the full list of notes currently indexed by Foam
   */
  getNoteList(): WikilinkNote[] {
    return this.noteIndex;
  }

  /**
   * Find and open a note in Foam's graph view
   */
  async showInGraph(uri: Uri): Promise<void> {
    try {
      await vscode.commands.executeCommand('foam-vscode.selectNoteInGraph', uri);
    } catch (err) {
      console.warn('[wikilinks] Could not show note in graph:', err);
    }
  }

  /**
   * Resolve a wikilink identifier to a file URI
   */
  resolveWikilinkUri(identifier: string): Uri | undefined {
    const note = this.noteIndex.find(
      n =>
        n.identifier.toLowerCase() === identifier.toLowerCase() ||
        n.aliases.some(a => a.toLowerCase() === identifier.toLowerCase())
    );
    return note ? Uri.file(note.fsPath) : undefined;
  }

  /**
   * Get backlinks for a given note URI
   */
  getBacklinks(_uri: Uri): WikilinkNote[] {
    return this.noteIndex.filter(_note => {
      // In a real implementation, check foam's link graph
      // For now, return empty array
      return false;
    });
  }

  /**
   * Register a callback for when Foam workspace changes
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

export const foamIntegration = FoamIntegrationService.getInstance();

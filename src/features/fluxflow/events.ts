/**
 * Typed event bus for FluxFlow runtime lifecycle notifications.
 *
 * This is intentionally small to establish explicit event contracts before
 * deeper architecture refactors (multi-root context registry, projection cache).
 */

import * as vscode from 'vscode';

export type FluxFlowEvent =
  | {
      type: 'scope-changed';
      workspacePaths: string[];
      reason: 'initialize' | 'workspace-folders-changed';
      timestamp: number;
    }
  | {
      type: 'index-changed';
      workspacePath: string;
      source: 'wikilink' | 'wikilink-resource' | 'kg-full' | 'kg-incremental';
      timestamp: number;
    }
  | {
      type: 'active-document-changed';
      uri: string | null;
      timestamp: number;
    };

const eventEmitter = new vscode.EventEmitter<FluxFlowEvent>();
const listeners = new Set<(event: FluxFlowEvent) => void>();

export function onFluxFlowEvent(listener: (event: FluxFlowEvent) => void): vscode.Disposable {
  listeners.add(listener);
  return {
    dispose: () => {
      listeners.delete(listener);
    },
  };
}

function broadcast(event: FluxFlowEvent): void {
  eventEmitter.fire(event);
  for (const listener of listeners) {
    listener(event);
  }
}

export function emitScopeChanged(
  workspacePaths: string[],
  reason: 'initialize' | 'workspace-folders-changed'
): void {
  broadcast({
    type: 'scope-changed',
    workspacePaths,
    reason,
    timestamp: Date.now(),
  });
}

export function emitIndexChanged(
  workspacePath: string,
  source: 'wikilink' | 'wikilink-resource' | 'kg-full' | 'kg-incremental'
): void {
  broadcast({
    type: 'index-changed',
    workspacePath,
    source,
    timestamp: Date.now(),
  });
}

export function emitActiveDocumentChanged(uri: string | null): void {
  broadcast({
    type: 'active-document-changed',
    uri,
    timestamp: Date.now(),
  });
}

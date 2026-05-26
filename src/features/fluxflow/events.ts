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
      source: 'wikilink' | 'kg-full' | 'kg-incremental';
      timestamp: number;
    };

const eventEmitter = new vscode.EventEmitter<FluxFlowEvent>();

export function onFluxFlowEvent(listener: (event: FluxFlowEvent) => void): vscode.Disposable {
  return eventEmitter.event(listener);
}

export function emitScopeChanged(
  workspacePaths: string[],
  reason: 'initialize' | 'workspace-folders-changed'
): void {
  eventEmitter.fire({
    type: 'scope-changed',
    workspacePaths,
    reason,
    timestamp: Date.now(),
  });
}

export function emitIndexChanged(
  workspacePath: string,
  source: 'wikilink' | 'kg-full' | 'kg-incremental'
): void {
  eventEmitter.fire({
    type: 'index-changed',
    workspacePath,
    source,
    timestamp: Date.now(),
  });
}

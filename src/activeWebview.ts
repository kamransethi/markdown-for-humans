/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

import * as vscode from 'vscode';

let activeWebviewPanel: vscode.WebviewPanel | undefined;

/** URI of the document currently open in the active custom editor. */
let activeDocumentUri: vscode.Uri | undefined;
const activeDocumentEmitter = new vscode.EventEmitter<vscode.Uri | undefined>();

/** Currently selected text in the WYSIWYG editor (empty string = no selection). */
let currentSelectedText = '';

/** Selection range (ProseMirror positions) for the active editor. */
let currentSelectionRange: { from: number; to: number } | undefined;

function setActiveContext(isActive: boolean) {
  vscode.commands.executeCommand('setContext', 'gptAiMarkdownEditor.isActive', isActive);
  if (!isActive) {
    // Clear selection when editor loses focus
    setSelectedText('');
  }
}

export function setActiveWebviewPanel(panel: vscode.WebviewPanel | undefined) {
  activeWebviewPanel = panel;
  setActiveContext(!!panel);
  if (!panel) {
    setActiveDocumentUri(undefined);
    currentSelectionRange = undefined;
  }
}

export function getActiveWebviewPanel(): vscode.WebviewPanel | undefined {
  return activeWebviewPanel;
}

/** Update the stored selection text and the hasSelection context key. */
export function setSelectedText(text: string) {
  currentSelectedText = text;
  vscode.commands.executeCommand('setContext', 'gptAiMarkdownEditor.hasSelection', text.length > 0);
}

/** Retrieve the current selected text (empty string when nothing is selected). */
export function getSelectedText(): string {
  return currentSelectedText;
}

/** Set the active document URI (called when custom editor resolves a document). */
export function setActiveDocumentUri(uri: vscode.Uri | undefined) {
  if (activeDocumentUri?.toString() === uri?.toString()) {
    return;
  }
  activeDocumentUri = uri;
  activeDocumentEmitter.fire(uri);
}

/** Get the URI of the document in the active custom editor. */
export function getActiveDocumentUri(): vscode.Uri | undefined {
  return activeDocumentUri;
}

/** Subscribe to active custom-editor document changes. */
export function onDidActiveDocumentChange(
  listener: (uri: vscode.Uri | undefined) => void
): vscode.Disposable {
  return activeDocumentEmitter.event(listener);
}

/** Update the selection range (ProseMirror positions). */
export function setSelectionRange(range: { from: number; to: number } | undefined) {
  currentSelectionRange = range;
}

/** Get the current selection range. */
export function getSelectionRange(): { from: number; to: number } | undefined {
  return currentSelectionRange;
}

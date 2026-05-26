import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as vscode from 'vscode';
import {
  __resetGraphPanelForTests,
  createGraphErrorMessage,
  createGraphInitMessage,
  createGraphUpdateMessage,
  openGraphPanel,
} from '../graphPanel';
import { createProjectionContext } from './graphTestUtils';

describe('graph panel host contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetGraphPanelForTests();
    (vscode as unknown as { ViewColumn: { Beside: number } }).ViewColumn = { Beside: 2 };
    (vscode.Uri as unknown as { joinPath: jest.Mock }).joinPath = jest
      .fn()
      .mockReturnValue(vscode.Uri.file('/ext/dist'));
  });

  it('builds graph:init, graph:update, and graph:error contract messages', () => {
    const payload = {
      reason: 'panel_opened' as const,
      graph: { nodes: [], edges: [] },
      activeUri: null,
      emptyState: null,
    };

    expect(createGraphInitMessage(payload).type).toBe('graph:init');
    expect(createGraphUpdateMessage({ ...payload, reason: 'index_changed' }).type).toBe(
      'graph:update'
    );
    expect(createGraphErrorMessage('x').type).toBe('graph:error');
  });

  it('handles graph:open-note by dispatching vscode.openWith', async () => {
    const listeners: Array<(message: unknown) => Promise<void> | void> = [];
    const panel = {
      reveal: jest.fn(),
      onDidDispose: jest.fn(),
      webview: {
        html: '',
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn((cb: (message: unknown) => Promise<void> | void) => {
          listeners.push(cb);
          return { dispose: jest.fn() };
        }),
      },
    };

    (vscode.window as unknown as { createWebviewPanel: jest.Mock }).createWebviewPanel = jest
      .fn()
      .mockReturnValue(panel);

    openGraphPanel(
      {
        extensionUri: vscode.Uri.file('/ext'),
        subscriptions: [],
      } as unknown as vscode.ExtensionContext,
      () => [
        createProjectionContext('/vault', [{ path: 'a.md', title: 'A' }], {
          'a.md': [],
        }),
      ],
      () => ['/vault']
    );

    await listeners[0]({
      type: 'graph:open-note',
      payload: { uri: 'file:///vault/a.md' },
    });

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.openWith',
      expect.objectContaining({ scheme: 'file' }),
      'gptAiMarkdownEditor.editor'
    );
  });

  it('handles graph:refresh by pushing graph:update payload', async () => {
    const listeners: Array<(message: unknown) => Promise<void> | void> = [];
    const panel = {
      reveal: jest.fn(),
      onDidDispose: jest.fn(),
      webview: {
        html: '',
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn((cb: (message: unknown) => Promise<void> | void) => {
          listeners.push(cb);
          return { dispose: jest.fn() };
        }),
      },
    };

    (vscode.window as unknown as { createWebviewPanel: jest.Mock }).createWebviewPanel = jest
      .fn()
      .mockReturnValue(panel);

    openGraphPanel(
      {
        extensionUri: vscode.Uri.file('/ext'),
        subscriptions: [],
      } as unknown as vscode.ExtensionContext,
      () => [
        createProjectionContext('/vault', [{ path: 'a.md', title: 'A' }], {
          'a.md': [],
        }),
      ],
      () => ['/vault']
    );

    await listeners[0]({ type: 'graph:refresh', payload: { reason: 'user_requested' } });

    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'graph:update',
      })
    );
  });

  it('does not emit malformed unresolved node titles in graph:update payload', async () => {
    const listeners: Array<(message: unknown) => Promise<void> | void> = [];
    const panel = {
      reveal: jest.fn(),
      onDidDispose: jest.fn(),
      webview: {
        html: '',
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn((cb: (message: unknown) => Promise<void> | void) => {
          listeners.push(cb);
          return { dispose: jest.fn() };
        }),
      },
    };

    (vscode.window as unknown as { createWebviewPanel: jest.Mock }).createWebviewPanel = jest
      .fn()
      .mockReturnValue(panel);

    openGraphPanel(
      {
        extensionUri: vscode.Uri.file('/ext'),
        subscriptions: [],
      } as unknown as vscode.ExtensionContext,
      () => [
        createProjectionContext('/vault', [{ path: 'a.md', title: 'A' }], {
          'a.md': [{ targetTitle: '\\\\', targetPath: null }],
        }),
      ],
      () => ['/vault']
    );

    await listeners[0]({ type: 'graph:refresh', payload: { reason: 'user_requested' } });

    const updateMessage = (
      (panel.webview.postMessage as jest.Mock).mock.calls.map(call => call[0]) as Array<{
        type?: string;
        payload?: unknown;
      }>
    ).find(msg => msg?.type === 'graph:update');
    const updatePayload = updateMessage?.payload as
      | { graph?: { nodes?: Array<{ kind: string; title: string }> } }
      | undefined;
    const unresolved = (updatePayload?.graph?.nodes ?? []).filter(
      (node: { kind: string }) => node.kind === 'unresolved'
    );

    expect(unresolved.some((node: { title: string }) => node.title.endsWith('\\'))).toBe(false);
  });
});

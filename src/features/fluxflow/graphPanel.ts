import * as vscode from 'vscode';
import * as path from 'path';
import { onFluxFlowEvent } from './events';
import { onDidActiveDocumentChange } from '../../activeWebview';
import type {
  GraphContractPayload,
  GraphHostToWebviewMessage,
  GraphWebviewToHostMessage,
} from '../../shared/messageTypes';
import { buildScopedGraphPayload, type GraphProjectionContext } from './graphProjection';

const PANEL_ID = 'gptAiMarkdownEditor.knowledgeGraphPanel';

let currentPanel: vscode.WebviewPanel | undefined;

export function __resetGraphPanelForTests(): void {
  currentPanel = undefined;
}

function post(panel: vscode.WebviewPanel, message: GraphHostToWebviewMessage): void {
  panel.webview.postMessage(message);
}

export function createGraphInitMessage(payload: GraphContractPayload): GraphHostToWebviewMessage {
  return {
    type: 'graph:init',
    payload,
  };
}

export function createGraphUpdateMessage(payload: GraphContractPayload): GraphHostToWebviewMessage {
  return {
    type: 'graph:update',
    payload,
  };
}

export function createGraphErrorMessage(message: string): GraphHostToWebviewMessage {
  return {
    type: 'graph:error',
    payload: {
      message,
      recoverable: true,
    },
  };
}

export function openGraphPanel(
  context: vscode.ExtensionContext,
  getProjectionContexts: () => GraphProjectionContext[],
  getOpenWorkspacePaths: () => string[]
): void {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    refreshGraphPayload(currentPanel, getProjectionContexts, getOpenWorkspacePaths, 'panel_opened');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    PANEL_ID,
    'Knowledge Graph',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
    }
  );

  currentPanel = panel;
  panel.webview.html = getGraphPanelHtml(panel.webview, context.extensionUri);

  const eventSub = onFluxFlowEvent(event => {
    if (event.type === 'scope-changed') {
      refreshGraphPayload(panel, getProjectionContexts, getOpenWorkspacePaths, 'scope_changed');
      return;
    }

    if (event.type === 'index-changed') {
      refreshGraphPayload(panel, getProjectionContexts, getOpenWorkspacePaths, 'index_changed');
    }
  });

  const activeDocSub = onDidActiveDocumentChange(() => {
    refreshGraphPayload(
      panel,
      getProjectionContexts,
      getOpenWorkspacePaths,
      'active_document_changed'
    );
  });

  panel.webview.onDidReceiveMessage(
    async (message: GraphWebviewToHostMessage | { type: string; path?: string }) => {
      switch (message.type) {
        case 'graph:refresh':
        case 'webviewDidLoad':
          refreshGraphPayload(
            panel,
            getProjectionContexts,
            getOpenWorkspacePaths,
            'user_requested'
          );
          return;
        case 'graph:open-note': {
          const payload = 'payload' in message ? message.payload : undefined;
          if (!payload?.uri) {
            return;
          }
          const uri = vscode.Uri.parse(payload.uri);
          await vscode.commands.executeCommand(
            'vscode.openWith',
            uri,
            'gptAiMarkdownEditor.editor'
          );
          return;
        }
        case 'webviewDidSelectNode': {
          const openWorkspacePaths = getOpenWorkspacePaths();
          if (openWorkspacePaths.length === 0 || !message.path) return;
          const uri = vscode.Uri.file(path.join(openWorkspacePaths[0], message.path));
          await vscode.commands.executeCommand(
            'vscode.openWith',
            uri,
            'gptAiMarkdownEditor.editor'
          );
          return;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    eventSub.dispose();
    activeDocSub.dispose();
    currentPanel = undefined;
  });
}

function refreshGraphPayload(
  panel: vscode.WebviewPanel,
  getProjectionContexts: () => GraphProjectionContext[],
  getOpenWorkspacePaths: () => string[],
  reason: GraphContractPayload['reason']
): void {
  try {
    const payload = buildScopedGraphPayload(
      getProjectionContexts(),
      getOpenWorkspacePaths(),
      reason
    );

    if (reason === 'panel_opened') {
      post(panel, createGraphInitMessage(payload));
      return;
    }

    post(panel, createGraphUpdateMessage(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build graph payload';
    post(panel, createGraphErrorMessage(message));
  }
}

function getGraphPanelHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const toWebviewHref = (uri: vscode.Uri): string => {
    if (typeof webview.asWebviewUri === 'function') {
      return webview.asWebviewUri(uri).toString();
    }
    return uri.toString();
  };

  const scriptUri = toWebviewHref(vscode.Uri.joinPath(extensionUri, 'dist', 'graph.js'));
  const styleUri = toWebviewHref(vscode.Uri.joinPath(extensionUri, 'dist', 'graph.css'));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource}; connect-src ${webview.cspSource}; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: blob:;" />
  <title>Foam-style Graph View</title>
  <link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div class="graph-shell">
    <div id="statusLine">0 nodes  •  0 links</div>
    <foam-graph></foam-graph>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

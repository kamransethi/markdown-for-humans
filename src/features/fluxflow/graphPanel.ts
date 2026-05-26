import * as vscode from 'vscode';
import * as path from 'path';
import type { GraphDatabase } from './database';
import { onFluxFlowEvent } from './events';
import { getActiveDocumentUri, onDidActiveDocumentChange } from '../../activeWebview';

const PANEL_ID = 'gptAiMarkdownEditor.knowledgeGraphPanel';

type GraphNode = {
  id: string;
  title: string;
  path: string;
  placeholder?: boolean;
};

type GraphLink = {
  source: string;
  target: string;
};

let currentPanel: vscode.WebviewPanel | undefined;

export function openGraphPanel(
  context: vscode.ExtensionContext,
  getDb: () => GraphDatabase | null,
  getWorkspacePath: () => string | null
): void {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    refreshGraphPayload(currentPanel, getDb, getWorkspacePath);
    return;
  }

  const panel = vscode.window.createWebviewPanel(PANEL_ID, 'Knowledge Graph', vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
  });

  currentPanel = panel;
  panel.webview.html = getGraphPanelHtml(panel.webview);

  const eventSub = onFluxFlowEvent(event => {
    if (event.type === 'scope-changed') {
      refreshGraphPayload(panel, getDb, getWorkspacePath);
      return;
    }

    const workspacePath = getWorkspacePath();
    if (workspacePath && event.workspacePath === workspacePath) {
      refreshGraphPayload(panel, getDb, getWorkspacePath);
    }
  });

  const activeDocSub = onDidActiveDocumentChange(() => {
    postActiveSelection(panel, getWorkspacePath);
  });

  panel.webview.onDidReceiveMessage(
    async (message: { type: string; path?: string }) => {
      switch (message.type) {
        case 'webviewDidLoad':
          refreshGraphPayload(panel, getDb, getWorkspacePath);
          return;
        case 'webviewDidSelectNode': {
          const workspacePath = getWorkspacePath();
          if (!workspacePath || !message.path) return;
          const uri = vscode.Uri.file(path.join(workspacePath, message.path));
          await vscode.commands.executeCommand('vscode.openWith', uri, 'gptAiMarkdownEditor.editor');
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
  getDb: () => GraphDatabase | null,
  getWorkspacePath: () => string | null
): void {
  const db = getDb();
  const workspacePath = getWorkspacePath();
  if (!db || !workspacePath) {
    panel.webview.postMessage({ type: 'didUpdateGraphData', payload: { nodes: [], links: [] } });
    return;
  }

  const payload = buildGraphPayload(db);
  panel.webview.postMessage({
    type: 'didUpdateGraphData',
    payload,
  });
  postActiveSelection(panel, getWorkspacePath);
}

function postActiveSelection(
  panel: vscode.WebviewPanel,
  getWorkspacePath: () => string | null
): void {
  const workspacePath = getWorkspacePath();
  const activeUri = getActiveDocumentUri();
  if (!workspacePath || !activeUri) return;

  const relPath = path.relative(workspacePath, activeUri.fsPath).split(path.sep).join('/');
  if (!relPath || relPath.startsWith('..')) return;

  panel.webview.postMessage({
    type: 'didSelectNode',
    payload: relPath,
  });
}

function buildGraphPayload(db: GraphDatabase): { nodes: GraphNode[]; links: GraphLink[] } {
  const docs = db.getAllDocuments();
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  for (const doc of docs) {
    nodeMap.set(doc.path, {
      id: doc.path,
      title: doc.title || path.basename(doc.path, path.extname(doc.path)),
      path: doc.path,
    });
  }

  for (const doc of docs) {
    const outgoing = db.getOutgoingLinks(doc.path);
    for (const link of outgoing) {
      let targetId = link.targetPath;
      if (!targetId) {
        targetId = `placeholder:${link.targetTitle}`;
        if (!nodeMap.has(targetId)) {
          nodeMap.set(targetId, {
            id: targetId,
            title: link.targetTitle,
            path: '',
            placeholder: true,
          });
        }
      }

      links.push({ source: doc.path, target: targetId });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  };
}

function getGraphPanelHtml(webview: vscode.Webview): string {
  const nonce = createNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <title>Knowledge Graph</title>
  <style>
    body { font-family: var(--vscode-font-family, sans-serif); margin: 0; padding: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    .header { padding: 12px 14px; border-bottom: 1px solid var(--vscode-panel-border); }
    .header h1 { margin: 0; font-size: 13px; font-weight: 600; }
    .meta { margin-top: 4px; font-size: 11px; color: var(--vscode-descriptionForeground); }
    .content { padding: 8px 10px 14px; }
    .node { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; margin-bottom: 4px; border-radius: 4px; cursor: pointer; }
    .node:hover { background: var(--vscode-list-hoverBackground); }
    .node.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
    .node.placeholder { opacity: 0.7; cursor: default; }
    .title { font-size: 12px; }
    .path { font-size: 11px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Knowledge Graph (Initial Host)</h1>
    <div class="meta" id="meta">0 nodes • 0 links</div>
  </div>
  <div class="content" id="nodeList"></div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let activeNode = '';

    function render(payload) {
      const nodes = payload?.nodes ?? [];
      const links = payload?.links ?? [];
      document.getElementById('meta').textContent = String(nodes.length) + ' nodes • ' + String(links.length) + ' links';
      const host = document.getElementById('nodeList');
      host.innerHTML = '';

      for (const node of nodes) {
        const el = document.createElement('div');
        el.className = 'node ' + (node.placeholder ? 'placeholder ' : '') + (activeNode === node.id ? 'active' : '');
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = node.title;
        const p = document.createElement('div');
        p.className = 'path';
        p.textContent = node.path || '(unresolved target)';
        el.appendChild(title);
        el.appendChild(p);
        if (!node.placeholder && node.path) {
          el.addEventListener('click', () => {
            vscode.postMessage({ type: 'webviewDidSelectNode', path: node.path });
          });
        }
        host.appendChild(el);
      }
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'didUpdateGraphData') {
        render(message.payload);
      }
      if (message.type === 'didSelectNode') {
        activeNode = message.payload || '';
        const current = document.querySelectorAll('.node');
        for (const nodeEl of current) {
          nodeEl.classList.remove('active');
        }
        const list = document.getElementById('nodeList');
        for (const nodeEl of list.children) {
          const pathEl = nodeEl.querySelector('.path');
          if (pathEl && pathEl.textContent === activeNode) {
            nodeEl.classList.add('active');
            break;
          }
        }
      }
    });

    vscode.postMessage({ type: 'webviewDidLoad' });
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

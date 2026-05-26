import './graphWebview.css';
import './foam/foam-graph';
import type {
  GraphContractPayload,
  GraphHostToWebviewMessage,
  GraphWebviewToHostMessage,
} from '../../shared/messageTypes';
import type { GraphData, GraphStyle } from './foam/protocol';
import type { FoamGraph } from './foam/foam-graph';
import { resolveNodeType } from './graphWebviewHelpers';

declare function acquireVsCodeApi(): {
  postMessage: (message: GraphWebviewToHostMessage) => void;
};

const vscode = acquireVsCodeApi();
const graphElement = document.querySelector('foam-graph') as FoamGraph | null;
if (!graphElement) {
  throw new Error('Missing foam-graph element');
}

const statusLine = document.getElementById('statusLine') as HTMLDivElement;
const uriByNodeId = new Map<string, string>();

graphElement.showControls = true;

function toFoamGraph(payload: GraphContractPayload): GraphData {
  uriByNodeId.clear();

  const nodeInfo: GraphData['nodeInfo'] = {};
  for (const node of payload.graph.nodes) {
    if (node.uri) {
      uriByNodeId.set(node.nodeId, node.uri);
    }
    nodeInfo[node.nodeId] = {
      id: node.nodeId,
      type: resolveNodeType(node),
      title: node.title,
      properties: {
        color: node.isActive ? '#ffd166' : undefined,
      },
      tags: (node.tags ?? []).map(t => ({ label: t.label })),
    };
  }

  return {
    nodeInfo,
    links: payload.graph.edges.map(edge => ({
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
    })),
  };
}

function selectActiveNode(payload: GraphContractPayload): void {
  const activeNode = payload.activeUri
    ? payload.graph.nodes.find(node => node.uri === payload.activeUri)
    : undefined;
  const nodeId = activeNode?.nodeId;
  if (!nodeId) {
    return;
  }
  void graphElement.updateComplete.then(() => graphElement.selectNote(nodeId));
}

function toFoamStyle(): GraphStyle {
  return {
    colorMode: 'type',
    style: {
      background: 'transparent',
      fontSize: 12,
      lineColor: '#8b8f96',
      lineWidth: 1,
      particleWidth: 1.5,
      highlightedForeground: '#ffd166',
      node: {
        note: '#f3f4f6',
        tag: '#2da7ff',
        placeholder: '#d4d6d9',
        image: '#64e5b8',
        attachment: '#29c6d1',
      },
    },
    showNodesOfType: {
      note: true,
      tag: true,
      placeholder: true,
      attachment: true,
      image: false,
    },
  };
}

window.addEventListener('error', event => {
  const message = event instanceof ErrorEvent ? event.message : String(event);
  statusLine.textContent = `Graph runtime error: ${message}`;
  console.error(event);
});

window.addEventListener('unhandledrejection', event => {
  statusLine.textContent = `Graph unhandled rejection: ${String(event.reason)}`;
  console.error(event.reason);
});

window.addEventListener('message', event => {
  const message = event.data as GraphHostToWebviewMessage;

  if (message.type === 'graph:init' || message.type === 'graph:update') {
    const graphData = toFoamGraph(message.payload);
    graphElement.graphData = graphData;
    graphElement.graphStyle = toFoamStyle();

    const nodeCount = Object.keys(graphData.nodeInfo).length;
    const linkCount = graphData.links.length;
    statusLine.textContent =
      message.payload.emptyState?.title ?? `${nodeCount} nodes  •  ${linkCount} links`;

    selectActiveNode(message.payload);
    return;
  }

  if (message.type === 'graph:select-node') {
    const nodeId = message.payload.nodeId;
    void graphElement.updateComplete.then(() => graphElement.selectNote(nodeId));
    return;
  }

  if (message.type === 'graph:error') {
    statusLine.textContent = message.payload.message || 'Graph unavailable';
  }
});

graphElement.addEventListener('node-click', event => {
  const nodeId = (event as CustomEvent<string>).detail;
  const uri = uriByNodeId.get(nodeId);
  if (!uri) {
    return;
  }
  vscode.postMessage({
    type: 'graph:open-note',
    payload: { uri },
  });
});

vscode.postMessage({
  type: 'graph:refresh',
  payload: { reason: 'panel_opened' },
});

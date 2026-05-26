import * as path from 'path';
import * as vscode from 'vscode';
import { getActiveDocumentUri } from '../../activeWebview';
import type {
  GraphContractEdge,
  GraphContractNode,
  GraphContractPayload,
} from '../../shared/messageTypes';

export interface GraphProjectionDb {
  getAllDocuments(): Array<{ path: string; title: string }>;
  getOutgoingLinks(docPath: string): Array<{
    targetTitle: string;
    targetPath: string | null;
  }>;
  getTagsForDocument(docPath: string): string[];
}

export interface GraphProjectionContext {
  workspacePath: string;
  db: GraphProjectionDb;
}

function normalizeUnresolvedTitle(raw: string): string {
  return raw
    .trim()
    .replace(/\\([\\|#[\]])/g, '$1')
    .replace(/\\+$/g, '')
    .trim();
}

function toUri(workspacePath: string, relPath: string): string {
  return vscode.Uri.file(path.join(workspacePath, relPath)).toString();
}

function isInOpenScope(context: GraphProjectionContext, openWorkspacePaths: string[]): boolean {
  if (openWorkspacePaths.length === 0) {
    return true;
  }
  return openWorkspacePaths.includes(context.workspacePath);
}

export function buildScopedGraphPayload(
  contexts: GraphProjectionContext[],
  openWorkspacePaths: string[],
  reason: GraphContractPayload['reason']
): GraphContractPayload {
  const activeUri = getActiveDocumentUri()?.toString() ?? null;
  const nodes = new Map<string, GraphContractNode>();
  const edges: GraphContractEdge[] = [];

  for (const context of contexts) {
    if (!isInOpenScope(context, openWorkspacePaths)) {
      continue;
    }

    const docs = context.db.getAllDocuments();
    for (const doc of docs) {
      const nodeId = `${context.workspacePath}::${doc.path}`;
      const uri = toUri(context.workspacePath, doc.path);
      nodes.set(nodeId, {
        nodeId,
        title: doc.title || path.basename(doc.path, path.extname(doc.path)),
        kind: 'resolved',
        isActive: uri === activeUri,
        uri,
        workspacePath: context.workspacePath,
        tags: context.db.getTagsForDocument(doc.path).map(label => ({ label })),
      });
    }

    for (const doc of docs) {
      const sourceNodeId = `${context.workspacePath}::${doc.path}`;
      const outgoing = context.db.getOutgoingLinks(doc.path);
      for (const link of outgoing) {
        const targetNodeId = link.targetPath
          ? `${context.workspacePath}::${link.targetPath}`
          : `${context.workspacePath}::placeholder:${normalizeUnresolvedTitle(link.targetTitle)}`;

        if (!link.targetPath) {
          const normalizedTitle = normalizeUnresolvedTitle(link.targetTitle);
          if (!normalizedTitle) {
            continue;
          }
          if (!nodes.has(targetNodeId)) {
            nodes.set(targetNodeId, {
              nodeId: targetNodeId,
              title: normalizedTitle,
              kind: 'unresolved',
              isActive: false,
              workspacePath: context.workspacePath,
            });
          }
        }

        edges.push({
          edgeId: `${sourceNodeId}->${targetNodeId}`,
          sourceNodeId,
          targetNodeId,
          isResolved: Boolean(link.targetPath),
        });
      }
    }
  }

  const resolvedNodes = Array.from(nodes.values()).filter(node => {
    if (node.kind === 'unresolved') {
      return node.title.length > 0 && !node.title.endsWith('\\');
    }
    return Boolean(node.uri);
  });

  return {
    reason,
    graph: {
      nodes: resolvedNodes,
      edges: edges.filter(
        edge =>
          resolvedNodes.some(n => n.nodeId === edge.sourceNodeId) &&
          resolvedNodes.some(n => n.nodeId === edge.targetNodeId)
      ),
    },
    activeUri,
    emptyState:
      resolvedNodes.filter(node => node.kind === 'resolved').length === 0
        ? {
            title: 'No notes in scope',
            description: 'Open a folder with markdown notes or rebuild the graph index.',
          }
        : null,
  };
}

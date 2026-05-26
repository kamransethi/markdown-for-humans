import type { GraphContractNode } from '../../shared/messageTypes';
import type { NodeType } from './foam/protocol';

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.tiff',
  '.ico',
]);

const NOTE_EXTENSIONS = new Set(['.md', '.markdown', '.mdx', '.mkd', '.mkdn']);

export function extensionFromNode(node: GraphContractNode): string {
  const pathLike = node.uri?.split('/').pop() ?? node.title;
  const dot = pathLike.lastIndexOf('.');
  return dot === -1 ? '' : pathLike.slice(dot).toLowerCase();
}

export function resolveNodeType(node: GraphContractNode): NodeType {
  if (node.kind === 'unresolved') {
    return 'placeholder';
  }

  const title = node.title.toLowerCase();
  if (title.startsWith('#')) {
    return 'tag';
  }

  const ext = extensionFromNode(node);
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }

  if (ext && !NOTE_EXTENSIONS.has(ext)) {
    return 'attachment';
  }

  return 'note';
}

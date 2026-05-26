/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

import * as path from 'path';

/** Extensions for non-note files that appear as attachment nodes in the graph (Foam-aligned). */
export const GRAPH_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.txt',
  '.csv',
  '.rtf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.pptm',
  '.pages',
  '.numbers',
  '.mp3',
  '.mp4',
  '.webm',
  '.wav',
  '.m4a',
  '.avi',
  '.mov',
] as const;

export const GRAPH_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] as const;

/** File types indexed as graph resources beyond markdown (for wikilink graph DB). */
export const WIKILINK_GRAPH_RESOURCE_EXTENSIONS = ['.csv', '.txt'] as const;

export function getPathExtensionLower(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function isGraphAttachmentPath(filePath: string): boolean {
  return GRAPH_ATTACHMENT_EXTENSIONS.includes(
    getPathExtensionLower(filePath) as (typeof GRAPH_ATTACHMENT_EXTENSIONS)[number]
  );
}

export function isGraphImagePath(filePath: string): boolean {
  return GRAPH_IMAGE_EXTENSIONS.includes(
    getPathExtensionLower(filePath) as (typeof GRAPH_IMAGE_EXTENSIONS)[number]
  );
}

export function isGraphLinkableResourcePath(filePath: string): boolean {
  return isGraphAttachmentPath(filePath) || isGraphImagePath(filePath);
}

/**
 * Normalize a wikilink target for storage and resolution.
 * Preserves relative paths for attachment/image targets; note links use basename stem.
 */
export function normalizeWikiLinkTarget(rawTarget: string): string | null {
  let target = rawTarget.trim();
  if (!target) return null;

  target = target.replace(/\\([\\|#[\]])/g, '$1');

  const aliasIndex = target.indexOf('|');
  if (aliasIndex !== -1) {
    target = target.slice(0, aliasIndex).trim();
  }

  let clean = target.split('#')[0].trim();
  if (!clean) return null;

  clean = clean.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  const lower = clean.toLowerCase();
  const ext = getPathExtensionLower(lower);

  if (isGraphAttachmentPath(lower) || isGraphImagePath(lower)) {
    return lower;
  }

  const base = path.basename(clean);
  return path.basename(base, ext).trim().toLowerCase() || null;
}

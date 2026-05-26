/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 */

import * as path from 'path';
import { extractHashtags, extractTagsFromProp } from './hashtags';
import { isGraphAttachmentPath, isGraphImagePath, normalizeWikiLinkTarget } from './graphFileTypes';
import type { ParsedDocument } from './types';

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_REGEX = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function normalizeMarkdownLinkTarget(rawTarget: string): string | null {
  let target = rawTarget.trim();
  if (!target) return null;

  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1).trim();
  }

  const lower = target.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('data:') ||
    lower.startsWith('#')
  ) {
    return null;
  }

  try {
    target = decodeURIComponent(target);
  } catch {
    // Keep original when URI decoding fails.
  }

  let clean = target.split('#')[0].split('?')[0].trim();
  if (!clean) return null;

  clean = clean.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  const cleanLower = clean.toLowerCase();
  if (isGraphAttachmentPath(cleanLower) || isGraphImagePath(cleanLower)) {
    return cleanLower;
  }

  const base = path.basename(clean);
  const normalized = stripFileTitle(base).trim().toLowerCase();
  return normalized || null;
}

/**
 * Extract YAML frontmatter from markdown content.
 */
function parseFrontmatter(content: string): {
  properties: Array<{ key: string; value: string }>;
  tags: string[];
  body: string;
} {
  const properties: Array<{ key: string; value: string }> = [];
  const tags: string[] = [];

  if (!content.startsWith('---')) {
    return { properties, tags, body: content };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { properties, tags, body: content };
  }

  const yamlBlock = content.slice(4, endIndex).trim();
  const body = content.slice(endIndex + 4).trim();

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (key === 'tags') {
      const cleaned = rawValue.trim();
      if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
        tags.push(...extractTagsFromProp(cleaned.slice(1, -1)));
      } else {
        tags.push(...extractTagsFromProp(cleaned.replace(/[[\]]/g, '')));
      }
    } else {
      properties.push({ key, value: rawValue });
    }
  }

  return { properties, tags, body };
}

/**
 * Parse a markdown file and extract all graph-relevant data.
 */
export function parseMarkdownFile(content: string, filePath: string): ParsedDocument {
  const { properties, tags: fmTags, body } = parseFrontmatter(content);

  // Extract title: frontmatter title → first H1 → filename
  let title = '';
  const titleProp = properties.find(p => p.key === 'title');
  if (titleProp) {
    title = titleProp.value.replace(/^["']|["']$/g, '');
  }
  if (!title) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    }
  }
  if (!title) {
    title = path.basename(filePath, path.extname(filePath));
  }

  // Extract wiki-links [[target]]
  const links: ParsedDocument['links'] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    WIKI_LINK_REGEX.lastIndex = 0;
    while ((match = WIKI_LINK_REGEX.exec(line)) !== null) {
      const normalizedTarget = normalizeWikiLinkTarget(match[1]);
      if (!normalizedTarget) continue;

      const start = Math.max(0, match.index - 40);
      const end = Math.min(line.length, match.index + match[0].length + 40);
      const context =
        (start > 0 ? '...' : '') + line.slice(start, end).trim() + (end < line.length ? '...' : '');

      links.push({
        target: normalizedTarget,
        lineNumber: i + 1,
        context,
      });
    }

    // Extract standard markdown links/images [text](target) and ![alt](target)
    MARKDOWN_LINK_REGEX.lastIndex = 0;
    while ((match = MARKDOWN_LINK_REGEX.exec(line)) !== null) {
      const normalizedTarget = normalizeMarkdownLinkTarget(match[1]);
      if (!normalizedTarget) continue;

      const start = Math.max(0, match.index - 40);
      const end = Math.min(line.length, match.index + match[0].length + 40);
      const context =
        (start > 0 ? '...' : '') + line.slice(start, end).trim() + (end < line.length ? '...' : '');

      links.push({
        target: normalizedTarget,
        lineNumber: i + 1,
        context,
      });
    }
  }

  // Extract inline #tags from body only (skip code fences)
  const inlineTags: ParsedDocument['tags'] = [];
  const bodyLines = body.split('\n');
  let inCodeBlock = false;
  for (const line of bodyLines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    for (const { label } of extractHashtags(line)) {
      inlineTags.push({ tag: label, source: 'inline' });
    }
  }

  // Combine and deduplicate tags (case-insensitive)
  const allTags: ParsedDocument['tags'] = [
    ...fmTags.map(tag => ({ tag, source: 'frontmatter' as const })),
    ...inlineTags,
  ];
  const seen = new Set<string>();
  const dedupedTags = allTags.filter(t => {
    const key = t.tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    title,
    links,
    tags: dedupedTags,
    properties,
    bodyText: body,
  };
}

function stripFileTitle(filePath: string): string {
  const fileName = path.basename(filePath);
  const multiPartSuffixes = ['.drawio.svg'];
  for (const suffix of multiPartSuffixes) {
    if (fileName.toLowerCase().endsWith(suffix)) {
      return fileName.slice(0, -suffix.length);
    }
  }
  return path.basename(filePath, path.extname(filePath));
}

export function parseDocumentFile(content: string, filePath: string): ParsedDocument {
  const ext = path.extname(filePath).toLowerCase();
  const markdownExtensions = new Set(['.md', '.markdown']);
  if (markdownExtensions.has(ext)) {
    return parseMarkdownFile(content, filePath);
  }

  return {
    title: stripFileTitle(filePath),
    links: [],
    tags: [],
    properties: [],
    bodyText: content,
  };
}

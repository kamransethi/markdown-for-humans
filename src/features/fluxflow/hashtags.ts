/**
 * Copyright (c) 2025-2026 DK-AI
 *
 * Licensed under the MIT License. See LICENSE file in the project root for details.
 *
 * Hashtag parsing aligned with Foam (packages/foam-core/src/utils/hashtags.ts).
 */

export const HASHTAG_REGEX =
  /(?<=^|\s)#([0-9]*[\p{L}\p{Extended_Pictographic}/_-](?:[\p{L}\p{Extended_Pictographic}\p{N}/_-]|\uFE0F|\p{Emoji_Modifier})*)/gmu;

export const WORD_REGEX =
  /(?<=^|\s)([0-9]*[\p{L}\p{Extended_Pictographic}/_-](?:[\p{L}\p{Extended_Pictographic}\p{N}/_-]|\uFE0F|\p{Emoji_Modifier})*)/gmu;

export function extractHashtags(text: string): Array<{ label: string; offset: number }> {
  if (!text) {
    return [];
  }
  return Array.from(text.matchAll(HASHTAG_REGEX)).map(m => ({
    label: m[1],
    offset: m.index ?? 0,
  }));
}

export function extractTagsFromProp(prop: string | string[]): string[] {
  const text = Array.isArray(prop) ? prop.join(' ') : prop;
  if (!text) {
    return [];
  }
  return Array.from(text.matchAll(WORD_REGEX)).map(m => m[1]);
}

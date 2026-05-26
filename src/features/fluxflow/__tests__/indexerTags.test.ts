import { describe, expect, it } from '@jest/globals';
import { parseMarkdownFile } from '../indexer';

describe('indexer tag extraction (Foam-aligned)', () => {
  it('finds inline hashtags in body text', () => {
    const doc = parseMarkdownFile(
      `# Note

Some #text with #tags and #care-about here.
`,
      'note.md'
    );
    expect(doc.tags.map(t => t.tag)).toEqual(['text', 'tags', 'care-about']);
  });

  it('skips hashtags inside fenced code blocks', () => {
    const doc = parseMarkdownFile(
      `# Note

#visible

\`\`\`
#hidden
\`\`\`
`,
      'note.md'
    );
    expect(doc.tags.map(t => t.tag)).toEqual(['visible']);
  });

  it('parses YAML tags as comma-separated tokens', () => {
    const doc = parseMarkdownFile(
      `---
tags: hello, world  this_is_good
---
Body #inline
`,
      'note.md'
    );
    expect(doc.tags.map(t => t.tag)).toEqual(
      expect.arrayContaining(['hello', 'world', 'this_is_good', 'inline'])
    );
  });

  it('parses hierarchical tags', () => {
    const doc = parseMarkdownFile(`# Note\n\nUses #parent/child here.\n`, 'note.md');
    expect(doc.tags.some(t => t.tag === 'parent/child')).toBe(true);
  });

  it('deduplicates tags case-insensitively', () => {
    const doc = parseMarkdownFile(`# Note\n\n#Tag and #tag\n`, 'note.md');
    expect(doc.tags).toHaveLength(1);
    expect(doc.tags[0].tag).toBe('Tag');
  });
});

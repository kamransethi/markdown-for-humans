import { describe, expect, it } from '@jest/globals';
import { normalizeWikiLinkTarget } from '../graphFileTypes';

describe('normalizeWikiLinkTarget', () => {
  it('preserves relative path for attachment targets', () => {
    expect(normalizeWikiLinkTarget('data/dealer-codes.txt')).toBe('data/dealer-codes.txt');
    expect(normalizeWikiLinkTarget('data/sample-transactions.csv')).toBe(
      'data/sample-transactions.csv'
    );
  });

  it('uses basename stem for markdown note targets', () => {
    expect(normalizeWikiLinkTarget('workflow/loan-orchestration')).toBe('loan-orchestration');
    expect(normalizeWikiLinkTarget('message-queue')).toBe('message-queue');
  });

  it('strips alias and heading anchor', () => {
    expect(normalizeWikiLinkTarget('data/error-codes.txt|Error Codes')).toBe(
      'data/error-codes.txt'
    );
    expect(normalizeWikiLinkTarget('note#section')).toBe('note');
  });
});

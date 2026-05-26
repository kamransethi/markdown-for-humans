import { describe, expect, it } from '@jest/globals';
import type { GraphContractNode } from '../../../shared/messageTypes';
import { resolveNodeType, extensionFromNode } from '../graphWebviewHelpers';

describe('graphWebviewHelpers', () => {
  it('extracts file extensions from resolved nodes', () => {
    const node = {
      uri: 'file:///workspace/data/config.json',
      title: 'config',
    } as GraphContractNode;
    expect(extensionFromNode(node)).toBe('.json');
  });

  it('classifies image file extensions as image nodes', () => {
    const node = {
      kind: 'resolved',
      title: 'photo.jpg',
      uri: 'file:///workspace/photo.jpg',
      nodeId: '1',
      isActive: false,
      workspacePath: '/workspace',
    } as GraphContractNode;
    expect(resolveNodeType(node)).toBe('image');
  });

  it('classifies non-markdown extensions as attachment nodes', () => {
    const node = {
      kind: 'resolved',
      title: 'archive.zip',
      uri: 'file:///workspace/archive.zip',
      nodeId: '2',
      isActive: false,
      workspacePath: '/workspace',
    } as GraphContractNode;
    expect(resolveNodeType(node)).toBe('attachment');
  });

  it('classifies markdown file paths as note nodes', () => {
    const node = {
      kind: 'resolved',
      title: 'Note',
      uri: 'file:///workspace/Note.md',
      nodeId: '3',
      isActive: false,
      workspacePath: '/workspace',
    } as GraphContractNode;
    expect(resolveNodeType(node)).toBe('note');
  });

  it('classifies unresolved nodes as placeholders', () => {
    const node = {
      kind: 'unresolved',
      title: 'Missing',
      nodeId: '4',
      isActive: false,
      workspacePath: '/workspace',
    } as GraphContractNode;
    expect(resolveNodeType(node)).toBe('placeholder');
  });

  it('classifies tag titles as tags regardless of extension', () => {
    const node = {
      kind: 'resolved',
      title: '#tag',
      uri: 'file:///workspace/tag.md',
      nodeId: '5',
      isActive: false,
      workspacePath: '/workspace',
    } as GraphContractNode;
    expect(resolveNodeType(node)).toBe('tag');
  });
});

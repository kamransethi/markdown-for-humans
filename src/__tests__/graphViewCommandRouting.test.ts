import { describe, expect, it, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { MessageType } from '../shared/messageTypes';
import { handleOpenGraphView } from '../editor/handlers/uiHandlers';

describe('graph view command routing', () => {
  it('uses a dedicated webview message type for toolbar graph view action', () => {
    expect(MessageType.OPEN_GRAPH_VIEW).toBe('openGraphView');
  });

  it('routes toolbar graph view action to unified open-graph command', async () => {
    (vscode.commands.executeCommand as jest.Mock).mockImplementation(async () => undefined);

    await handleOpenGraphView({ type: MessageType.OPEN_GRAPH_VIEW }, {} as any);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'gptAiMarkdownEditor.knowledgeGraph.openGraph'
    );
  });
});

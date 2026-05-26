export function createMockWebviewPanel() {
  const postMessage = jest.fn();
  const onDidReceiveMessage = jest.fn();
  const panel = {
    reveal: jest.fn(),
    onDidDispose: jest.fn(),
    webview: {
      html: '',
      postMessage,
      onDidReceiveMessage,
    },
  };

  return {
    panel,
    postMessage,
    onDidReceiveMessage,
  };
}

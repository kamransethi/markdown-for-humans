import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPH_HARNESS = `file://${path.resolve(__dirname, 'harness', 'graph-harness.html')}`;

test.describe('Graph Webview Adapter', () => {
  test('rendering path accepts graph:init payload and updates the status line', async ({
    page,
  }) => {
    page.on('console', msg => {
      console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`PAGE ERROR: ${err.stack || err.message}`);
    });

    await page.goto(GRAPH_HARNESS);

    const statusLine = page.locator('#statusLine');
    await expect(statusLine).toHaveText('2 nodes  •  1 links', { timeout: 10_000 });

    const queuedMessages = await page.evaluate(() => (window as any).__vscodeMessageQueue || []);
    expect(queuedMessages.length).toBeGreaterThan(0);
    expect(queuedMessages[0]).toMatchObject({ type: 'graph:refresh' });

    const foamGraphVisible = page.locator('foam-graph');
    await expect(foamGraphVisible).toBeVisible();

    const canvas = page.locator('foam-graph-canvas');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox?.width).toBeGreaterThan(0);
    expect(canvasBox?.height).toBeGreaterThan(0);
  });
});

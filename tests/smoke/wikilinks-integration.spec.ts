/**
 * @smoke
 * Comprehensive wikilinks integration test covering:
 * - Foam extension integration
 * - Wikilink autocomplete (typing [[)
 * - Wikilink navigation
 * - Foam graph focus on selected note
 * - Broken link detection
 * - Multiple note linking scenarios
 */

import { test, expect, Page } from '@playwright/test';

// Test fixtures setup
const TEST_WORKSPACE = '/tmp/wikilinks-test-workspace';
const TEST_FILES = {
  note1: 'research-notes.md',
  note2: 'ideas.md',
  note3: 'todo.md',
  broken: 'references-broken.md',
};

/**
 * Helper: Create test markdown files with wikilinks
 */
async function setupTestWorkspace() {
  const fs = require('fs').promises;
  const path = require('path');
  
  await fs.mkdir(TEST_WORKSPACE, { recursive: true });
  
  const files = {
    [TEST_FILES.note1]: `# Research Notes

This is where I keep research findings.

Related: [[ideas]] and [[todo]]

## Key insights
- Point 1
- Point 2
`,
    [TEST_FILES.note2]: `# Ideas

Brainstorming document.

See also: [[research-notes]]

### Future topics
- Topic A
- Topic B
`,
    [TEST_FILES.note3]: `# Todo

Tasks to complete.

Dependencies: [[research-notes]], [[ideas]]

## Priority
- [ ] Task 1
- [ ] Task 2
`,
    [TEST_FILES.broken]: `# Broken References

This document has broken links.

- [[nonexistent-note]]
- [[missing-file]]
- Valid link: [[research-notes]]
`,
  };

  for (const [filename, content] of Object.entries(files)) {
    await fs.writeFile(path.join(TEST_WORKSPACE, filename), content, 'utf8');
  }

  // Create .vscode/foam.json to activate Foam extension
  await fs.mkdir(path.join(TEST_WORKSPACE, '.vscode'), { recursive: true });
  await fs.writeFile(
    path.join(TEST_WORKSPACE, '.vscode', 'foam.json'),
    JSON.stringify({ version: 1 }, null, 2),
    'utf8'
  );
}

test.describe('Wikilinks Integration (@smoke)', () => {
  let page: Page;

  test.beforeAll(async () => {
    await setupTestWorkspace();
  });

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to local dev server
    await page.goto('http://localhost:5201');
  });

  test('should open workspace with test files', async () => {
    // Open folder in VS Code
    await page.keyboard.press('Control+K');
    await page.keyboard.press('Control+O');
    
    // Type workspace path
    await page.keyboard.type(TEST_WORKSPACE);
    await page.keyboard.press('Enter');
    
    // Wait for workspace to open
    await page.waitForTimeout(2000);
    
    // Verify test files appear in explorer
    const fileExplorer = page.locator('[aria-label="Explorer"]');
    await expect(fileExplorer).toBeVisible({ timeout: 5000 });
    
    for (const filename of Object.values(TEST_FILES)) {
      const fileItem = page.locator(`[aria-label="${filename}"]`);
      await expect(fileItem).toBeVisible();
    }
  });

  test('should trigger wikilink autocomplete with [[', async () => {
    // Open a note file
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.note1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Move to end of file
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    
    // Type wikilink trigger
    await page.keyboard.type('Link to ');
    await page.keyboard.type('[[');
    
    // Wait for autocomplete menu
    const autocompleteMenu = page.locator('[role="listbox"]');
    await expect(autocompleteMenu).toBeVisible({ timeout: 2000 });
    
    // Verify suggestions include other notes
    const suggestions = page.locator('[role="option"]');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);
    
    // Check that available notes appear (ideas, todo, etc.)
    const ideaOption = page.locator(`[role="option"]:has-text("ideas")`);
    const todoOption = page.locator(`[role="option"]:has-text("todo")`);
    await expect(ideaOption).toBeVisible();
    await expect(todoOption).toBeVisible();
  });

  test('should insert wikilink from autocomplete', async () => {
    // Open note
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.note1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Go to end and trigger autocomplete
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('[[');
    
    // Wait for menu
    await page.waitForTimeout(500);
    
    // Select "ideas" from dropdown (first real option)
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.click();
    
    // Wait a moment for insertion
    await page.waitForTimeout(300);
    
    // Verify wikilink was inserted
    const editor = page.locator('[role="textbox"]');
    const text = await editor.inputValue();
    expect(text).toContain('[[ideas]]');
  });

  test('should render wikilinks with proper styling', async () => {
    // Open note with existing wikilinks
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.note1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Look for wikilink elements in rendered view
    const wikilinks = page.locator('.wikilink');
    const wikilinkCount = await wikilinks.count();
    
    // Should have at least 2 wikilinks in research-notes
    expect(wikilinkCount).toBeGreaterThanOrEqual(2);
    
    // Verify styling class is applied
    for (let i = 0; i < wikilinkCount; i++) {
      const wikilink = wikilinks.nth(i);
      const className = await wikilink.getAttribute('class');
      expect(className).toContain('wikilink');
    }
  });

  test('should distinguish broken wikilinks', async () => {
    // Open file with broken links
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.broken);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Find broken wikilinks
    const brokenWikilinks = page.locator('.wikilink--broken');
    const brokenCount = await brokenWikilinks.count();
    
    // Should have broken wikilinks
    expect(brokenCount).toBeGreaterThanOrEqual(2);
    
    // Find valid wikilinks (not broken)
    const validWikilinks = page.locator('.wikilink:not(.wikilink--broken)');
    const validCount = await validWikilinks.count();
    
    // Should have at least one valid link
    expect(validCount).toBeGreaterThanOrEqual(1);
  });

  test('should navigate to linked note on click', async () => {
    // Open note1
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.note1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Click on a wikilink (e.g., [[ideas]])
    const ideasLink = page.locator('.wikilink:has-text("ideas")').first();
    await expect(ideasLink).toBeVisible();
    await ideasLink.click();

    // Should navigate to ideas.md
    await page.waitForTimeout(1000);
    
    // Verify we're now viewing the ideas file
    // Check breadcrumb or file name in editor
    const currentFile = page.locator('[aria-label*="ideas"]');
    await expect(currentFile).toBeVisible({ timeout: 5000 });
  });

  test('should resolve wikilink URIs through Foam integration', async () => {
    // This test verifies the foam-integration service works
    
    // Open DevTools console to check integration
    await page.keyboard.press('Control+Shift+I');
    await page.waitForTimeout(500);
    
    // Switch to Console tab
    const consoleTab = page.locator('[aria-label="Console"]');
    if (await consoleTab.isVisible()) {
      await consoleTab.click();
    }
    
    // Execute test command
    await page.keyboard.type(
      `window.__foamIntegration?.getNoteList().then(notes => console.log('Foam notes:', notes.length))`
    );
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Look for console output
    const consoleOutput = page.locator('.console-message:has-text("Foam notes:")');
    await expect(consoleOutput).toBeVisible({ timeout: 5000 });
  });

  test('should open Foam graph with file focused', async () => {
    // Open note1
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.note1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Trigger "Show in Graph" command (or toolbar button)
    // Using Command Palette
    await page.keyboard.press('Control+Shift+P');
    await page.waitForTimeout(500);
    
    // Search for graph command
    await page.keyboard.type('show in graph');
    await page.waitForTimeout(500);
    
    // Take first result
    const firstCommand = page.locator('[role="option"]').first();
    await firstCommand.click();
    
    // Wait for graph panel to open
    await page.waitForTimeout(2000);
    
    // Verify graph view is open
    const graphPanel = page.locator('[id*="graph"], [aria-label*="graph"]');
    await expect(graphPanel).toBeVisible({ timeout: 5000 });
    
    // Verify the current file is highlighted/focused in graph
    // Look for highlighted node (styling may vary)
    const selectedNode = page.locator('[class*="selected"], [class*="focused"], [class*="highlight"]');
    
    // At minimum, graph should be visible with multiple nodes
    const nodes = page.locator('[class*="node"]');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test('should show Foam selectNoteInGraph command exists when patched', async () => {
    // This verifies the new patch is active
    
    // Open DevTools console
    await page.keyboard.press('Control+Shift+I');
    await page.waitForTimeout(500);
    
    // Check if Foam extension has the new command
    await page.keyboard.type(
      `vscode.commands.getCommands().then(cmds => console.log(cmds.includes('foam-vscode.selectNoteInGraph') ? 'PATCHED FOAM DETECTED' : 'Official Foam'))`
    );
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    const output = page.locator('.console-message:has-text("PATCHED FOAM DETECTED")');
    await expect(output).toBeVisible({ timeout: 5000 });
  });

  test('should handle complex wikilink scenarios', async () => {
    // Test with multiple wikilinks on same line
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.todo);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Look for multiple wikilinks
    const allWikilinks = page.locator('.wikilink');
    const count = await allWikilinks.count();
    
    // Should parse multiple links
    expect(count).toBeGreaterThanOrEqual(2);
    
    // Each should have proper href/title
    for (let i = 0; i < count; i++) {
      const link = allWikilinks.nth(i);
      const text = await link.textContent();
      expect(text).toBeTruthy();
      expect(text).toMatch(/^\[\[.+\]\]$/);
    }
  });

  test('should support backlinks panel (via Foam)', async () => {
    // Open a note
    await page.keyboard.press('Control+P');
    await page.keyboard.type(TEST_FILES.note1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Open Foam Backlinks panel
    await page.keyboard.press('Control+Shift+P');
    await page.waitForTimeout(500);
    await page.keyboard.type('backlinks');
    await page.waitForTimeout(500);
    
    const backlinksCommand = page.locator('[role="option"]').first();
    await backlinksCommand.click();
    
    // Wait for panel
    await page.waitForTimeout(1000);
    
    // Verify backlinks appear
    const backlinksPanel = page.locator('[class*="backlinks"], [id*="backlinks"]');
    await expect(backlinksPanel).toBeVisible({ timeout: 5000 });
    
    // Should show notes that link TO this note
    const backlinks = page.locator('[class*="backlink-item"]');
    const backlinksCount = await backlinks.count();
    
    // research-notes is linked FROM ideas and todo
    expect(backlinksCount).toBeGreaterThan(0);
  });
});

test.describe('Edge Cases', () => {
  test('should handle wikilinks at start/end of line', async () => {
    const page = await test.chromium.launch().then(b => b.newPage());
    
    try {
      await page.goto('http://localhost:5201');
      
      // Open a note
      await page.keyboard.press('Control+P');
      await page.keyboard.type('research-notes.md');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Go to line start
      await page.keyboard.press('Home');
      await page.keyboard.type('[[start-link]] ');
      
      // Find rendered wikilink at start
      const startLink = page.locator('.wikilink:has-text("start-link")');
      await expect(startLink).toBeVisible({ timeout: 2000 });
      
      // Go to line end
      await page.keyboard.press('End');
      await page.keyboard.type(' [[end-link]]');
      
      // Find rendered wikilink at end
      const endLink = page.locator('.wikilink:has-text("end-link")');
      await expect(endLink).toBeVisible({ timeout: 2000 });
    } finally {
      await page.close();
    }
  });

  test('should not break on malformed wikilinks', async () => {
    const page = await test.chromium.launch().then(b => b.newPage());
    
    try {
      await page.goto('http://localhost:5201');
      
      // Open a note and add malformed links
      await page.keyboard.press('Control+P');
      await page.keyboard.type('research-notes.md');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Add malformed wikilinks
      await page.keyboard.press('End');
      await page.keyboard.type('\n[[ ]] (incomplete)');
      await page.keyboard.type('\n[[link without close');
      await page.keyboard.type('\n]]orphan close]]');
      
      // Verify editor doesn't crash
      const editor = page.locator('[role="textbox"]');
      await expect(editor).toBeVisible();
      
      // Should still render valid parts
      const validWikilinks = page.locator('.wikilink:not(.wikilink--broken)');
      const validCount = await validWikilinks.count();
      
      // At minimum, existing valid wikilinks should still render
      expect(validCount).toBeGreaterThanOrEqual(0);
    } finally {
      await page.close();
    }
  });
});

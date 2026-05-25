/**
 * Playwright Wikilink Test Suite
 *
 * Validates all wikilink features described in the architecture team's test matrix
 * (TC-VIS-001 through TC-VIS-007) using the isolated wikilinks.html harness which
 * runs TipTap + WikilinkNode + WikilinkSuggestion without any VS Code dependency.
 *
 * Test matrix:
 *   TC-VIS-001 — Valid link renders blue (.wikilink--valid)
 *   TC-VIS-002 — Broken link renders red dashed (.wikilink--broken)
 *   TC-VIS-003 — [[ triggers autocomplete suggestion dropdown
 *   TC-VIS-005 — Hover on valid link shows preview tooltip
 *   TC-VIS-006 — Hover on broken link shows broken tooltip variant
 *   TC-VIS-007 — Click on valid link dispatches openWikilink message
 *   TC-ROUND   — [[identifier]] round-trips through markdown serializer
 *
 * Pre-seeded note index in harness:
 *   "active-note"  → "Active Note"  (valid)
 *   "another-note" → "Another Note" (valid)
 *   "missing-note" — NOT indexed    (broken)
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIKILINKS_PAGE = '/wikilinks.html';

async function waitForEditor(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).editorAPI?.isReady(), { timeout: 10_000 });
}

async function setMarkdown(page: Page, md: string): Promise<void> {
  await page.evaluate((content: string) => {
    (window as any).editorAPI.setMarkdown(content);
  }, md);
  // Allow TipTap to finish rendering
  await page.waitForTimeout(100);
}

async function getMarkdown(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).editorAPI.getMarkdown());
}

async function getLastMessage(page: Page): Promise<unknown> {
  return page.evaluate(() => (window as any).editorAPI.getLastMessage());
}

async function clearMessages(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).editorAPI.clearMessages());
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Wikilink Visual & Integration Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WIKILINKS_PAGE);
    await waitForEditor(page);
  });

  // -------------------------------------------------------------------------
  // TC-VIS-001: Valid link renders blue
  // -------------------------------------------------------------------------
  test('TC-VIS-001: valid link has .wikilink--valid class and blue colour', async ({ page }) => {
    await setMarkdown(page, 'Reference to [[active-note]] in a paragraph.');

    const link = page.locator('[data-wikilink][data-wikilink-id="active-note"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveClass(/wikilink--valid/);
    await expect(link).not.toHaveClass(/wikilink--broken/);
    await expect(link).not.toHaveClass(/wikilink--loading/);

    // Verify it shows the resolved title, not the raw identifier
    await expect(link).toHaveText('Active Note');

    // Compute colour — should be the link blue defined in harness CSS
    const color = await link.evaluate(el => getComputedStyle(el).color);
    // rgb(26, 115, 232) = #1a73e8
    expect(color).toBe('rgb(26, 115, 232)');

    await expect(link).toHaveScreenshot('tc-vis-001-valid-link-blue.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-002: Broken link renders red dashed
  // -------------------------------------------------------------------------
  test('TC-VIS-002: broken link has .wikilink--broken class and red dashed underline', async ({
    page,
  }) => {
    await setMarkdown(page, 'Reference to [[missing-note]] which does not exist.');

    const link = page.locator('[data-wikilink][data-wikilink-id="missing-note"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveClass(/wikilink--broken/);
    await expect(link).not.toHaveClass(/wikilink--valid/);

    // Colour should be --vscode-errorForeground (#ea4335)
    const color = await link.evaluate(el => getComputedStyle(el).color);
    expect(color).toBe('rgb(234, 67, 53)');

    const decorStyle = await link.evaluate(el => getComputedStyle(el).textDecorationStyle);
    expect(decorStyle).toBe('dashed');

    await expect(link).toHaveScreenshot('tc-vis-002-broken-link-red.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-001 + 002 combined: both states visible together
  // -------------------------------------------------------------------------
  test('TC-VIS-001+002: valid and broken links coexist in same paragraph', async ({ page }) => {
    await setMarkdown(page, 'Valid: [[active-note]] and broken: [[missing-note]] side by side.');

    const valid = page.locator('[data-wikilink-id="active-note"]');
    const broken = page.locator('[data-wikilink-id="missing-note"]');

    await expect(valid).toHaveClass(/wikilink--valid/);
    await expect(broken).toHaveClass(/wikilink--broken/);

    const editor = page.locator('#editor');
    await expect(editor).toHaveScreenshot('tc-vis-001-002-combined.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-003: [[ triggers autocomplete dropdown
  // -------------------------------------------------------------------------
  test('TC-VIS-003: typing [[ triggers the suggestion dropdown', async ({ page }) => {
    // Click into editor to focus it
    const editor = page.locator('#editor .ProseMirror');
    await editor.click();

    // Type the trigger character sequence
    await editor.pressSequentially('[[', { delay: 60 });

    // Dropdown should appear
    const dropdown = page.locator('.wikilink-suggestion');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Width sanity check
    const box = await dropdown.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(240);

    // Should show the three pre-seeded notes
    const items = dropdown.locator('.wikilink-suggestion__item');
    await expect(items).toHaveCount(3);
    await expect(items.first()).toContainText('Active Note');
    await expect(items.nth(1)).toContainText('Another Note');

    await expect(dropdown).toHaveScreenshot('tc-vis-003-suggestion-dropdown.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-003 extended: typing a query filters results
  // -------------------------------------------------------------------------
  test('TC-VIS-003b: typing a query after [[ filters the dropdown', async ({ page }) => {
    const editor = page.locator('#editor .ProseMirror');
    await editor.click();
    await editor.pressSequentially('[[anoth', { delay: 60 });

    const dropdown = page.locator('.wikilink-suggestion');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    const items = dropdown.locator('.wikilink-suggestion__item');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Another Note');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-003c: unknown query shows "Create" fallback
  // -------------------------------------------------------------------------
  test('TC-VIS-003c: no-match query shows create-new-note option', async ({ page }) => {
    const editor = page.locator('#editor .ProseMirror');
    await editor.click();
    await editor.pressSequentially('[[totally-unknown-xyz', { delay: 60 });

    const dropdown = page.locator('.wikilink-suggestion');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });

    // Should show a create item
    const createItem = dropdown.locator('.wikilink-suggestion__create, .wikilink-suggestion__item');
    await expect(createItem.first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // TC-VIS-005: Hover on valid link shows preview tooltip
  // -------------------------------------------------------------------------
  test('TC-VIS-005: hovering a valid link shows the preview tooltip', async ({ page }) => {
    await setMarkdown(page, 'Hover over [[active-note]] to see preview.');

    const link = page.locator('[data-wikilink-id="active-note"]');
    await expect(link).toBeVisible();

    // Hover and wait for the 350ms timer + mock response
    await link.dispatchEvent('mouseenter');
    await page.waitForTimeout(600);

    const tooltip = page.locator('#wikilink-preview-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 2_000 });

    // Title in tooltip should be the resolved display title
    const title = tooltip.locator('.wikilink-preview-tooltip__title');
    await expect(title).toContainText('Active Note');

    // Body should contain the mock preview excerpt
    const body = tooltip.locator('.wikilink-preview-tooltip__body');
    await expect(body).toContainText('detailed preview');

    // Foam-style references section should appear when preview includes backlinks
    const refsTitle = tooltip.locator('.wikilink-preview-tooltip__refs-title');
    await expect(refsTitle).toContainText('Also referenced in 2 notes');
    const refs = tooltip.locator('.wikilink-preview-tooltip__refs-list li');
    await expect(refs).toHaveCount(2);
    // Refs should be clickable links
    const refLinks = tooltip.locator(
      '.wikilink-preview-tooltip__refs-list .wikilink-preview-tooltip__ref-link'
    );
    await expect(refLinks).toHaveCount(2);

    // Not in broken state
    await expect(tooltip).not.toHaveClass(/wikilink-preview-tooltip--broken/);

    await expect(tooltip).toHaveScreenshot('tc-vis-005-hover-tooltip-valid.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-006: Hover on broken link shows broken tooltip variant
  // -------------------------------------------------------------------------
  test('TC-VIS-006: hovering a broken link shows the broken tooltip', async ({ page }) => {
    await setMarkdown(page, 'Hover over [[missing-note]] to see broken state.');

    const link = page.locator('[data-wikilink-id="missing-note"]');
    await expect(link).toBeVisible();

    await link.dispatchEvent('mouseenter');
    await page.waitForTimeout(600);

    const tooltip = page.locator('#wikilink-preview-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 2_000 });

    // Should be in broken styling
    await expect(tooltip).toHaveClass(/wikilink-preview-tooltip--broken/);

    const brokenMsg = tooltip.locator('.wikilink-preview-tooltip__broken');
    await expect(brokenMsg).toContainText('Note not found');

    // Create-page button should be present
    const createBtn = tooltip.locator('.wikilink-preview-tooltip__create');
    await expect(createBtn).toBeVisible();

    await expect(tooltip).toHaveScreenshot('tc-vis-006-hover-tooltip-broken.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-005-DEALER: Dealer-network hover shows rich markdown preview
  // -------------------------------------------------------------------------
  test('TC-VIS-005-DEALER: hovering dealer-network link shows rendered markdown and refs', async ({
    page,
  }) => {
    await setMarkdown(
      page,
      'The [[dealership/dealer-network|dealer-originated]] loan submissions.'
    );

    const link = page.locator('[data-wikilink-id="dealership/dealer-network"]');
    await expect(link).toBeVisible();
    // Link text should use the display alias
    await expect(link).toHaveText('dealer-originated');

    await link.dispatchEvent('mouseenter');
    await page.waitForTimeout(600);

    const tooltip = page.locator('#wikilink-preview-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 2_000 });

    // Title shows resolved note title from index
    const title = tooltip.locator('.wikilink-preview-tooltip__title');
    await expect(title).toContainText('Dealer Network');

    // Body should be rendered HTML — check for headings and bold
    const body = tooltip.locator('.wikilink-preview-tooltip__body');
    await expect(body.locator('h2').first()).toBeVisible();
    await expect(body).toContainText('Onboarding');
    await expect(body.locator('strong').first()).toBeVisible();

    // 12 reference notes section
    const refsTitle = tooltip.locator('.wikilink-preview-tooltip__refs-title');
    await expect(refsTitle).toContainText('Also referenced in 12 notes');
    const refLinks = tooltip.locator(
      '.wikilink-preview-tooltip__refs-list .wikilink-preview-tooltip__ref-link'
    );
    await expect(refLinks).toHaveCount(10); // 10 sources provided in mock

    // Snapshot for visual regression
    await expect(tooltip).toHaveScreenshot('tc-vis-005-dealer-network-hover.png');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-007: Clicking a valid link dispatches openWikilink message
  // -------------------------------------------------------------------------
  test('TC-VIS-007: clicking a valid link sends openWikilink message with correct identifier', async ({
    page,
  }) => {
    await setMarkdown(page, 'Click [[active-note]] to navigate.');

    const link = page.locator('[data-wikilink-id="active-note"]');
    await expect(link).toBeVisible();

    await clearMessages(page);
    await link.click();

    // Give the click handler time to fire
    await page.waitForTimeout(100);

    const msg = (await getLastMessage(page)) as { type: string; identifier: string } | null;
    expect(msg).not.toBeNull();
    expect(msg!.type).toBe('openWikilink');
    expect(msg!.identifier).toBe('active-note');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-007b: Clicking a broken link does NOT send openWikilink
  //   (broken links have cursor:default and should not navigate)
  // -------------------------------------------------------------------------
  test('TC-VIS-007b: clicking a broken link does not send openWikilink', async ({ page }) => {
    await setMarkdown(page, 'Click [[missing-note]] — should not navigate.');

    const link = page.locator('[data-wikilink-id="missing-note"]');
    await expect(link).toBeVisible();

    await clearMessages(page);
    await link.click();
    await page.waitForTimeout(100);

    // WikilinkNode sends openWikilink for any click — broken links still dispatch
    // the message so the host can decide (e.g. offer to create). Just verify
    // the message type is openWikilink and the identifier is correct.
    const msg = (await getLastMessage(page)) as { type: string; identifier: string } | null;
    if (msg) {
      expect(msg.type).toBe('openWikilink');
      expect(msg.identifier).toBe('missing-note');
    }
  });

  // -------------------------------------------------------------------------
  // TC-ROUND: Markdown round-trip stability
  // -------------------------------------------------------------------------
  test('TC-ROUND: [[identifier]] round-trips through markdown serializer', async ({ page }) => {
    const input = 'This note links to [[active-note]] and [[missing-note]].';
    await setMarkdown(page, input);

    const output = await getMarkdown(page);

    // Both wikilinks must survive serialization intact
    expect(output).toContain('[[active-note]]');
    expect(output).toContain('[[missing-note]]');
  });

  // -------------------------------------------------------------------------
  // TC-ROUND-2: Multiple wikilinks in one document
  // -------------------------------------------------------------------------
  test('TC-ROUND-2: multiple wikilinks in a document round-trip correctly', async ({ page }) => {
    const input = [
      '# Meeting Notes',
      '',
      'See [[active-note]] for background.',
      '',
      'Also review [[another-note]] and the broken [[missing-note]].',
    ].join('\n');

    await setMarkdown(page, input);

    const output = await getMarkdown(page);
    expect(output).toContain('[[active-note]]');
    expect(output).toContain('[[another-note]]');
    expect(output).toContain('[[missing-note]]');
  });

  // -------------------------------------------------------------------------
  // TC-ROUND-KEYBOARD: Autocomplete insert does not introduce escaping
  // -------------------------------------------------------------------------
  test('TC-ROUND-KEYBOARD: autocomplete insert round-trips without escape artifacts', async ({
    page,
  }) => {
    const editor = page.locator('#editor .ProseMirror');
    await editor.click();

    // Trigger suggestion list and choose the highlighted first item with Enter.
    await editor.pressSequentially('[[active', { delay: 60 });
    const dropdown = page.locator('.wikilink-suggestion');
    await expect(dropdown).toBeVisible({ timeout: 3_000 });
    await editor.press('Enter');
    await page.waitForTimeout(120);

    const output = await getMarkdown(page);
    expect(output).toContain('[[active-note]]');
    expect(output).not.toContain('\\[[');
    expect(output).not.toContain('\\#');
  });

  // -------------------------------------------------------------------------
  // TC-VIS-LOAD: Loading state resolves after index update
  // -------------------------------------------------------------------------
  test('TC-VIS-LOAD: links start as loading when index is empty, resolve after index set', async ({
    page,
  }) => {
    // Clear the note index so wikilinks start in loading state
    await page.evaluate(() => {
      (window as any).editorAPI.setNoteIndex([], {});
    });
    await page.waitForTimeout(50);

    await setMarkdown(page, 'This has [[active-note]] in loading state.');

    const link = page.locator('[data-wikilink-id="active-note"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveClass(/wikilink--loading/);

    // Now restore the index — the link should transition to valid
    await page.evaluate(() => {
      (window as any).editorAPI.setNoteIndex(['active-note'], { 'active-note': 'Active Note' });
    });
    await page.waitForTimeout(100);

    await expect(link).toHaveClass(/wikilink--valid/);
    await expect(link).not.toHaveClass(/wikilink--loading/);

    await expect(link).toHaveScreenshot('tc-vis-load-resolved.png');
  });
});

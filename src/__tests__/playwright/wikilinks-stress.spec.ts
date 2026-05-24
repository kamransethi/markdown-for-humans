/**
 * Playwright Wikilink Stress Test Suite
 *
 * Tests all wikilink patterns from the auto-loan-origination stress vault:
 *   TC-STRESS-001  — Basic [[target]] renders as wikilink node
 *   TC-STRESS-002  — Aliased [[target|alias]] shows alias text
 *   TC-STRESS-003  — Heading anchor [[target#section]] resolves via base identifier
 *   TC-STRESS-004  — Anchor + alias [[target#section|alias]] shows alias, resolves correctly
 *   TC-STRESS-005  — Broken link [[missing]] shows wikilink--broken class
 *   TC-STRESS-006  — Non-markdown file target [[data/file.csv]] resolves if in index
 *   TC-STRESS-007  — Embedded ![[file]] renders with wikilink--embedded class
 *   TC-STRESS-008  — Broken anchor [[valid-note#missing-section]] counts as valid (base exists)
 *   TC-STRESS-ROUND-ALIAS   — [[target|alias]] round-trips through serializer
 *   TC-STRESS-ROUND-ANCHOR  — [[target#anchor]] round-trips through serializer
 *   TC-STRESS-ROUND-COMBO   — [[target#anchor|alias]] round-trips through serializer
 *   TC-STRESS-ROUND-EMBED   — ![[target]] round-trips through serializer
 *   TC-STRESS-FULL          — Full loan-orchestration.md: all valid links valid, broken broken
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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
  await page.waitForTimeout(100);
}

async function getMarkdown(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).editorAPI.getMarkdown());
}

async function setNoteIndex(
  page: Page,
  ids: string[],
  titles: Record<string, string> = {}
): Promise<void> {
  await page.evaluate(
    ({ ids, titles }) => {
      (window as any).editorAPI.setNoteIndex(ids, titles);
    },
    { ids, titles }
  );
  await page.waitForTimeout(50);
}

// ---------------------------------------------------------------------------
// Stress vault note index — all valid files in the vault
// ---------------------------------------------------------------------------

const VAULT_NOTES = [
  'architecture/api-gateway',
  'architecture/message-queue',
  'architecture/system-overview',
  'credit-policy/credit-policy-overview',
  'credit-policy/dti-rules',
  'credit-policy/ltv-guidelines',
  'credit-policy/tier-matrix',
  'dealership/dealer-network',
  'dealership/dealer-submission-format',
  'dealership/flat-file-import',
  'decisions/approval-workflow',
  'decisions/counter-offer',
  'decisions/decline-reasons',
  'decisions/document-generation',
  'equifax/credit-score-mapping',
  'equifax/equifax-integration',
  'equifax/soft-pull-vs-hard-pull',
  'workflow/adjudication-engine',
  'workflow/loan-orchestration',
  'workflow/stipulation-checklist',
  'workflow/transaction-intake',
  // Non-markdown files
  'data/dealer-codes.txt',
  'data/error-codes.txt',
  'data/rate-sheet-2024-q4.csv',
  'data/sample-transactions.csv',
];

const VAULT_TITLES: Record<string, string> = {
  'architecture/api-gateway': 'API Gateway',
  'architecture/message-queue': 'Message Queue',
  'architecture/system-overview': 'System Overview',
  'credit-policy/credit-policy-overview': 'Credit Policy Overview',
  'credit-policy/dti-rules': 'DTI Rules',
  'credit-policy/ltv-guidelines': 'LTV Guidelines',
  'credit-policy/tier-matrix': 'Risk Tier Matrix',
  'dealership/dealer-network': 'Dealer Network',
  'dealership/dealer-submission-format': 'Dealer Submission Format',
  'dealership/flat-file-import': 'Flat File Import',
  'decisions/approval-workflow': 'Approval Workflow',
  'decisions/counter-offer': 'Counter Offer',
  'decisions/decline-reasons': 'Decline Reasons',
  'decisions/document-generation': 'Document Generation',
  'equifax/credit-score-mapping': 'Credit Score Mapping',
  'equifax/equifax-integration': 'Equifax Integration',
  'equifax/soft-pull-vs-hard-pull': 'Soft Pull vs Hard Pull',
  'workflow/adjudication-engine': 'Adjudication Engine',
  'workflow/loan-orchestration': 'Loan Orchestration Flow',
  'workflow/stipulation-checklist': 'Stipulation Checklist',
  'workflow/transaction-intake': 'Transaction Intake',
  'data/dealer-codes.txt': 'dealer-codes.txt',
  'data/error-codes.txt': 'error-codes.txt',
  'data/rate-sheet-2024-q4.csv': 'rate-sheet-2024-q4.csv',
  'data/sample-transactions.csv': 'sample-transactions.csv',
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Wikilink Stress Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WIKILINKS_PAGE);
    await waitForEditor(page);
    await setNoteIndex(page, VAULT_NOTES, VAULT_TITLES);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-001: Basic [[target]] renders as wikilink node
  // -------------------------------------------------------------------------
  test('TC-STRESS-001: basic [[target]] renders as wikilink node', async ({ page }) => {
    await setMarkdown(page, 'See [[workflow/loan-orchestration]] for details.');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'workflow/loan-orchestration');
    await expect(link).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-002: Aliased [[target|alias]] shows alias text
  // -------------------------------------------------------------------------
  test('TC-STRESS-002: aliased [[target|alias]] shows alias text, not identifier', async ({
    page,
  }) => {
    await setMarkdown(
      page,
      'Submit via [[workflow/transaction-intake|dealer submission]] process.'
    );

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'workflow/transaction-intake');
    await expect(link).toHaveText('dealer submission');
    await expect(link).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-003: Heading anchor [[target#section]] resolves via base identifier
  // -------------------------------------------------------------------------
  test('TC-STRESS-003: [[target#section]] resolves valid when base note exists', async ({
    page,
  }) => {
    await setMarkdown(page, 'See [[credit-policy/tier-matrix#super-prime]] for rates.');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'credit-policy/tier-matrix#super-prime');
    await expect(link).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-004: Anchor + alias [[target#section|alias]]
  // -------------------------------------------------------------------------
  test('TC-STRESS-004: [[target#section|alias]] shows alias and resolves valid', async ({
    page,
  }) => {
    await setMarkdown(page, 'Based on [[credit-policy/tier-matrix#super-prime|Tier assignment]].');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'credit-policy/tier-matrix#super-prime');
    await expect(link).toHaveText('Tier assignment');
    await expect(link).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-005: Broken link [[missing]] shows wikilink--broken class
  // -------------------------------------------------------------------------
  test('TC-STRESS-005: [[broken-target]] renders as broken', async ({ page }) => {
    await setMarkdown(page, 'The [[workflow/risk-scoring]] module is unimplemented.');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'workflow/risk-scoring');
    await expect(link).toHaveClass(/wikilink--broken/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-006: Non-markdown file target [[data/file.csv]]
  // -------------------------------------------------------------------------
  test('TC-STRESS-006: non-markdown [[data/file.csv]] resolves if in index', async ({ page }) => {
    await setMarkdown(page, 'Rate data is in [[data/rate-sheet-2024-q4.csv]].');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'data/rate-sheet-2024-q4.csv');
    await expect(link).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-007: Embedded ![[file]] renders with wikilink--embedded class
  // -------------------------------------------------------------------------
  test('TC-STRESS-007: ![[file]] renders with wikilink--embedded class', async ({ page }) => {
    await setMarkdown(page, 'Embed: ![[data/rate-sheet-2024-q4.csv]]');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('data-wikilink-id', 'data/rate-sheet-2024-q4.csv');
    await expect(link).toHaveAttribute('data-wikilink-embedded', '');
    await expect(link).toHaveClass(/wikilink--embedded/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-008: Broken anchor [[valid-note#nonexistent-section]] → valid
  // (anchor existence is not validated, only the base note)
  // -------------------------------------------------------------------------
  test('TC-STRESS-008: [[valid-note#missing-section]] resolves valid (base exists)', async ({
    page,
  }) => {
    await setMarkdown(page, 'See [[credit-policy/tier-matrix#platinum]] for details.');

    const link = page.locator('[data-wikilink]');
    await expect(link).toBeVisible();
    // base note (tier-matrix) IS in the index → valid
    await expect(link).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-ROUND-ALIAS: [[target|alias]] round-trips
  // -------------------------------------------------------------------------
  test('TC-STRESS-ROUND-ALIAS: [[target|alias]] round-trips through serializer', async ({
    page,
  }) => {
    const md = 'Check the [[equifax/equifax-integration|Equifax integration]] now.';
    await setMarkdown(page, md);
    const out = await getMarkdown(page);
    expect(out).toContain('[[equifax/equifax-integration|Equifax integration]]');
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-ROUND-ANCHOR: [[target#anchor]] round-trips
  // -------------------------------------------------------------------------
  test('TC-STRESS-ROUND-ANCHOR: [[target#anchor]] round-trips through serializer', async ({
    page,
  }) => {
    const md = 'See [[credit-policy/dti-rules#super-prime]] for limits.';
    await setMarkdown(page, md);
    const out = await getMarkdown(page);
    expect(out).toContain('[[credit-policy/dti-rules#super-prime]]');
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-ROUND-COMBO: [[target#anchor|alias]] round-trips
  // -------------------------------------------------------------------------
  test('TC-STRESS-ROUND-COMBO: [[target#anchor|alias]] round-trips through serializer', async ({
    page,
  }) => {
    const md =
      'Based on [[decisions/decline-reasons#adverse-action-notices|adverse action letter]].';
    await setMarkdown(page, md);
    const out = await getMarkdown(page);
    expect(out).toContain(
      '[[decisions/decline-reasons#adverse-action-notices|adverse action letter]]'
    );
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-ROUND-EMBED: ![[target]] round-trips
  // -------------------------------------------------------------------------
  test('TC-STRESS-ROUND-EMBED: ![[target]] round-trips through serializer', async ({ page }) => {
    const md = 'Data: ![[data/sample-transactions.csv]]';
    await setMarkdown(page, md);
    const out = await getMarkdown(page);
    expect(out).toContain('![[data/sample-transactions.csv]]');
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-FULL: Full loan-orchestration.md document
  // -------------------------------------------------------------------------
  test('TC-STRESS-FULL: loan-orchestration.md — valid links valid, broken broken', async ({
    page,
  }) => {
    const vaultPath = path.join(
      __dirname,
      '../../../specs/040-wikilinks/stress_test/workflow/loan-orchestration.md'
    );
    const md = fs.readFileSync(vaultPath, 'utf-8');

    await setMarkdown(page, md);
    // Allow rendering
    await page.waitForTimeout(200);

    const allLinks = page.locator('[data-wikilink]');
    const count = await allLinks.count();
    expect(count).toBeGreaterThan(5);

    // Known valid identifiers in paragraph/blockquote context (not in tables or lists,
    // since the minimal harness only includes paragraph + blockquote extensions)
    const validIds = [
      'workflow/transaction-intake',
      'decisions/document-generation',
      'workflow/adjudication-engine',
      'credit-policy/credit-policy-overview',
      'equifax/equifax-integration',
      'data/sample-transactions.csv',
    ];
    for (const id of validIds) {
      const link = page.locator(`[data-wikilink-id="${id}"]`).first();
      await expect(link).toHaveClass(/wikilink--valid/, { message: `${id} should be valid` });
    }

    // Known broken identifier in this document
    const brokenLink = page.locator('[data-wikilink-id="workflow/risk-scoring"]');
    await expect(brokenLink).toHaveClass(/wikilink--broken/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-MULTI: multiple wikilink patterns in one paragraph
  // -------------------------------------------------------------------------
  test('TC-STRESS-MULTI: mixed patterns coexist in one document', async ({ page }) => {
    const md = [
      'Basic: [[workflow/loan-orchestration]]',
      'Aliased: [[workflow/transaction-intake|intake]]',
      'Anchored: [[credit-policy/tier-matrix#super-prime]]',
      'Combo: [[credit-policy/tier-matrix#prime|Prime tier]]',
      'Broken: [[workflow/risk-scoring]]',
      'CSV: [[data/sample-transactions.csv]]',
      'Embed: ![[data/rate-sheet-2024-q4.csv]]',
    ].join('\n\n');

    await setMarkdown(page, md);
    await page.waitForTimeout(200);

    // Each paragraph should have exactly one wikilink node
    const allLinks = page.locator('[data-wikilink]');
    expect(await allLinks.count()).toBe(7);

    // Alias text
    const aliasLink = page.locator('[data-wikilink-id="workflow/transaction-intake"]');
    await expect(aliasLink).toHaveText('intake');

    // Anchor+alias text
    const comboLink = page.locator('[data-wikilink-id="credit-policy/tier-matrix#prime"]');
    await expect(comboLink).toHaveText('Prime tier');

    // Broken
    await expect(page.locator('[data-wikilink-id="workflow/risk-scoring"]')).toHaveClass(
      /wikilink--broken/
    );

    // Embedded
    await expect(page.locator('[data-wikilink-id="data/rate-sheet-2024-q4.csv"]')).toHaveClass(
      /wikilink--embedded/
    );
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-TABLE-001: Wikilinks inside GFM table cells render as nodes
  // -------------------------------------------------------------------------
  test('TC-STRESS-TABLE-001: wikilinks in table cells render as nodes, not raw text', async ({
    page,
  }) => {
    const md = [
      '| File | Description |',
      '| ---- | ----------- |',
      '| [[architecture/system-overview]] | High-level platform architecture |',
      '| [[architecture/api-gateway]] | REST/async API layer |',
    ].join('\n');

    await setMarkdown(page, md);
    await page.waitForTimeout(150);

    // Both table-cell wikilinks should render as nodes
    const links = page.locator('[data-wikilink]');
    await expect(links).toHaveCount(2);

    const first = page.locator('[data-wikilink-id="architecture/system-overview"]');
    await expect(first).toBeVisible();
    await expect(first).toHaveClass(/wikilink--valid/);

    const second = page.locator('[data-wikilink-id="architecture/api-gateway"]');
    await expect(second).toBeVisible();
    await expect(second).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-TABLE-002: Broken wikilinks in table cells get broken state
  // -------------------------------------------------------------------------
  test('TC-STRESS-TABLE-002: broken wikilinks in table cells show broken class', async ({
    page,
  }) => {
    const md = [
      '| Link | Status |',
      '| ---- | ------ |',
      '| [[workflow/risk-scoring]] | broken |',
      '| [[workflow/loan-orchestration]] | valid |',
    ].join('\n');

    await setMarkdown(page, md);
    await page.waitForTimeout(150);

    const brokenLink = page.locator('[data-wikilink-id="workflow/risk-scoring"]');
    await expect(brokenLink).toHaveClass(/wikilink--broken/);

    const validLink = page.locator('[data-wikilink-id="workflow/loan-orchestration"]');
    await expect(validLink).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-TABLE-003: Anchor wikilinks in table cells resolve via base id
  // Note: [[target|alias]] uses | which conflicts with GFM table column syntax;
  // alias wikilinks cannot be used inside table cells without escaping.
  // This test verifies anchor wikilinks (which use # not |) work in table cells.
  // -------------------------------------------------------------------------
  test('TC-STRESS-TABLE-003: anchor wikilinks in table cells resolve valid', async ({ page }) => {
    const md = [
      '| Section | Description |',
      '| ------- | ----------- |',
      '| [[credit-policy/tier-matrix#super-prime]] | Top tier |',
      '| [[credit-policy/dti-rules#max-dti]] | DTI cap |',
    ].join('\n');

    await setMarkdown(page, md);
    await page.waitForTimeout(150);

    const tierLink = page.locator('[data-wikilink-id="credit-policy/tier-matrix#super-prime"]');
    await expect(tierLink).toBeVisible();
    await expect(tierLink).toHaveClass(/wikilink--valid/);

    const dtiLink = page.locator('[data-wikilink-id="credit-policy/dti-rules#max-dti"]');
    await expect(dtiLink).toBeVisible();
    await expect(dtiLink).toHaveClass(/wikilink--valid/);
  });

  // -------------------------------------------------------------------------
  // TC-STRESS-LIST-001: Wikilinks inside bullet list items render as nodes
  // -------------------------------------------------------------------------
  test('TC-STRESS-LIST-001: wikilinks in bullet list items render as nodes', async ({ page }) => {
    const md = [
      '- See [[workflow/loan-orchestration]] for orchestration',
      '- Refer to [[credit-policy/tier-matrix]] for tiers',
      '- Broken: [[workflow/risk-scoring]]',
    ].join('\n');

    await setMarkdown(page, md);
    await page.waitForTimeout(150);

    const links = page.locator('[data-wikilink]');
    await expect(links).toHaveCount(3);

    await expect(page.locator('[data-wikilink-id="workflow/loan-orchestration"]')).toHaveClass(
      /wikilink--valid/
    );
    await expect(page.locator('[data-wikilink-id="credit-policy/tier-matrix"]')).toHaveClass(
      /wikilink--valid/
    );
    await expect(page.locator('[data-wikilink-id="workflow/risk-scoring"]')).toHaveClass(
      /wikilink--broken/
    );
  });
});

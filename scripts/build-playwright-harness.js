#!/usr/bin/env node

/**
 * Build Script for Playwright Test Harness
 *
 * Bundles src/__tests__/playwright/harness/editor-harness.ts
 * into src/__tests__/playwright/harness/editor-harness.js so
 * index.html can load it as a plain script (no module bundler needed at runtime).
 *
 * Usage:
 *   node scripts/build-playwright-harness.js
 *   node scripts/build-playwright-harness.js --watch
 */

const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const sharedOptions = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  loader: {
    '.css': 'empty',   // strip CSS imports — not needed for logic tests
    '.ttf': 'empty',
  },
  // TipTap optional peer deps — not used, shim to empty
  external: [
    '@tiptap/extension-collaboration',
    '@tiptap/y-tiptap',
    '@tiptap/extension-node-range',
  ],
};

const entries = [
  {
    entryPoints: [path.resolve(__dirname, '../src/__tests__/playwright/harness/editor-harness.ts')],
    outfile: path.resolve(__dirname, '../src/__tests__/playwright/harness/editor-harness.js'),
    label: 'editor-harness',
  },
  {
    entryPoints: [path.resolve(__dirname, '../src/__tests__/playwright/harness/wikilinks-harness.ts')],
    outfile: path.resolve(__dirname, '../src/__tests__/playwright/harness/wikilinks-harness.js'),
    label: 'wikilinks-harness',
  },
];

async function run() {
  if (isWatch) {
    const ctxs = await Promise.all(
      entries.map(e => esbuild.context({ ...sharedOptions, ...e, label: undefined }))
    );
    await Promise.all(ctxs.map(ctx => ctx.watch()));
    console.log('Watching all harnesses for changes...');
  } else {
    await Promise.all(
      entries.map(async e => {
        const { label, ...opts } = e;
        await esbuild.build({ ...sharedOptions, ...opts });
        console.log(`✅ ${label} built`);
      })
    );
  }
}

run().catch(err => {
  console.error('❌ Harness build failed:', err);
  process.exit(1);
});

# Release Notes - v3.1.0

Date: 2026-05-25

## Highlights

- Major delivery: 040-wikilinks shipped on main, including stress-test architecture corpus and editor integration.
- Wikilinks are now a complete workflow: insert, resolve, preview, navigate, and validate.
- New Word-like Navigation Revamp (041): Headings, References, and local Search tabs in the navigation pane.
- Post-ship polish fixes for wikilink consistency and day-mode hover readability.

## Added

- End-to-end wikilinks feature rollout from Foam/FluxFlow integration to mainline release.
- Stress-test and Playwright harness coverage for wikilinks interactions and rendering snapshots.
- Navigation pane revamp with tabbed sections for document structure and link context.

## Changed

- Wikilink autocomplete now uses @tiptap/suggestion-based insertion flow.
- Navigation search behavior formalized as local (current document) search.
- Styling system hardened to rely on extension-owned theme tokens in webview surfaces.

## Fixed

- Wikilink round-trip and hover-preview reliability improvements.
- Title resolution timing bug where wikilink display text could differ before/after save.
- Day-theme code readability issues inside wikilink hover tooltips.
- Lint/type issues around the wikilink rollout and test harness integration.

## Build and Validation

- Debug build succeeded: extension + webview bundles.
- Settings persistence tests passed during build pipeline.

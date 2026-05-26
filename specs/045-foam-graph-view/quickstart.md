# Quickstart: Implement and Validate Workspace-Scoped Graph View

## Prerequisites

- Branch: `045-foam-graph-view`
- Install dependencies:

```bash
npm install
```

## 1) Build baseline

```bash
npm run build:debug
```

Expected: extension + webview build completes without errors.

## 2) Run focused regression tests first (RED/GREEN safety)

```bash
npx jest src/features/fluxflow/__tests__/stressTestIndexing.test.ts
```

Expected:
- Valid links resolve.
- No malformed unresolved targets with trailing escape artifacts.

## 3) Implement Phase 1 scope/projection changes

- Update workspace context registry and projection scoping in FluxFlow runtime.
- Ensure graph/chat both consume identical open-folder scope filter.
- Preserve indexer/database normalization behavior.

Then run:

```bash
npx jest src/features/fluxflow/__tests__/stressTestIndexing.test.ts
```

## 4) Implement Phase 2 graph host/protocol hardening

- Finalize graph panel update lifecycle.
- Keep toolbar and command palette opening same graph command.
- Add/adjust host behavior tests.

Run relevant tests (new + changed).

## 5) Implement Phase 3 renderer parity work

- Port/adapt Foam-inspired renderer behavior behind stable payload contract.
- Validate node-click opens note and active note highlighting remains accurate.

Run relevant tests (new + changed).

## 6) End-to-end verification

```bash
npm run build:debug
```

Manual checks:
- Open Graph View from toolbar.
- Open Graph View from command palette.
- Change open workspace folders and verify graph scope updates.
- Edit links and save; verify panel refresh.
- Confirm intentional unresolved placeholders remain, malformed placeholders do not.

## 7) Final regression

Run repository-standard test suites required for touched areas before merge.

## Validation Run (2026-05-25)

Executed commands:

```bash
npx jest src/features/fluxflow/__tests__/graphPanelHost.test.ts src/features/fluxflow/__tests__/graphScopeProjection.test.ts src/features/fluxflow/__tests__/graphChatScope.test.ts src/features/fluxflow/__tests__/graphRefreshOnSave.test.ts src/__tests__/graphViewCommandRouting.test.ts src/features/fluxflow/__tests__/stressTestIndexing.test.ts
npm run build:debug
```

Outcome:
- All targeted graph/stress tests passed.
- Debug build passed (settings tests + extension build + webview build).

Remediation performed during validation:
- Fixed graph panel host test singleton cleanup and VS Code mock gaps.
- Tightened typed event bus testability in `events.ts`.

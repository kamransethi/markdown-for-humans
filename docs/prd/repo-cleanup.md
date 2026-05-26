# Repository Cleanup PRD

## Purpose
This document defines the goals, scope, and execution plan for cleaning up the Foam repository. The cleanup effort will improve developer experience, reduce maintenance overhead, and remove outdated artifacts that no longer belong in the repo.

## Scope
- Remove stale or duplicated documentation and roadmap content
- Clean up repository structure, unused scripts, and legacy files
- Validate and simplify workspace configuration
- Ensure tests and CI targets remain stable after cleanup
- Document cleanup actions for future maintainers

## Goals
- ✅ Make the repo easier to navigate
- ✅ Keep only active code, docs, and tooling
- ✅ Reduce confusion for new contributors
- ✅ Preserve functional behavior and test coverage
- ✅ Improve maintenance hygiene

## Cleanup Areas

### 1. Documentation
- Consolidate or remove outdated docs under `docs/`
- Align `docs/` with current Foam architecture and feature set
- Remove broken references to legacy tooling or old release artifacts

### 2. Repository Layout
- Remove unused top-level files and directories
- Ensure `packages/foam-vscode/` and other workspaces contain only active sources
- Validate `tsconfig`, workspace settings, and package references

### 3. Scripts and Tooling
- Remove obsolete or duplicate scripts from `/scripts` and package.json
- Retire legacy release, build, or test helpers that are no longer used
- Confirm remaining commands are documented and functional

### 4. Dependencies
- Audit package dependencies for obvious dead entries
- Remove dependencies only if cleanup is low-risk and does not break the build
- Preserve compatibility with current development and test workflows

### 5. Tests and CI
- Run the full test suite after cleanup
- Fix regressions only when they are directly caused by cleanup actions
- Confirm that `yarn test`, `yarn build`, and extension packaging still work

## Approach

### Phase 1: Audit
- Inventory repo contents and identify stale files
- Compare current docs with active product scope
- Flag items that are candidates for removal or consolidation

### Phase 2: Cleanup
- Remove or archive deprecated docs and scripts
- Refactor workspace metadata and repo configuration
- Update README or contributing guidance as needed

### Phase 3: Validation
- Run tests and linting
- Verify the extension builds successfully
- Review changes for accidental deletions

## Success Metrics
- No broken docs links in `docs/`
- Repo tree contains only active source, test, and documentation files
- `yarn test` passes
- No loss of documented features or required build scripts

## Risks
- Accidentally removing files still needed by build or CI
- Breaking developer setup for current maintainers
- Losing context for workflows that are still in use

## Ownership
- Primary owner: repo maintainer / core team
- Reviewers: contributors familiar with Foam workspace, extension, and docs

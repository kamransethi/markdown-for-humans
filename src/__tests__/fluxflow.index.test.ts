import { isGraphPathExcluded } from '../features/fluxflow/index';

describe('FluxFlow graph index exclusion', () => {
  it('excludes node_modules root and nested node_modules directories', () => {
    expect(isGraphPathExcluded('node_modules')).toBe(true);
    expect(isGraphPathExcluded('node_modules/some-package/readme.md')).toBe(true);
    expect(isGraphPathExcluded('docs/node_modules/package/README.md')).toBe(true);
  });

  it('excludes .node_modules root and nested .node_modules directories', () => {
    expect(isGraphPathExcluded('.node_modules')).toBe(true);
    expect(isGraphPathExcluded('.node_modules/package/README.md')).toBe(true);
    expect(isGraphPathExcluded('src/.node_modules/package/README.md')).toBe(true);
  });

  it('does not exclude paths containing node_modules-like segments in file names', () => {
    expect(isGraphPathExcluded('node_modules_foobar/readme.md')).toBe(false);
    expect(isGraphPathExcluded('src/readme.node_modules.md')).toBe(false);
  });

  it('excludes hidden folders when skipHiddenFolders is enabled', () => {
    expect(isGraphPathExcluded('.git/config')).toBe(true);
    expect(isGraphPathExcluded('src/.vscode/settings.json')).toBe(true);
    expect(isGraphPathExcluded('docs/.hidden/note.md')).toBe(true);
  });
});

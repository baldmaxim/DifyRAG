import { describe, expect, it } from 'vitest';
import { flattenFolderTree } from './folder-tree';

describe('flattenFolderTree', () => {
  const flat = flattenFolderTree();
  const paths = flat.map((f) => f.path);

  it('produces the top-level standard folders', () => {
    expect(paths).toContain('00-project-card');
    expect(paths).toContain('07-finance');
    expect(paths).toContain('99-archive');
  });

  it('produces nested discipline and ks2 paths', () => {
    expect(paths).toContain('05-working-docs/02-by-discipline/AR');
    expect(paths).toContain('05-working-docs/02-by-discipline/KZh');
    expect(paths).toContain('07-finance/03-ks2-ks3/01-customer-ks2');
    expect(paths).toContain('13-materials-on-site/02-upd');
  });

  it('lists every parent before its children', () => {
    for (const folder of flat) {
      if (folder.parentPath) {
        const parentIndex = paths.indexOf(folder.parentPath);
        const selfIndex = paths.indexOf(folder.path);
        expect(parentIndex).toBeGreaterThanOrEqual(0);
        expect(parentIndex).toBeLessThan(selfIndex);
      }
    }
  });

  it('has no duplicate paths', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('is deterministic across runs', () => {
    expect(flattenFolderTree().map((f) => f.path)).toEqual(paths);
  });

  it('derives parentPath from the path', () => {
    const ar = flat.find((f) => f.path === '05-working-docs/02-by-discipline/AR');
    expect(ar?.parentPath).toBe('05-working-docs/02-by-discipline');
    expect(ar?.depth).toBe(2);
  });
});

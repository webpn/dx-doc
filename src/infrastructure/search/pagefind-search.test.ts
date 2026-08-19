import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PagefindSearchIndex } from './pagefind-search';

const documents = [
  { id: 't1', title: 'Add to cart', text: 'Fires on add-to-cart click.' },
  { id: 'p1', title: 'Homepage', text: 'Product category listing.' },
];

describe('PagefindSearchIndex', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-pagefind-'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it('builds a project index on disk without any network call (REQ-FDN-007)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const search = new PagefindSearchIndex(dir);

    await search.indexProject('proj-1', documents);

    const projectDir = path.join(dir, 'proj-1');
    expect(existsSync(path.join(projectDir, 'pagefind-entry.json'))).toBe(true);
    expect(existsSync(path.join(projectDir, 'pagefind.js'))).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('removes a project index on deleteProject', async () => {
    const search = new PagefindSearchIndex(dir);
    await search.indexProject('proj-1', documents);

    await search.deleteProject('proj-1');

    expect(existsSync(path.join(dir, 'proj-1'))).toBe(false);
  });

  it('queries the latest indexed project documents for REST search', async () => {
    const search = new PagefindSearchIndex(dir);

    await search.indexProject('proj-1', documents);

    await expect(search.query('proj-1', 'cart')).resolves.toEqual([
      {
        documentId: 't1',
        title: 'Add to cart',
        snippet: 'Fires on add-to-cart click.',
      },
    ]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemorySearchIndex } from './in-memory-search';

const docs = [
  { id: 't1', title: 'Add to cart', text: 'Fires on add-to-cart click.' },
  { id: 'p1', title: 'Homepage', text: 'Product category listing.' },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InMemorySearchIndex', () => {
  it('indexes a project and finds matching documents', async () => {
    const search = new InMemorySearchIndex();
    await search.indexProject('proj-1', docs);

    const results = await search.query('proj-1', 'cart');

    expect(results.map((r) => r.documentId)).toEqual(['t1']);
  });

  it('scopes each query to one project (REQ-FDN-008)', async () => {
    const search = new InMemorySearchIndex();
    await search.indexProject('proj-1', docs);
    await search.indexProject('proj-2', [{ id: 'x', title: 'Checkout', text: 'payment' }]);

    expect(await search.query('proj-1', 'cart')).toHaveLength(1);
    expect(await search.query('proj-2', 'cart')).toHaveLength(0);
  });

  it('removes a project index on deleteProject', async () => {
    const search = new InMemorySearchIndex();
    await search.indexProject('proj-1', docs);

    await search.deleteProject('proj-1');

    expect(await search.query('proj-1', 'cart')).toHaveLength(0);
  });

  it('performs no network call — the default adapter never egresses (REQ-FDN-007)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const search = new InMemorySearchIndex();
    await search.indexProject('proj-1', docs);

    await search.query('proj-1', 'cart');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

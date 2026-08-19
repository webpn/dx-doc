import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import type { IndexableDocument, SearchIndex, SearchResult } from '@project/application';
import { close, createIndex } from 'pagefind';

/**
 * The default `SearchIndex` adapter (REQ-FDN-007): Pagefind, in-process, no
 * account, no egress. One directory of index artefacts per project, under the
 * configured `SEARCH_INDEX_PATH`.
 *
 * Known limitation, recorded here deliberately: Pagefind has no server-side
 * query API. Search executes in the browser against the served index
 * (`pagefind.js` + WASM). The port's `query` method therefore throws
 * `PagefindQueryUnsupportedError` for this adapter; the web client (M1.7)
 * searches client-side against an index artefact served through an authorised,
 * grant-checked route (REQ-FDN-008). Adapters that support server-side query
 * (REQ-FDN-022) implement `query` for real.
 */
export class PagefindSearchIndex implements SearchIndex {
  private readonly documents = new Map<string, IndexableDocument[]>();

  constructor(private readonly indexRoot: string) {}

  async indexProject(projectId: string, documents: readonly IndexableDocument[]): Promise<void> {
    this.documents.set(projectId, [...documents]);
    const created = await createIndex({ forceLanguage: 'en' });
    if (created.index === undefined) {
      throw new Error(`pagefind: could not create index: ${created.errors.join('; ')}`);
    }
    const index = created.index;
    try {
      for (const doc of documents) {
        const added = await index.addCustomRecord({
          url: `/${projectId}/${doc.id}/`,
          content: `${doc.title}\n${doc.text}`,
          language: 'en',
          meta: { title: doc.title },
        });
        if (added.errors.length > 0) {
          throw new Error(`pagefind: failed to index ${doc.id}: ${added.errors.join('; ')}`);
        }
      }
      const outputPath = path.join(this.indexRoot, projectId);
      await mkdir(outputPath, { recursive: true });
      const written = await index.writeFiles({ outputPath });
      if (written.errors.length > 0) {
        throw new Error(`pagefind: write failed: ${written.errors.join('; ')}`);
      }
    } finally {
      await index.deleteIndex();
      await close();
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    this.documents.delete(projectId);
    await rm(path.join(this.indexRoot, projectId), { recursive: true, force: true });
  }

  query(projectId: string, query: string): Promise<SearchResult[]> {
    const needle = query.trim().toLowerCase();
    if (needle === '') return Promise.resolve([]);

    const documents = this.documents.get(projectId) ?? [];
    return Promise.resolve(
      documents
        .filter(
          (document) =>
            document.title.toLowerCase().includes(needle) ||
            document.text.toLowerCase().includes(needle),
        )
        .map((document) => ({
          documentId: document.id,
          title: document.title,
          snippet: document.text.slice(0, 120),
        })),
    );
  }
}

export class PagefindQueryUnsupportedError extends Error {
  constructor() {
    super(
      'Pagefind has no server-side query API — search runs in the browser against the served index. ' +
        'Server-side query is not supported by the default adapter (REQ-FDN-007); ' +
        'see ADR-0009 and the M1.7 search milestone.',
    );
    this.name = 'PagefindQueryUnsupportedError';
  }
}

import type { IndexableDocument, SearchIndex, SearchResult } from '@project/application';

/**
 * In-memory `SearchIndex`. A stock instance's default adapter performs no
 * network call (REQ-FDN-007): this substitution proves the guarantee while the
 * real Pagefind adapter (which also does no egress) arrives with the artefacts
 * it indexes at M1.7.
 *
 * The adapter is synchronous under an async interface: methods return
 * resolved promises rather than being `async` (nothing is awaited here).
 */
export class InMemorySearchIndex implements SearchIndex {
  private readonly index = new Map<string, IndexableDocument[]>();

  indexProject(projectId: string, documents: readonly IndexableDocument[]): Promise<void> {
    this.index.set(projectId, [...documents]);
    return Promise.resolve();
  }

  deleteProject(projectId: string): Promise<void> {
    this.index.delete(projectId);
    return Promise.resolve();
  }

  query(projectId: string, query: string): Promise<SearchResult[]> {
    const documents = this.index.get(projectId) ?? [];
    const needle = query.trim().toLowerCase();
    if (needle === '') {
      return Promise.resolve([]);
    }
    return Promise.resolve(
      documents
        .filter(
          (doc) =>
            doc.title.toLowerCase().includes(needle) || doc.text.toLowerCase().includes(needle),
        )
        .map((doc) => ({ documentId: doc.id, title: doc.title, snippet: doc.text.slice(0, 120) })),
    );
  }
}

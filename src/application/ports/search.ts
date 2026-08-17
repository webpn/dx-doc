/**
 * Search index port (REQ-FDN-007).
 *
 * Search sits behind this interface. One index per project; scope filtering is
 * applied server-side from the caller's project grants before any artefact or
 * result reaches the client (REQ-FDN-008). The default adapter is Pagefind —
 * in-process, no account, no egress — so a stock instance performs no network
 * call to any search service. Adapters live in `src/infrastructure/`.
 */
export interface IndexableDocument {
  /** Stable identifier of the indexed entity (its immutable internal id). */
  id: string;
  /** Human title, ranked above body text in results. */
  title: string;
  /** Full searchable text of the entity. */
  text: string;
}

export interface SearchResult {
  documentId: string;
  title: string;
  /** Short excerpt of the matching text. */
  snippet: string;
}

export interface SearchIndex {
  /** Replace the whole index for a project with the given documents. */
  indexProject(projectId: string, documents: readonly IndexableDocument[]): Promise<void>;
  /** Remove a project's index entirely. */
  deleteProject(projectId: string): Promise<void>;
  /** Query one project's index, scoped by the caller's grant (REQ-FDN-008). */
  query(projectId: string, query: string): Promise<SearchResult[]>;
}

/** A Page/Screen within a project (REQ-DOM-001); `parentId` builds the hierarchy. */
export interface PageRecord {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  slug: string;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What still references a page, blocking its deletion (ADR-0025). */
export interface PageDeletionBlockers {
  childPages: number;
  trackings: number;
  flowNodes: number;
}

export interface PageRepository {
  createPage(page: PageRecord): Promise<void>;
  getPageById(id: string): Promise<PageRecord | null>;
  getPageByProjectAndSlug(projectId: string, slug: string): Promise<PageRecord | null>;
  /** Idempotency lookup keyed on the orthogonal `custom_id` (REQ-IMP-003). */
  getPageByCustomId(projectId: string, customId: string): Promise<PageRecord | null>;
  /** List all pages for a project to build hierarchy (M1.12). */
  listPagesByProject(projectId: string): Promise<PageRecord[]>;
  /**
   * Applies `page`'s fields. When `expectedUpdatedAt` is provided, the write
   * is atomically guarded by `WHERE updated_at = expectedUpdatedAt`
   * (REQ-AUTH-005, ADR-0016): returns `false` and applies nothing if the row
   * has since changed. When omitted, writes unconditionally and returns
   * `true`.
   */
  updatePage(page: PageRecord, expectedUpdatedAt?: string): Promise<boolean>;
  /** ADR-0025: counts of what would block deletion, checked before it. */
  getPageDeletionBlockers(id: string): Promise<PageDeletionBlockers>;
  deletePage(id: string): Promise<void>;
}

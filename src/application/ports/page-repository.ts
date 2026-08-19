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
  updatePage(page: PageRecord): Promise<void>;
  /** ADR-0025: counts of what would block deletion, checked before it. */
  getPageDeletionBlockers(id: string): Promise<PageDeletionBlockers>;
  deletePage(id: string): Promise<void>;
}

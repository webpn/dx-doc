/**
 * A Page/Screen within a project (REQ-DOM-001); `parentId` builds the hierarchy.
 *
 * The live slug is internal-only (auto-managed-slugs): it is generated from
 * the name by the service, stored in the `slug` column, and never serialized.
 * It travels as a separate `slug` argument on writes, never inside the
 * record, so UUID-only shapes cannot leak it.
 */
export interface PageRecord {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  /**
   * Short behavioural description (REQ-DOM-001), stored as Markdown like every
   * other rich-text field (REQ-AUTH-001). Screenshots are markdown image
   * references to uploaded assets inside this text (REQ-AUTH-002), which is why
   * there is no separate page-to-asset relation. `null` means never described.
   */
  description: string | null;
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
  createPage(page: PageRecord, slug: string): Promise<void>;
  getPageById(id: string): Promise<PageRecord | null>;
  /**
   * Internal-only collision lookup for slug generation (auto-managed-slugs).
   * Never exposed at runtime — routes stay UUID-addressed.
   */
  getPageByProjectAndSlug(projectId: string, slug: string): Promise<PageRecord | null>;
  /** Idempotency lookup keyed on the orthogonal `custom_id` (REQ-IMP-003). */
  getPageByCustomId(projectId: string, customId: string): Promise<PageRecord | null>;
  /** List all pages for a project to build hierarchy (M1.12). */
  listPagesByProject(projectId: string): Promise<PageRecord[]>;
  /**
   * Applies `page`'s fields. When `slug` is provided, the internal slug
   * column is replaced; when omitted, it is left untouched (no-rename
   * updates). When `expectedUpdatedAt` is provided, the write is atomically
   * guarded by `WHERE updated_at = expectedUpdatedAt` (REQ-AUTH-005,
   * ADR-0016): returns `false` and applies nothing if the row has since
   * changed. When omitted, writes unconditionally and returns `true`.
   */
  updatePage(page: PageRecord, slug?: string, expectedUpdatedAt?: string): Promise<boolean>;
  /** ADR-0025: counts of what would block deletion, checked before it. */
  getPageDeletionBlockers(id: string): Promise<PageDeletionBlockers>;
  deletePage(id: string): Promise<void>;
}

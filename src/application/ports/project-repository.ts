import type { Platform } from '../validation/schemas';

/**
 * A Project — one product on one platform (REQ-FDN-003).
 *
 * The live slug is internal-only (auto-managed-slugs): it is generated from
 * the name by the service, stored in the `slug` column, and never serialized.
 * It travels as a separate `slug` argument on writes, never inside the
 * record, so UUID-only shapes cannot leak it.
 */
export interface ProjectRecord {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  icon: string | null;
  platform: Platform;
  tagManager: string | null;
  lifecycleState: 'active' | 'archived';
  integrationSettings: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRepository {
  createProject(project: ProjectRecord, slug: string): Promise<void>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  /**
   * Internal-only collision lookup for slug generation (auto-managed-slugs).
   * Never exposed at runtime — routes stay UUID-addressed.
   */
  getProjectByCompanyAndSlug(companyId: string, slug: string): Promise<ProjectRecord | null>;
  /** Idempotency lookup keyed on the orthogonal `custom_id` (REQ-IMP-003). */
  getProjectByCustomId(companyId: string, customId: string): Promise<ProjectRecord | null>;
  listProjectsForCompany(companyId: string): Promise<ProjectRecord[]>;
  /**
   * Applies `project`'s fields. When `slug` is provided, the internal slug
   * column is replaced; when omitted, it is left untouched (no-rename
   * updates). When `expectedUpdatedAt` is provided, the write is atomically
   * guarded by `WHERE updated_at = expectedUpdatedAt` (REQ-AUTH-005,
   * ADR-0016): returns `false` and applies nothing if the row has since
   * changed. When omitted, writes unconditionally and returns `true`.
   */
  updateProject(
    project: ProjectRecord,
    slug?: string,
    expectedUpdatedAt?: string,
  ): Promise<boolean>;
}

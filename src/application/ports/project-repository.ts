import type { Platform } from '../validation/schemas';

/** A Project — one product on one platform (REQ-FDN-003). */
export interface ProjectRecord {
  id: string;
  companyId: string;
  name: string;
  slug: string;
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
  createProject(project: ProjectRecord): Promise<void>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  getProjectByCompanyAndSlug(companyId: string, slug: string): Promise<ProjectRecord | null>;
  /** Idempotency lookup keyed on the orthogonal `custom_id` (REQ-IMP-003). */
  getProjectByCustomId(companyId: string, customId: string): Promise<ProjectRecord | null>;
  updateProject(project: ProjectRecord): Promise<void>;
}

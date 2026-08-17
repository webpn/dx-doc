import type { Platform } from '@project/application';
import type {
  ProjectRecord,
  ProjectRepository,
} from '@project/application/ports/project-repository';

import type { Db } from './sqlite-kysely';

interface ProjectRow {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  platform: string;
  tag_manager: string | null;
  lifecycle_state: string;
  integration_settings: string | null;
  custom_id: string | null;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    platform: row.platform as Platform,
    tagManager: row.tag_manager,
    lifecycleState: row.lifecycle_state === 'archived' ? 'archived' : 'active',
    integrationSettings: row.integration_settings,
    customId: row.custom_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** SQLite `ProjectRepository` backed by Kysely (ADR-0024). */
export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: Db) {}

  async createProject(project: ProjectRecord): Promise<void> {
    await this.db
      .insertInto('projects')
      .values({
        id: project.id,
        company_id: project.companyId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        icon: project.icon,
        platform: project.platform,
        tag_manager: project.tagManager,
        lifecycle_state: project.lifecycleState,
        integration_settings: project.integrationSettings,
        custom_id: project.customId,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
      })
      .execute();
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    const row = await this.db
      .selectFrom('projects')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toProject(row) : null;
  }

  async getProjectByCompanyAndSlug(companyId: string, slug: string): Promise<ProjectRecord | null> {
    const row = await this.db
      .selectFrom('projects')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('slug', '=', slug)
      .executeTakeFirst();
    return row ? toProject(row) : null;
  }

  async getProjectByCustomId(companyId: string, customId: string): Promise<ProjectRecord | null> {
    const row = await this.db
      .selectFrom('projects')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('custom_id', '=', customId)
      .executeTakeFirst();
    return row ? toProject(row) : null;
  }

  async listProjectsForCompany(companyId: string): Promise<ProjectRecord[]> {
    const rows = await this.db
      .selectFrom('projects')
      .selectAll()
      .where('company_id', '=', companyId)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((r) => toProject(r));
  }

  async updateProject(project: ProjectRecord): Promise<void> {
    await this.db
      .updateTable('projects')
      .set({
        name: project.name,
        slug: project.slug,
        description: project.description,
        icon: project.icon,
        platform: project.platform,
        tag_manager: project.tagManager,
        lifecycle_state: project.lifecycleState,
        integration_settings: project.integrationSettings,
        custom_id: project.customId,
        updated_at: project.updatedAt,
      })
      .where('id', '=', project.id)
      .execute();
  }
}

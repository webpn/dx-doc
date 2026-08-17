import type { Platform } from '@project/application';
import type {
  ProjectRecord,
  ProjectRepository,
} from '@project/application/ports/project-repository';

import type { SqliteDb } from './sqlite';

interface ProjectRow {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  platform: string;
  tagManager: string | null;
  lifecycleState: string;
  integrationSettings: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

function toProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    platform: row.platform as Platform,
    tagManager: row.tagManager,
    lifecycleState: row.lifecycleState === 'archived' ? 'archived' : 'active',
    integrationSettings: row.integrationSettings,
    customId: row.customId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT = `
  SELECT id, company_id AS companyId, name, slug, description, icon, platform,
         tag_manager AS tagManager, lifecycle_state AS lifecycleState,
         integration_settings AS integrationSettings, custom_id AS customId,
         created_at AS createdAt, updated_at AS updatedAt
  FROM projects`;

/** SQLite `ProjectRepository`. Synchronous under an async interface. */
export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: SqliteDb) {}

  createProject(project: ProjectRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO projects (id, company_id, name, slug, description, icon, platform,
                               tag_manager, lifecycle_state, integration_settings, custom_id,
                               created_at, updated_at)
         VALUES (@id, @companyId, @name, @slug, @description, @icon, @platform,
                 @tagManager, @lifecycleState, @integrationSettings, @customId,
                 @createdAt, @updatedAt)`,
      )
      .run({
        id: project.id,
        companyId: project.companyId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        icon: project.icon,
        platform: project.platform,
        tagManager: project.tagManager,
        lifecycleState: project.lifecycleState,
        integrationSettings: project.integrationSettings,
        customId: project.customId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    return Promise.resolve();
  }

  getProjectById(id: string): Promise<ProjectRecord | null> {
    const row = this.db.prepare(`${SELECT} WHERE id = ?`).get(id) as ProjectRow | undefined;
    return Promise.resolve(row === undefined ? null : toProject(row));
  }

  getProjectByCompanyAndSlug(companyId: string, slug: string): Promise<ProjectRecord | null> {
    const row = this.db
      .prepare(`${SELECT} WHERE company_id = ? AND slug = ?`)
      .get(companyId, slug) as ProjectRow | undefined;
    return Promise.resolve(row === undefined ? null : toProject(row));
  }

  getProjectByCustomId(companyId: string, customId: string): Promise<ProjectRecord | null> {
    const row = this.db
      .prepare(`${SELECT} WHERE company_id = ? AND custom_id = ?`)
      .get(companyId, customId) as ProjectRow | undefined;
    return Promise.resolve(row === undefined ? null : toProject(row));
  }

  updateProject(project: ProjectRecord): Promise<void> {
    this.db
      .prepare(
        `UPDATE projects
         SET name = @name, slug = @slug, description = @description, icon = @icon,
             platform = @platform, tag_manager = @tagManager,
             lifecycle_state = @lifecycleState, integration_settings = @integrationSettings,
             custom_id = @customId, updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        icon: project.icon,
        platform: project.platform,
        tagManager: project.tagManager,
        lifecycleState: project.lifecycleState,
        integrationSettings: project.integrationSettings,
        customId: project.customId,
        updatedAt: project.updatedAt,
      });
    return Promise.resolve();
  }
}

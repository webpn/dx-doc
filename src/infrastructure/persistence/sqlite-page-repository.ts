import type { PageRecord, PageRepository } from '@project/application/ports/page-repository';

import type { SqliteDb } from './sqlite';

interface PageRow {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  slug: string;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

function toPage(row: PageRow): PageRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    parentId: row.parentId,
    name: row.name,
    slug: row.slug,
    customId: row.customId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT = `
  SELECT id, project_id AS projectId, parent_id AS parentId, name, slug,
         custom_id AS customId, created_at AS createdAt, updated_at AS updatedAt
  FROM pages`;

/** SQLite `PageRepository`. Synchronous under an async interface. */
export class SqlitePageRepository implements PageRepository {
  constructor(private readonly db: SqliteDb) {}

  createPage(page: PageRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO pages (id, project_id, parent_id, name, slug, custom_id, created_at, updated_at)
         VALUES (@id, @projectId, @parentId, @name, @slug, @customId, @createdAt, @updatedAt)`,
      )
      .run({
        id: page.id,
        projectId: page.projectId,
        parentId: page.parentId,
        name: page.name,
        slug: page.slug,
        customId: page.customId,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      });
    return Promise.resolve();
  }

  getPageById(id: string): Promise<PageRecord | null> {
    const row = this.db.prepare(`${SELECT} WHERE id = ?`).get(id) as PageRow | undefined;
    return Promise.resolve(row === undefined ? null : toPage(row));
  }

  getPageByProjectAndSlug(projectId: string, slug: string): Promise<PageRecord | null> {
    const row = this.db
      .prepare(`${SELECT} WHERE project_id = ? AND slug = ?`)
      .get(projectId, slug) as PageRow | undefined;
    return Promise.resolve(row === undefined ? null : toPage(row));
  }

  getPageByCustomId(projectId: string, customId: string): Promise<PageRecord | null> {
    const row = this.db
      .prepare(`${SELECT} WHERE project_id = ? AND custom_id = ?`)
      .get(projectId, customId) as PageRow | undefined;
    return Promise.resolve(row === undefined ? null : toPage(row));
  }

  updatePage(page: PageRecord): Promise<void> {
    this.db
      .prepare(
        `UPDATE pages SET name = @name, slug = @slug, parent_id = @parentId,
                          custom_id = @customId, updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({
        id: page.id,
        name: page.name,
        slug: page.slug,
        parentId: page.parentId,
        customId: page.customId,
        updatedAt: page.updatedAt,
      });
    return Promise.resolve();
  }
}

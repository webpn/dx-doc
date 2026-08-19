import type {
  PageDeletionBlockers,
  PageRecord,
  PageRepository,
} from '@project/application/ports/page-repository';

import type { Db } from './sqlite-kysely';

async function count(
  db: Db,
  table: 'pages' | 'trackings' | 'flow_nodes',
  column: 'parent_id' | 'page_id',
  id: string,
): Promise<number> {
  const result = await db
    .selectFrom(table)
    .select((eb) => eb.fn.countAll<number | string>().as('count'))
    .where(column, '=', id)
    .executeTakeFirstOrThrow();
  return Number(result.count);
}

interface PageRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  custom_id: string | null;
  created_at: string;
  updated_at: string;
}

function toPage(row: PageRow): PageRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    customId: row.custom_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** SQLite `PageRepository` backed by Kysely (ADR-0024). */
export class SqlitePageRepository implements PageRepository {
  constructor(private readonly db: Db) {}

  async createPage(page: PageRecord): Promise<void> {
    await this.db
      .insertInto('pages')
      .values({
        id: page.id,
        project_id: page.projectId,
        parent_id: page.parentId,
        name: page.name,
        slug: page.slug,
        custom_id: page.customId,
        created_at: page.createdAt,
        updated_at: page.updatedAt,
      })
      .execute();
  }

  async getPageById(id: string): Promise<PageRecord | null> {
    const row = await this.db
      .selectFrom('pages')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toPage(row) : null;
  }

  async getPageByProjectAndSlug(projectId: string, slug: string): Promise<PageRecord | null> {
    const row = await this.db
      .selectFrom('pages')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('slug', '=', slug)
      .executeTakeFirst();
    return row ? toPage(row) : null;
  }

  async getPageByCustomId(projectId: string, customId: string): Promise<PageRecord | null> {
    const row = await this.db
      .selectFrom('pages')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('custom_id', '=', customId)
      .executeTakeFirst();
    return row ? toPage(row) : null;
  }

  async updatePage(page: PageRecord): Promise<void> {
    await this.db
      .updateTable('pages')
      .set({
        name: page.name,
        slug: page.slug,
        parent_id: page.parentId,
        custom_id: page.customId,
        updated_at: page.updatedAt,
      })
      .where('id', '=', page.id)
      .execute();
  }

  /** ADR-0025: a page blocks deletion if anything still depends on it. */
  async getPageDeletionBlockers(id: string): Promise<PageDeletionBlockers> {
    const [childPages, trackings, flowNodes] = await Promise.all([
      count(this.db, 'pages', 'parent_id', id),
      count(this.db, 'trackings', 'page_id', id),
      count(this.db, 'flow_nodes', 'page_id', id),
    ]);
    return { childPages, trackings, flowNodes };
  }

  async deletePage(id: string): Promise<void> {
    await this.db.deleteFrom('pages').where('id', '=', id).execute();
  }
}

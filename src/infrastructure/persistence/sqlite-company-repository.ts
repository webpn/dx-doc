import type {
  CompanyRecord,
  CompanyRepository,
} from '@project/application/ports/company-repository';
import { Kysely, SqliteDialect } from 'kysely';

import type { Database } from './db-schema';
import type { SqliteDb } from './sqlite';
import type { Db } from './sqlite-kysely';

/**
 * SQLite `CompanyRepository` backed by Kysely (ADR-0024).
 */
export class SqliteCompanyRepository implements CompanyRepository {
  private readonly db: Db;

  constructor(db: Db | SqliteDb) {
    if ('prepare' in db) {
      this.db = new Kysely<Database>({
        dialect: new SqliteDialect({ database: db }),
      });
    } else {
      this.db = db;
    }
  }

  async createCompany(company: CompanyRecord): Promise<void> {
    await this.db
      .insertInto('company')
      .values({
        id: company.id,
        name: company.name,
        slug: company.slug,
        created_at: company.createdAt,
        updated_at: company.updatedAt,
      })
      .execute();
  }

  async getCompanyById(id: string): Promise<CompanyRecord | null> {
    const row = await this.db
      .selectFrom('company')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

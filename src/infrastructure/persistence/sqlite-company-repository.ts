import type {
  CompanyRecord,
  CompanyRepository,
} from '@project/application/ports/company-repository';

import type { Db } from './sqlite-kysely';

/**
 * SQLite `CompanyRepository` backed by Kysely (ADR-0024).
 */
export class SqliteCompanyRepository implements CompanyRepository {
  constructor(private readonly db: Db) {}

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

  async updateCompany(company: CompanyRecord, expectedUpdatedAt?: string): Promise<boolean> {
    let query = this.db
      .updateTable('company')
      .set({
        name: company.name,
        slug: company.slug,
        updated_at: company.updatedAt,
      })
      .where('id', '=', company.id);
    if (expectedUpdatedAt !== undefined) {
      query = query.where('updated_at', '=', expectedUpdatedAt);
    }
    const result = await query.executeTakeFirst();
    return result.numUpdatedRows > 0n;
  }
}

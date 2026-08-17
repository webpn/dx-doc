import type {
  CompanyRecord,
  CompanyRepository,
} from '@project/application/ports/company-repository';

import type { SqliteDb } from './sqlite';

/**
 * SQLite `CompanyRepository`. Synchronous under an async interface.
 */
export class SqliteCompanyRepository implements CompanyRepository {
  constructor(private readonly db: SqliteDb) {}

  createCompany(company: CompanyRecord): Promise<void> {
    this.db
      .prepare(
        'INSERT INTO company (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(company.id, company.name, company.slug, company.createdAt, company.updatedAt);
    return Promise.resolve();
  }

  getCompanyById(id: string): Promise<CompanyRecord | null> {
    const row = this.db
      .prepare(
        'SELECT id, name, slug, created_at AS createdAt, updated_at AS updatedAt FROM company WHERE id = ?',
      )
      .get(id) as CompanyRecord | undefined;
    return Promise.resolve(row ?? null);
  }
}

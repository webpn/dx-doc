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

  /** All companies (REQ-SEC-015), ordered by name — the instance-admin surface only. */
  async listCompanies(): Promise<CompanyRecord[]> {
    const rows = await this.db.selectFrom('company').selectAll().orderBy('name', 'asc').execute();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
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

  async countProjectsForCompany(companyId: string): Promise<number> {
    const row = await this.db
      .selectFrom('projects')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('company_id', '=', companyId)
      .executeTakeFirst();
    return Number(row?.count ?? 0);
  }

  /**
   * True hard delete of a company and everything scoped to it (REQ-SEC-015,
   * ADR-0027) — no undo. Owned rows are removed before their parent
   * (ADR-0025's ownership pattern, applied at the company/project level
   * rather than per catalogue entity): flow/tracking/module composition
   * rows, then the project-scoped and company-scoped entities themselves,
   * then projects, then accounts, then the company row. `audit_logs` is
   * covered by the migration-018 marker, opened before that delete and
   * closed once the cascade finishes — including on failure, so a partial
   * cascade never leaves the append-only trigger permanently propped open.
   */
  async deleteCompanyCascade(companyId: string): Promise<void> {
    const db = this.db;
    const projectIds = db.selectFrom('projects').select('id').where('company_id', '=', companyId);
    const trackingIds = db
      .selectFrom('trackings')
      .select('id')
      .where('project_id', 'in', projectIds);
    const trackingPropertyIds = db
      .selectFrom('tracking_properties')
      .select('id')
      .where('tracking_id', 'in', trackingIds);
    const flowIds = db.selectFrom('flows').select('id').where('project_id', 'in', projectIds);
    const moduleIds = db.selectFrom('modules').select('id').where('company_id', '=', companyId);
    const propertyIds = db
      .selectFrom('properties')
      .select('id')
      .where('company_id', '=', companyId);
    const userIds = db.selectFrom('users').select('id').where('company_id', '=', companyId);

    // Tracking composition (owned rows), leaf-first.
    await db
      .deleteFrom('specific_values')
      .where('tracking_property_id', 'in', trackingPropertyIds)
      .execute();
    await db.deleteFrom('trigger_trackings').where('tracking_id', 'in', trackingIds).execute();
    await db.deleteFrom('tracking_properties').where('tracking_id', 'in', trackingIds).execute();
    await db.deleteFrom('tracking_modules').where('tracking_id', 'in', trackingIds).execute();

    // Flow composition (owned rows), edges before nodes (ADR-0025).
    await db.deleteFrom('flow_edges').where('flow_id', 'in', flowIds).execute();
    await db.deleteFrom('flow_nodes').where('flow_id', 'in', flowIds).execute();

    // Project-scoped entities.
    await db.deleteFrom('trackings').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('triggers').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('flows').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('versions').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('project_shared_passwords').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('pages').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('project_grouping_labels').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('project_grants').where('project_id', 'in', projectIds).execute();
    await db.deleteFrom('navigation_events').where('project_id', 'in', projectIds).execute();

    // Company-scoped catalogue (owned rows first).
    await db.deleteFrom('module_properties').where('module_id', 'in', moduleIds).execute();
    await db.deleteFrom('property_destinations').where('property_id', 'in', propertyIds).execute();
    await db.deleteFrom('free_pages').where('company_id', '=', companyId).execute();
    await db.deleteFrom('tracking_templates').where('company_id', '=', companyId).execute();
    await db.deleteFrom('destinations').where('company_id', '=', companyId).execute();
    await db.deleteFrom('modules').where('company_id', '=', companyId).execute();
    await db.deleteFrom('properties').where('company_id', '=', companyId).execute();
    await db.deleteFrom('assets').where('company_id', '=', companyId).execute();

    // Projects, now that nothing referencing them remains.
    await db.deleteFrom('projects').where('company_id', '=', companyId).execute();

    // Accounts and their own owned rows.
    await db.deleteFrom('api_service_tokens').where('user_id', 'in', userIds).execute();
    await db.deleteFrom('sessions').where('user_id', 'in', userIds).execute();
    await db.deleteFrom('password_reset_tokens').where('user_id', 'in', userIds).execute();
    await db.deleteFrom('instance_admin_stepups').where('company_id', '=', companyId).execute();
    await db.deleteFrom('users').where('company_id', '=', companyId).execute();
    await db.deleteFrom('roles').where('company_id', '=', companyId).execute();

    // Audit history, gated by the migration-018 marker — opened and closed
    // around exactly this one delete, regardless of outcome.
    await db
      .insertInto('company_deletion_markers')
      .values({ company_id: companyId, created_at: new Date().toISOString() })
      .execute();
    try {
      await db.deleteFrom('audit_logs').where('company_id', '=', companyId).execute();
    } finally {
      await db.deleteFrom('company_deletion_markers').where('company_id', '=', companyId).execute();
    }

    await db.deleteFrom('company').where('id', '=', companyId).execute();
  }
}

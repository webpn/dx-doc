import { sql, type Kysely } from 'kysely';

/**
 * Narrow exception to the audit-log append-only guarantee (REQ-SEC-006,
 * migration 014): company deletion is a true hard delete (ADR-0027,
 * `CompanyRepository.deleteCompanyCascade`) that removes "every role, user,
 * session, token and audit entry" belonging to the company being deleted.
 * The blanket `audit_logs_no_delete` trigger from migration 014 would abort
 * that cascade the moment it reached the audit table — append-only has no
 * carve-out today, and a company hard delete is the one caller that needs
 * one.
 *
 * The exception is scoped to exactly that one caller, not opened generally.
 * `company_deletion_markers` records which company IDs currently have a
 * cascade delete in flight: `deleteCompanyCascade` inserts a marker for the
 * company being deleted before touching `audit_logs`, and removes it once
 * the cascade completes. The trigger permits deleting an audit row only when
 * its own `company_id` has an open marker; every other delete — including
 * one attempted with no marker open at all, or one whose row's `company_id`
 * belongs to a *different* company than any open marker — still aborts
 * exactly as before. A NULL `company_id` (company-less audit entries, e.g.
 * instance-admin actions per migration 012) never matches a marker and stays
 * protected unconditionally: company deletion has no reason to touch an
 * audit entry that does not belong to a company.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('company_deletion_markers')
    .addColumn('company_id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await sql`DROP TRIGGER audit_logs_no_delete`.execute(db);

  await sql`
    CREATE TRIGGER audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'audit_logs are append-only')
      WHERE OLD.company_id IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM company_deletion_markers WHERE company_id = OLD.company_id
         );
    END;
  `.execute(db);
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

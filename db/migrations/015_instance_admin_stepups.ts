import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Instance-admin step-up windows (ADR-0027). An instance administrator is
  // permanently company-less by REQ-SEC-014's no-implied-content-access rule,
  // so `canInCompany`'s membership test can never admit them. A row here is an
  // explicit, expiring authorisation fact — the administrator re-authenticated
  // in order to administer this one company, until `expires_at`.
  //
  // The user's `company_id` is never mutated: that invariant is what this
  // table exists to avoid breaking. Expiry is enforced on read, so a missed
  // cleanup cannot silently extend anyone's authorisation.
  await db.schema
    .createTable('instance_admin_stepups')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'char(36)', (col) => col.references('users.id').notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'text', (col) => col.notNull())
    // One window per administrator per company: re-opening replaces rather
    // than accumulating, so "is a window open?" has one answer.
    .addUniqueConstraint('instance_admin_stepups_user_company_unique', ['user_id', 'company_id'])
    .execute();

  // The only read path is (user_id, company_id, expires_at) — see
  // REQ-NFR-015 on not leaving lookups as table scans.
  await db.schema
    .createIndex('instance_admin_stepups_lookup')
    .on('instance_admin_stepups')
    .columns(['user_id', 'company_id', 'expires_at'])
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

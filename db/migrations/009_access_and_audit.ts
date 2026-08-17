import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. project_shared_passwords (REQ-SEC-005)
  await db.schema
    .createTable('project_shared_passwords')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('label', 'text')
    .addColumn('expires_at', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // 2. audit_logs (REQ-SEC-006)
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('actor_id', 'text', (col) => col.notNull()) // userId or 'shared-password:<id>' or 'agent'
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('entity_type', 'text', (col) => col.notNull())
    .addColumn('entity_id', 'text')
    .addColumn('details_json', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

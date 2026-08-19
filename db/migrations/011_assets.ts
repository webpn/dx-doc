import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Uploaded images (REQ-IMP-004, REQ-AUTH-002, ADR-0026). company_id/project_id
  // mirror the tenancy scoping every other R1 entity carries; custom_id makes a
  // repeated import upload idempotent (REQ-IMP-003) — a match returns the
  // existing row unchanged rather than re-processing (ADR-0026).
  await db.schema
    .createTable('assets')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('custom_id', 'varchar')
    .addColumn('storage_key', 'text', (col) => col.notNull())
    .addColumn('content_type', 'text', (col) => col.notNull())
    .addColumn('size_bytes', 'integer', (col) => col.notNull())
    .addColumn('width', 'integer', (col) => col.notNull())
    .addColumn('height', 'integer', (col) => col.notNull())
    .addColumn('original_filename', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('assets_project_custom_id_unique', ['project_id', 'custom_id'])
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

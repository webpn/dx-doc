import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. versions (REQ-VER-001, REQ-VER-004)
  await db.schema
    .createTable('versions')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('version_number', 'integer', (col) => col.notNull())
    .addColumn('title', 'text')
    .addColumn('release_notes', 'text')
    .addColumn('changelog_json', 'text', (col) => col.notNull()) // generated diff changelog
    .addColumn('snapshot_json', 'text', (col) => col.notNull()) // full immutable state snapshot (ADR-0005)
    .addColumn('created_by', 'char(36)', (col) => col.references('users.id').notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('versions_project_number_unique', ['project_id', 'version_number'])
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

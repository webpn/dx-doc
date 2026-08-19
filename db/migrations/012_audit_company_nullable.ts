import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Make audit_logs.company_id nullable (M1.14, REQ-SEC-006). Instance-admin-flag
  // operations and company-less login/logout are audited; the actor is company-less
  // by design (REQ-SEC-013/014). SQLite cannot ALTER COLUMN directly; rebuild the table.
  await db.schema
    .createTable('audit_logs_new')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id'))
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('actor_id', 'text', (col) => col.notNull())
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('entity_type', 'text', (col) => col.notNull())
    .addColumn('entity_id', 'text')
    .addColumn('details_json', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('actor_kind', 'text', (col) => col.notNull().defaultTo(sql`'session'`))
    .execute();

  await sql`
    INSERT INTO audit_logs_new (id, company_id, project_id, actor_id, action, entity_type, entity_id, details_json, created_at, actor_kind)
    SELECT id, company_id, project_id, actor_id, action, entity_type, entity_id, details_json, created_at, actor_kind
    FROM audit_logs
  `.execute(db);

  await db.schema.dropTable('audit_logs').execute();
  await db.schema.alterTable('audit_logs_new').renameTo('audit_logs').execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

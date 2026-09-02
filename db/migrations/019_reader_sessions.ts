import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // A reader is not a user account (D21). Rebuild the small session table so
  // reader sessions can carry project scope without weakening user auth.
  await db.schema
    .createTable('sessions_new')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'char(36)', (col) => col.references('users.id'))
    .addColumn('token_hash', 'char(64)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('actor_kind', 'text', (col) => col.notNull().defaultTo('session'))
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .execute();

  await sql`
    INSERT INTO sessions_new (id, user_id, token_hash, expires_at, created_at)
    SELECT id, user_id, token_hash, expires_at, created_at FROM sessions
  `.execute(db);

  await db.schema.dropTable('sessions').execute();
  await db.schema.alterTable('sessions_new').renameTo('sessions').execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'char(36)', (col) => col.references('users.id').notNull())
    .addColumn('token_hash', 'char(64)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable('users')
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(sql`TRUE`))
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

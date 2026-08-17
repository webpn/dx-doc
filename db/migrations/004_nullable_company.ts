import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // SQLite cannot alter column nullability directly.
  // Rebuild users table with nullable company_id (ADR-0015, ADR-0024).
  await db.schema
    .createTable('users_new')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id'))
    .addColumn('role_id', 'char(36)', (col) => col.references('roles.id'))
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('password_hash', 'text')
    .addColumn('name', 'text')
    .addColumn('instance_admin', 'boolean', (col) => col.notNull().defaultTo(sql`FALSE`))
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(sql`TRUE`))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('users_new_company_email_unique', ['company_id', 'email'])
    .execute();

  await sql`
    INSERT INTO users_new (id, company_id, role_id, email, password_hash, name, instance_admin, active, created_at, updated_at)
    SELECT id, company_id, role_id, email, password_hash, name, instance_admin, active, created_at, updated_at
    FROM users
  `.execute(db);

  await db.schema.dropTable('users').execute();
  await db.schema.alterTable('users_new').renameTo('users').execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // Service-account API tokens (REQ-API-009): bound to a user identity, with
  // their own lifecycle (issue/list/revoke/expiry) independent of the owner's
  // session. Only the SHA-256 of the token is stored — the same rule as
  // session and reset tokens — so a leaked row cannot mint a usable token.
  await db.schema
    .createTable('api_service_tokens')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'char(36)', (col) => col.references('users.id').notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('token_hash', 'char(64)', (col) => col.notNull().unique())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'text', (col) => col.notNull())
    .addColumn('revoked_at', 'text')
    .execute();

  // Audit entries distinguish a human-session actor from a service-token actor
  // (REQ-API-009 acceptance: token use is attributed as a distinct actor kind).
  // Existing rows default to 'session'; per-event attribution surfaces from
  // M1.14 (REQ-SEC-006) once audit coverage reaches the write paths.
  await db.schema
    .alterTable('audit_logs')
    .addColumn('actor_kind', 'text', (col) => col.notNull().defaultTo(sql`'session'`))
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

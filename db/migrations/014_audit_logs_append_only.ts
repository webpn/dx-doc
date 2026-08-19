import { sql, type Kysely } from 'kysely';

/** Enforce REQ-SEC-006 append-only audit history at the database boundary. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'audit_logs are append-only');
    END;
  `.execute(db);

  await sql`
    CREATE TRIGGER audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'audit_logs are append-only');
    END;
  `.execute(db);
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

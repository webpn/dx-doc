import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

/**
 * Migration 018: the narrow, marker-gated exception to the audit-logs
 * append-only trigger (migration 014) that a company hard delete
 * (`deleteCompanyCascade`, ADR-0027) needs to remove its own audit history.
 * Exercised directly against the trigger, independent of the repository
 * method, so the SQL-level contract is pinned regardless of how the
 * repository is implemented.
 */
describe('audit_logs delete exception for in-flight company deletion (migration 018)', () => {
  let dir: string;
  let connection: Connection;

  const t = (): string => new Date().toISOString();

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-audit-exception-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  async function seedCompany(companyId: string): Promise<void> {
    await connection.kysely
      .insertInto('company')
      .values({ id: companyId, name: companyId, slug: companyId, created_at: t(), updated_at: t() })
      .execute();
  }

  async function seedAuditEntry(id: string, companyId: string | null): Promise<void> {
    await connection.kysely
      .insertInto('audit_logs')
      .values({
        id,
        company_id: companyId,
        project_id: null,
        actor_id: 'actor',
        action: 'test.action',
        entity_type: 'test',
        entity_id: null,
        details_json: null,
        created_at: t(),
        actor_kind: 'session',
      })
      .execute();
  }

  it('still refuses a delete with no marker open (REQ-SEC-006 default)', async () => {
    await seedCompany('c-1');
    await seedAuditEntry('a-1', 'c-1');

    await expect(
      connection.kysely.deleteFrom('audit_logs').where('id', '=', 'a-1').execute(),
    ).rejects.toThrow('audit_logs are append-only');
  });

  it('permits deleting a company’s own audit rows once its deletion marker is open', async () => {
    await seedCompany('c-2');
    await seedAuditEntry('a-2', 'c-2');

    await connection.kysely
      .insertInto('company_deletion_markers')
      .values({ company_id: 'c-2', created_at: t() })
      .execute();

    await expect(
      connection.kysely.deleteFrom('audit_logs').where('id', '=', 'a-2').execute(),
    ).resolves.toBeDefined();

    const remaining = await connection.kysely
      .selectFrom('audit_logs')
      .selectAll()
      .where('id', '=', 'a-2')
      .executeTakeFirst();
    expect(remaining).toBeUndefined();
  });

  it('does not let one company’s open marker delete another company’s audit rows', async () => {
    await seedCompany('c-3');
    await seedCompany('c-4');
    await seedAuditEntry('a-3', 'c-3');
    await seedAuditEntry('a-4', 'c-4');

    // Only c-3's deletion is in flight.
    await connection.kysely
      .insertInto('company_deletion_markers')
      .values({ company_id: 'c-3', created_at: t() })
      .execute();

    await expect(
      connection.kysely.deleteFrom('audit_logs').where('id', '=', 'a-4').execute(),
    ).rejects.toThrow('audit_logs are append-only');

    // c-3's own row is unaffected by the assertion above and still deletable.
    await expect(
      connection.kysely.deleteFrom('audit_logs').where('id', '=', 'a-3').execute(),
    ).resolves.toBeDefined();
  });

  it('never permits deleting a company-less audit row, marker or not', async () => {
    await seedAuditEntry('a-5', null);

    await expect(
      connection.kysely.deleteFrom('audit_logs').where('id', '=', 'a-5').execute(),
    ).rejects.toThrow('audit_logs are append-only');
  });

  it('still refuses updates unconditionally — the exception is delete-only', async () => {
    await seedCompany('c-6');
    await seedAuditEntry('a-6', 'c-6');
    await connection.kysely
      .insertInto('company_deletion_markers')
      .values({ company_id: 'c-6', created_at: t() })
      .execute();

    await expect(
      connection.kysely
        .updateTable('audit_logs')
        .set({ action: 'tampered' })
        .where('id', '=', 'a-6')
        .execute(),
    ).rejects.toThrow('audit_logs are append-only');
  });
});

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { SqliteInstanceAdminStepUpRepository } from './sqlite-instance-admin-stepup-repository';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

function t(): string {
  return new Date().toISOString();
}

/** An ISO timestamp `minutes` from now (negative = in the past). */
function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

describe('SqliteInstanceAdminStepUpRepository (against the real schema, ADR-0027)', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqliteInstanceAdminStepUpRepository;
  let adminId: string;
  let companyAId: string;
  let companyBId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-stepup-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    repo = new SqliteInstanceAdminStepUpRepository(connection.kysely);

    // A company-less instance administrator (REQ-SEC-014) and two companies
    // to open step-ups against.
    adminId = 'u-instance-admin';
    companyAId = 'c0000000-0000-0000-0000-00000000000a';
    companyBId = 'c0000000-0000-0000-0000-00000000000b';

    await connection.kysely
      .insertInto('company')
      .values([
        { id: companyAId, name: 'Acme', slug: 'acme', created_at: t(), updated_at: t() },
        { id: companyBId, name: 'Beta', slug: 'beta', created_at: t(), updated_at: t() },
      ])
      .execute();

    await connection.kysely
      .insertInto('users')
      .values({
        id: adminId,
        company_id: null,
        email: 'admin@instance.test',
        password_hash: 'hash',
        instance_admin: 1,
        created_at: t(),
        updated_at: t(),
      })
      .execute();
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('open-then-get returns the window', async () => {
    const createdAt = t();
    const expiresAt = minutesFromNow(15);
    await repo.openStepUp({
      id: 's-1',
      userId: adminId,
      companyId: companyAId,
      createdAt,
      expiresAt,
    });

    const found = await repo.getActiveStepUp(adminId, companyAId, t());

    expect(found).toEqual({
      id: 's-1',
      userId: adminId,
      companyId: companyAId,
      createdAt,
      expiresAt,
    });
  });

  it('returns null when nothing is open', async () => {
    expect(await repo.getActiveStepUp(adminId, companyAId, t())).toBeNull();
  });

  it('returns null for an EXPIRED window — an expired row is indistinguishable from absent', async () => {
    await repo.openStepUp({
      id: 's-expired',
      userId: adminId,
      companyId: companyAId,
      createdAt: minutesFromNow(-30),
      expiresAt: minutesFromNow(-1),
    });

    expect(await repo.getActiveStepUp(adminId, companyAId, t())).toBeNull();
  });

  it('is scoped — a window for company A is not returned for company B', async () => {
    await repo.openStepUp({
      id: 's-a',
      userId: adminId,
      companyId: companyAId,
      createdAt: t(),
      expiresAt: minutesFromNow(15),
    });

    expect(await repo.getActiveStepUp(adminId, companyBId, t())).toBeNull();
  });

  it('is scoped — a window is not returned for a different user', async () => {
    const otherUserId = 'u-other';
    await connection.kysely
      .insertInto('users')
      .values({
        id: otherUserId,
        company_id: null,
        email: 'other@instance.test',
        password_hash: null,
        instance_admin: 1,
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    await repo.openStepUp({
      id: 's-admin',
      userId: adminId,
      companyId: companyAId,
      createdAt: t(),
      expiresAt: minutesFromNow(15),
    });

    expect(await repo.getActiveStepUp(otherUserId, companyAId, t())).toBeNull();
  });

  it('re-opening replaces rather than duplicating — exactly one row, new expiry wins', async () => {
    await repo.openStepUp({
      id: 's-first',
      userId: adminId,
      companyId: companyAId,
      createdAt: minutesFromNow(-10),
      expiresAt: minutesFromNow(5),
    });

    const secondExpiresAt = minutesFromNow(30);
    await repo.openStepUp({
      id: 's-second',
      userId: adminId,
      companyId: companyAId,
      createdAt: t(),
      expiresAt: secondExpiresAt,
    });

    const found = await repo.getActiveStepUp(adminId, companyAId, t());
    expect(found?.id).toBe('s-second');
    expect(found?.expiresAt).toBe(secondExpiresAt);

    const rows = await connection.kysely
      .selectFrom('instance_admin_stepups')
      .selectAll()
      .where('user_id', '=', adminId)
      .where('company_id', '=', companyAId)
      .execute();
    expect(rows).toHaveLength(1);
  });

  it('listActiveStepUpsForUser returns only unexpired windows across multiple companies', async () => {
    await repo.openStepUp({
      id: 's-active-a',
      userId: adminId,
      companyId: companyAId,
      createdAt: t(),
      expiresAt: minutesFromNow(15),
    });
    await repo.openStepUp({
      id: 's-expired-b',
      userId: adminId,
      companyId: companyBId,
      createdAt: minutesFromNow(-30),
      expiresAt: minutesFromNow(-1),
    });

    const active = await repo.listActiveStepUpsForUser(adminId, t());

    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe('s-active-a');
    expect(active[0]?.companyId).toBe(companyAId);
  });

  it('closeStepUp removes the window', async () => {
    await repo.openStepUp({
      id: 's-close',
      userId: adminId,
      companyId: companyAId,
      createdAt: t(),
      expiresAt: minutesFromNow(15),
    });
    expect(await repo.getActiveStepUp(adminId, companyAId, t())).not.toBeNull();

    await repo.closeStepUp(adminId, companyAId);

    expect(await repo.getActiveStepUp(adminId, companyAId, t())).toBeNull();
  });

  it('closeStepUp is a no-op when nothing is open', async () => {
    await expect(repo.closeStepUp(adminId, companyAId)).resolves.toBeUndefined();
  });
});

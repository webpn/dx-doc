import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { openSqliteConnection, type SqliteDb } from './sqlite';
import { SqliteAccountRepository } from './sqlite-account-repository';

function t(): string {
  return new Date().toISOString();
}

async function mustExist<T>(value: Promise<T | null>, label: string): Promise<T> {
  const resolved = await value;
  if (resolved === null) {
    throw new Error(`${label}: expected a value, got null`);
  }
  return resolved;
}

describe('SqliteAccountRepository (against the real schema)', () => {
  let dir: string;
  let db: SqliteDb;
  let repo: SqliteAccountRepository;
  let companyId: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-account-repo-'));
    db = openSqliteConnection(path.join(dir, 'test.sqlite'));
    applyMigrations(db);
    repo = new SqliteAccountRepository(db);

    // Set up a company and its four roles (REQ-SEC-002) so user/role/grant
    // operations have a tenant context.
    companyId = 'c0000000-0000-0000-0000-000000000001';
    db.prepare(
      'INSERT INTO company (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(companyId, 'Acme', 'acme', t(), t());
    const roleDefs: readonly string[] = ['admin', 'project_manager', 'editor', 'viewer'];
    for (const name of roleDefs) {
      db.prepare(
        'INSERT INTO roles (id, company_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(`role-${name}`, companyId, name, t(), t());
    }
    // A project so grants can be assigned.
    db.prepare(
      'INSERT INTO projects (id, company_id, name, slug, platform, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('p0000000-0000-0000-0000-000000000001', companyId, 'Web', 'web', 'web', t(), t());
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and reads back a user', async () => {
    const input = {
      id: 'u-1',
      companyId,
      email: 'alice@acme.test',
      passwordHash: 'hash',
      createdAt: t(),
    };

    await repo.createUser(input);
    const user = await mustExist(repo.getUserById('u-1'), 'user');

    expect(user.email).toBe('alice@acme.test');
    expect(user.active).toBe(true);
    expect(user.instanceAdmin).toBe(false);
    expect(user.roleId).toBeNull();
    expect(user.name).toBeNull();
  });

  it('finds a user by email scoped to the company', async () => {
    await repo.createUser({
      id: 'u-a',
      companyId,
      email: 'a@acme.test',
      passwordHash: 'x',
      createdAt: t(),
    });

    expect(await repo.getUserByEmail(companyId, 'a@acme.test')).not.toBeNull();
    expect(await repo.getUserByEmail(companyId, 'nope@acme.test')).toBeNull();
  });

  it('returns null when the email exists but not in the queried company', async () => {
    const otherId = 'c9000000-0000-0000-0000-000000000001';
    db.prepare(
      'INSERT INTO company (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(otherId, 'Beta', 'beta', t(), t());
    await repo.createUser({
      id: 'u-x',
      companyId: otherId,
      email: 'x@beta.test',
      passwordHash: null,
      createdAt: t(),
    });

    expect(await repo.getUserByEmail(companyId, 'x@beta.test')).toBeNull();
  });

  it('updates a user (role, instance_admin, deactivation)', async () => {
    const createAt = t();
    await repo.createUser({
      id: 'u-2',
      companyId,
      email: 'bob@acme.test',
      passwordHash: 'h1',
      createdAt: createAt,
    });
    const user = await mustExist(repo.getUserById('u-2'), 'user');

    user.roleId = 'role-editor';
    user.instanceAdmin = true;
    user.active = false;
    user.updatedAt = t();
    await repo.updateUser(user);

    const reloaded = await mustExist(repo.getUserById('u-2'), 'user');
    expect(reloaded.roleId).toBe('role-editor');
    expect(reloaded.instanceAdmin).toBe(true);
    expect(reloaded.active).toBe(false);
  });

  it('lists the four company roles', async () => {
    const roles = await repo.listRolesForCompany(companyId);

    expect(roles.map((r) => r.name).sort()).toEqual([
      'admin',
      'editor',
      'project_manager',
      'viewer',
    ]);
    expect(roles.every((r) => r.companyId === companyId)).toBe(true);
  });

  it("lists a user's project grants with role names", async () => {
    await repo.createUser({
      id: 'u-g',
      companyId,
      email: 'grant@acme.test',
      passwordHash: 'gh',
      createdAt: t(),
    });
    db.prepare(
      'INSERT INTO project_grants (id, project_id, user_id, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('g-1', 'p0000000-0000-0000-0000-000000000001', 'u-g', 'role-editor', t(), t());

    const grants = await repo.listGrantsForUser('u-g');

    expect(grants).toHaveLength(1);
    expect(grants[0]?.projectId).toBe('p0000000-0000-0000-0000-000000000001');
    expect(grants[0]?.roleName).toBe('editor');
  });
});

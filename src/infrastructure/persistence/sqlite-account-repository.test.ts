import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { SqliteAccountRepository } from './sqlite-account-repository';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

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
  let connection: Connection;
  let repo: SqliteAccountRepository;
  let companyId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-account-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    applyMigrations(connection);
    repo = new SqliteAccountRepository(connection.kysely);

    // Set up a company and its four roles (REQ-SEC-002) so user/role/grant
    // operations have a tenant context.
    companyId = 'c0000000-0000-0000-0000-000000000001';
    await connection.kysely
      .insertInto('company')
      .values({
        id: companyId,
        name: 'Acme',
        slug: 'acme',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    const roleDefs: readonly string[] = ['admin', 'project_manager', 'editor', 'viewer'];
    for (const name of roleDefs) {
      await connection.kysely
        .insertInto('roles')
        .values({
          id: `role-${name}`,
          company_id: companyId,
          name,
          created_at: t(),
          updated_at: t(),
        })
        .execute();
    }

    // A project so grants can be assigned.
    await connection.kysely
      .insertInto('projects')
      .values({
        id: 'p0000000-0000-0000-0000-000000000001',
        company_id: companyId,
        name: 'Web',
        slug: 'web',
        platform: 'web',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
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
    await connection.kysely
      .insertInto('company')
      .values({
        id: otherId,
        name: 'Beta',
        slug: 'beta',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
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
    await connection.kysely
      .insertInto('project_grants')
      .values({
        id: 'g-1',
        project_id: 'p0000000-0000-0000-0000-000000000001',
        user_id: 'u-g',
        role_id: 'role-editor',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    const grants = await repo.listGrantsForUser('u-g');

    expect(grants).toHaveLength(1);
    expect(grants[0]?.projectId).toBe('p0000000-0000-0000-0000-000000000001');
    expect(grants[0]?.roleName).toBe('editor');
  });
});

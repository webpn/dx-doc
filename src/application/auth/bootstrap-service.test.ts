import { describe, expect, it } from 'vitest';

import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  NewCompanyRole,
  ProjectGrant,
  UserAccount,
} from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';

import { BootstrapConfigError, BootstrapService } from './bootstrap-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

class FakeHasher implements PasswordHasher {
  hash(plaintext: string): Promise<string> {
    return Promise.resolve(`hash:${plaintext}`);
  }

  verify(plaintext: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hash:${plaintext}`);
  }
}

class FakeAccounts implements AccountRepository {
  users = new Map<string, UserAccount>();
  nextId = 0;

  createUser(input: CreateUserInput): Promise<void> {
    this.users.set(input.id, {
      id: input.id,
      companyId: input.companyId,
      email: input.email,
      passwordHash: input.passwordHash,
      roleId: null,
      name: null,
      instanceAdmin: false,
      active: true,
      passwordMustChange: false,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
    return Promise.resolve();
  }

  getUserById(id: string): Promise<UserAccount | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  getUserByEmail(_companyId: string | null, _email: string): Promise<UserAccount | null> {
    return Promise.resolve(null);
  }

  updateUser(user: UserAccount): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  countUsers(): Promise<number> {
    return Promise.resolve(this.users.size);
  }

  createRole(_role: NewCompanyRole): Promise<void> {
    return Promise.resolve();
  }

  listRolesForCompany(_companyId: string): Promise<CompanyRole[]> {
    return Promise.resolve([]);
  }

  listGrantsForUser(_userId: string): Promise<ProjectGrant[]> {
    return Promise.resolve([]);
  }
}

function buildService(): { accounts: FakeAccounts; bootstrap: BootstrapService } {
  const accounts = new FakeAccounts();
  const bootstrap = new BootstrapService(
    accounts,
    new FakeHasher(),
    () => FIXED_NOW,
    () => 'id-' + String(accounts.nextId++),
  );
  return { accounts, bootstrap };
}

describe('BootstrapService (REQ-SEC-013/014)', () => {
  it('creates a company-less instance administrator on an empty instance', async () => {
    const { accounts, bootstrap } = buildService();

    const result = await bootstrap.bootstrapFirstAdmin({
      email: ' root@dx.test ',
      password: 's3cret',
    });

    expect(result.applied).toBe(true);
    if (!result.applied) {
      throw new Error('expected bootstrap to apply');
    }
    const admin = await accounts.getUserById(result.instanceAdminUserId);
    expect(admin?.instanceAdmin).toBe(true);
    expect(admin?.companyId).toBeNull();
    expect(admin?.email).toBe('root@dx.test');
    expect(admin?.passwordHash).toBe('hash:s3cret');
    // Must change the bootstrap password at first login (REQ-SEC-013).
    expect(admin?.passwordMustChange).toBe(true);
  });

  it('ignores the variables once any user exists — cannot create a second admin', async () => {
    const { accounts, bootstrap } = buildService();
    await bootstrap.bootstrapFirstAdmin({ email: 'root@dx.test', password: 's3cret' });
    // A second run must not create another administrator.
    const result = await bootstrap.bootstrapFirstAdmin({
      email: 'intruder@dx.test',
      password: 'x',
    });

    expect(result).toEqual({ applied: false, reason: 'already_initialized' });
    expect(await accounts.countUsers()).toBe(1);
    const only = [...accounts.users.values()][0];
    expect(only?.email).toBe('root@dx.test');
  });

  it('refuses to run on an empty instance without the bootstrap variables', async () => {
    const { bootstrap } = buildService();

    await expect(
      bootstrap.bootstrapFirstAdmin({ email: undefined, password: undefined }),
    ).rejects.toThrow(BootstrapConfigError);
    await expect(
      bootstrap.bootstrapFirstAdmin({ email: undefined, password: undefined }),
    ).rejects.toThrow(/BOOTSTRAP_ADMIN_EMAIL/);
    await expect(
      bootstrap.bootstrapFirstAdmin({ email: 'x@y.z', password: undefined }),
    ).rejects.toThrow(/BOOTSTRAP_ADMIN_PASSWORD/);
  });
});

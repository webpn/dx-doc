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
import type { SessionRecord, SessionRepository } from '../ports/session-repository';

import { AuthService } from './auth-service';
import { SessionService } from './session-service';

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

class FakeSessions implements SessionRepository {
  save(_session: SessionRecord): Promise<void> {
    return Promise.resolve();
  }
  findByTokenHash(_tokenHash: string): Promise<SessionRecord | null> {
    return Promise.resolve(null);
  }
  deleteByTokenHash(_tokenHash: string): Promise<void> {
    return Promise.resolve();
  }
  deleteAllForUser(_userId: string): Promise<void> {
    return Promise.resolve();
  }
  deleteExpired(_nowIso: string): Promise<void> {
    return Promise.resolve();
  }
}

describe('AuthService.changePassword (REQ-SEC-013)', () => {
  function build(): { accounts: FakeAccounts; auth: AuthService } {
    const accounts = new FakeAccounts();
    const auth = new AuthService(
      accounts,
      new FakeHasher(),
      new SessionService(new FakeSessions(), 1000),
      () => FIXED_NOW,
    );
    return { accounts, auth };
  }

  function seed(
    accounts: FakeAccounts,
    id: string,
    passwordHash: string,
    mustChange: boolean,
  ): void {
    accounts.users.set(id, {
      id,
      companyId: 'c1',
      email: `${id}@acme.test`,
      passwordHash,
      roleId: null,
      name: null,
      instanceAdmin: false,
      active: true,
      passwordMustChange: mustChange,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });
  }

  it('changes the password for a correct current password and clears the must-change flag', async () => {
    const { accounts, auth } = build();
    seed(accounts, 'u1', 'hash:oldpass', true);

    expect(await auth.changePassword('u1', 'oldpass', 'newpass123')).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect(accounts.users.get('u1')?.passwordHash).toBe('hash:newpass123');
    expect(accounts.users.get('u1')?.passwordMustChange).toBe(false);
  });

  it('rejects a wrong current password', async () => {
    const { accounts, auth } = build();
    seed(accounts, 'u1', 'hash:oldpass', true);

    expect(await auth.changePassword('u1', 'nope', 'newpass123')).toEqual({
      ok: false,
      error: { kind: 'invalid_current_password' },
    });
  });

  it('rejects a weak new password', async () => {
    const { accounts, auth } = build();
    seed(accounts, 'u1', 'hash:oldpass', false);

    expect(await auth.changePassword('u1', 'oldpass', 'short')).toEqual({
      ok: false,
      error: { kind: 'weak_password' },
    });
  });

  it('returns not_found for an unknown user', async () => {
    const { auth } = build();

    expect(await auth.changePassword('ghost', 'x', 'newpass123')).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

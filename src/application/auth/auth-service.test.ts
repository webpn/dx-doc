import type { AuditLogEntry } from '@project/domain/entities';
import { describe, expect, it } from 'vitest';

import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  NewCompanyRole,
  NewProjectGrant,
  ProjectGrant,
  UserAccount,
} from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { SessionRecord, SessionRepository } from '../ports/session-repository';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import { AuthService } from './auth-service';
import { SessionService } from './session-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

class FakeAuditLogs implements AuditLogRepository {
  appendLog(_entry: AuditLogEntry): Promise<void> {
    return Promise.resolve();
  }
  listLogsForCompany(_companyId: string, _limit?: number): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }
  listLogsForProject(_projectId: string, _limit?: number): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }
}

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

  getUserByEmail(companyId: string | null, email: string): Promise<UserAccount | null> {
    for (const user of this.users.values()) {
      if (user.companyId === companyId && user.email === email) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  listUsersByEmail(email: string): Promise<UserAccount[]> {
    return Promise.resolve([...this.users.values()].filter((u) => u.email === email));
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

  createGrant(_grant: NewProjectGrant): Promise<void> {
    return Promise.resolve();
  }

  updateGrantRole(_grantId: string, _roleId: string, _updatedAt: string): Promise<void> {
    return Promise.resolve();
  }

  revokeGrant(_grantId: string): Promise<void> {
    return Promise.resolve();
  }

  getGrantForProjectAndUser(_projectId: string, _userId: string): Promise<ProjectGrant | null> {
    return Promise.resolve(null);
  }

  listGrantsForProject(_projectId: string): Promise<ProjectGrant[]> {
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

describe('AuthService.login — resolving an email shared across companies', () => {
  // Email is unique per company (`users_company_email_unique`), never globally.
  // A login that supplies no company must therefore work out which account is
  // meant: an instance admin goes to the master control panel, a single company
  // membership is entered directly, and several memberships require a choice.
  function build(): { accounts: FakeAccounts; auth: AuthService } {
    const accounts = new FakeAccounts();
    const auth = new AuthService(
      accounts,
      new FakeHasher(),
      new SessionService(new FakeSessions(), 1000, new FakeAuditLogs()),
      new FakeAuditLogs(),
      () => FIXED_NOW,
    );
    return { accounts, auth };
  }

  function seedUser(
    accounts: FakeAccounts,
    id: string,
    companyId: string | null,
    opts: { instanceAdmin?: boolean } = {},
  ): void {
    accounts.users.set(id, {
      id,
      companyId,
      email: 'shared@acme.test',
      passwordHash: 'hash:secret123',
      roleId: null,
      name: null,
      instanceAdmin: opts.instanceAdmin ?? false,
      active: true,
      passwordMustChange: false,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });
  }

  it('signs an instance admin into the master control panel when the email is also a company account', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, 'admin', null, { instanceAdmin: true });
    seedUser(accounts, 'member', 'c1');

    const result = await auth.login(null, 'shared@acme.test', 'secret123');
    if (!result.ok) throw new Error(`expected success, got ${result.reason}`);
    // The instance admin wins: same address, but the company-less account is
    // the master control panel and must not be shadowed by a tenant account.
    expect(result.user.id).toBe('admin');
    expect(result.user.instanceAdmin).toBe(true);
    expect(result.user.companyId).toBeNull();
  });

  it('signs a single-company account in without asking for a company id', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, 'member', 'c1');

    const result = await auth.login(null, 'shared@acme.test', 'secret123');
    if (!result.ok) throw new Error(`expected success, got ${result.reason}`);
    expect(result.user.id).toBe('member');
    expect(result.user.companyId).toBe('c1');
  });

  it('asks which company when the email is tied to several, listing only the ones it matches', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, 'member-a', 'c1');
    seedUser(accounts, 'member-b', 'c2');

    const result = await auth.login(null, 'shared@acme.test', 'secret123');
    expect(result).toEqual({
      ok: false,
      reason: 'company_selection_required',
      companyIds: ['c1', 'c2'],
    });
  });

  it('does not ask for a choice when the password is wrong, and never reveals the companies', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, 'member-a', 'c1');
    seedUser(accounts, 'member-b', 'c2');

    // Enumeration guard: a bad password must look exactly like a bad address,
    // so the ambiguity must be resolved only for credentials that actually work.
    expect(await auth.login(null, 'shared@acme.test', 'wrong-password')).toEqual({
      ok: false,
      reason: 'invalid_credentials',
    });
  });

  it('still honours an explicit company id, ignoring the other accounts', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, 'member-a', 'c1');
    seedUser(accounts, 'member-b', 'c2');

    const result = await auth.login('c2', 'shared@acme.test', 'secret123');
    if (!result.ok) throw new Error(`expected success, got ${result.reason}`);
    expect(result.user.id).toBe('member-b');
  });

  it('skips a deactivated account when resolving, rather than counting it', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, 'member-a', 'c1');
    seedUser(accounts, 'member-b', 'c2');
    const disabled = accounts.users.get('member-b');
    if (!disabled) throw new Error('seed failed');
    accounts.users.set('member-b', { ...disabled, active: false });

    // Only one usable account remains, so this must sign in, not ask.
    const result = await auth.login(null, 'shared@acme.test', 'secret123');
    if (!result.ok) throw new Error(`expected success, got ${result.reason}`);
    expect(result.user.id).toBe('member-a');
  });
});

describe('AuthService.changePassword (REQ-SEC-013)', () => {
  function build(): { accounts: FakeAccounts; auth: AuthService } {
    const accounts = new FakeAccounts();
    const auth = new AuthService(
      accounts,
      new FakeHasher(),
      new SessionService(new FakeSessions(), 1000, new FakeAuditLogs()),
      new FakeAuditLogs(),
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

/**
 * The client shell has to know whether the authenticated actor holds the
 * instance-administration capability, because that decides which surface it
 * renders (REQ-SEC-014/015, ADR-0027 — only a holder can create a company or
 * open a step-up). Login is the only round trip that establishes identity, so
 * it has to say. The flag is a capability marker, not a secret: it says what
 * this user may reach, and the server re-checks every call regardless.
 */
describe('AuthService.login exposes the instance-administration capability', () => {
  function build(): { accounts: FakeAccounts; auth: AuthService } {
    const accounts = new FakeAccounts();
    const auth = new AuthService(
      accounts,
      new FakeHasher(),
      new SessionService(new FakeSessions(), 1000, new FakeAuditLogs()),
      new FakeAuditLogs(),
      () => FIXED_NOW,
    );
    return { accounts, auth };
  }

  function seedUser(
    accounts: FakeAccounts,
    overrides: { id: string; companyId: string | null; instanceAdmin: boolean },
  ): void {
    accounts.users.set(overrides.id, {
      id: overrides.id,
      companyId: overrides.companyId,
      email: `${overrides.id}@acme.test`,
      // FakeHasher's convention: the hash is `hash:<password>`.
      passwordHash: 'hash:correct-horse',
      roleId: null,
      name: null,
      instanceAdmin: overrides.instanceAdmin,
      active: true,
      passwordMustChange: false,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });
  }

  it('reports instanceAdmin: true for the company-less instance administrator', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, { id: 'ia1', companyId: null, instanceAdmin: true });

    const result = await auth.login(null, 'ia1@acme.test', 'correct-horse');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({ id: 'ia1', companyId: null, instanceAdmin: true });
    }
  });

  it('reports instanceAdmin: false for an ordinary company user', async () => {
    const { accounts, auth } = build();
    seedUser(accounts, { id: 'u1', companyId: 'c1', instanceAdmin: false });

    const result = await auth.login('c1', 'u1@acme.test', 'correct-horse');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual({ id: 'u1', companyId: 'c1', instanceAdmin: false });
    }
  });
});

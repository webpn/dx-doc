import { describe, expect, it } from 'vitest';

import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  ProjectGrant,
  UserAccount,
} from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from '../ports/reset-token-repository';
import type { SessionRecord, SessionRepository } from '../ports/session-repository';

import { LifecycleService } from './lifecycle-service';
import { PermissionService } from './permissions';
import { hashSessionToken } from './tokens';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');
const TTL_MS = 60 * 60 * 1000;

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
  roles = new Map<string, CompanyRole>();

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
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });
    return Promise.resolve();
  }

  getUserById(id: string): Promise<UserAccount | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  getUserByEmail(companyId: string, email: string): Promise<UserAccount | null> {
    for (const user of this.users.values()) {
      if (user.companyId === companyId && user.email === email) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  updateUser(user: UserAccount): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  listRolesForCompany(companyId: string): Promise<CompanyRole[]> {
    return Promise.resolve([...this.roles.values()].filter((role) => role.companyId === companyId));
  }

  listGrantsForUser(_userId: string): Promise<ProjectGrant[]> {
    return Promise.resolve([]);
  }
}

class FakeSessions implements SessionRepository {
  deletedForUser: string[] = [];
  save(_session: SessionRecord): Promise<void> {
    return Promise.resolve();
  }
  findByTokenHash(_tokenHash: string): Promise<SessionRecord | null> {
    return Promise.resolve(null);
  }
  deleteByTokenHash(_tokenHash: string): Promise<void> {
    return Promise.resolve();
  }
  deleteAllForUser(userId: string): Promise<void> {
    this.deletedForUser.push(userId);
    return Promise.resolve();
  }
  deleteExpired(_nowIso: string): Promise<void> {
    return Promise.resolve();
  }
}

class FakeResetTokens implements PasswordResetTokenRepository {
  tokens = new Map<string, PasswordResetToken>();

  save(token: PasswordResetToken): Promise<void> {
    this.tokens.set(token.tokenHash, token);
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return Promise.resolve(this.tokens.get(tokenHash) ?? null);
  }

  markUsed(id: string, usedAtIso: string): Promise<void> {
    const token = [...this.tokens.values()].find((candidate) => candidate.id === id);
    if (token) {
      token.usedAt = usedAtIso;
    }
    return Promise.resolve();
  }
}

interface Harness {
  accounts: FakeAccounts;
  hasher: FakeHasher;
  resetTokens: FakeResetTokens;
  sessions: FakeSessions;
  lifecycle: LifecycleService;
  adminId: string;
}

function buildHarness(): Harness {
  const accounts = new FakeAccounts();
  const hasher = new FakeHasher();
  const resetTokens = new FakeResetTokens();
  const sessions = new FakeSessions();
  const permissions = new PermissionService(accounts);
  const lifecycle = new LifecycleService(
    accounts,
    hasher,
    resetTokens,
    sessions,
    permissions,
    TTL_MS,
    () => FIXED_NOW,
  );

  accounts.roles.set('role-admin', { id: 'role-admin', companyId: 'c1', name: 'admin' });
  accounts.roles.set('role-viewer', { id: 'role-viewer', companyId: 'c1', name: 'viewer' });
  accounts.roles.set('role-editor', { id: 'role-editor', companyId: 'c1', name: 'editor' });
  accounts.roles.set('role-pm', { id: 'role-pm', companyId: 'c1', name: 'project_manager' });

  function addUser(id: string, email: string, roleId: string | null): void {
    accounts.users.set(id, {
      id,
      companyId: 'c1',
      email,
      passwordHash: null,
      roleId,
      name: null,
      instanceAdmin: false,
      active: true,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });
  }

  addUser('admin', 'admin@acme.test', 'role-admin');
  addUser('viewer', 'viewer@acme.test', 'role-viewer');
  addUser('editor', 'editor@acme.test', 'role-editor');
  addUser('pm', 'pm@acme.test', 'role-pm');

  return { accounts, hasher, resetTokens, sessions, lifecycle, adminId: 'admin' };
}

function setEditorWithPassword(accounts: FakeAccounts, passwordHash: string): void {
  const editor = accounts.users.get('editor');
  if (editor === undefined) {
    throw new Error('editor missing from harness');
  }
  accounts.users.set('editor', { ...editor, passwordHash });
}

function makeInstanceAdmin(accounts: FakeAccounts, userId: string): void {
  const user = accounts.users.get(userId);
  if (user === undefined) {
    throw new Error(`user ${userId} missing from harness`);
  }
  accounts.users.set(userId, { ...user, instanceAdmin: true });
}

describe('LifecycleService — invitation (REQ-SEC-013)', () => {
  it('an Admin invites a user with no role and no grants', async () => {
    const { accounts, lifecycle, adminId } = buildHarness();

    const result = await lifecycle.inviteUser(adminId, 'c1', '  New.User@Acme.Test ');

    expect(result.ok).toBe(true);
    const userId = result.ok ? result.value.userId : '';
    const created = await accounts.getUserById(userId);
    expect(created?.email).toBe('new.user@acme.test');
    expect(created?.roleId).toBeNull();
    expect(await accounts.listGrantsForUser(userId)).toHaveLength(0);
  });

  it('an Editor and Project Manager may invite; a Viewer may not', async () => {
    const { lifecycle } = buildHarness();
    expect((await lifecycle.inviteUser('editor', 'c1', 'a@acme.test')).ok).toBe(true);
    expect((await lifecycle.inviteUser('pm', 'c1', 'a@acme.test')).ok).toBe(true);
    expect(await lifecycle.inviteUser('viewer', 'c1', 'a@acme.test')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('rejects a malformed email', async () => {
    const { lifecycle, adminId } = buildHarness();
    expect(await lifecycle.inviteUser(adminId, 'c1', 'not-an-email')).toEqual({
      ok: false,
      error: { kind: 'invalid_email' },
    });
  });
});

describe('LifecycleService — deactivation (REQ-SEC-013)', () => {
  it('an Admin deactivates a user and ends their sessions', async () => {
    const { accounts, lifecycle, sessions, adminId } = buildHarness();
    const editor = accounts.users.get('editor');
    if (editor === undefined) {
      throw new Error('editor missing from harness');
    }
    accounts.users.set('target', { ...editor, id: 'target' });

    const result = await lifecycle.deactivateUser(adminId, 'c1', 'target');

    expect(result).toEqual({ ok: true, value: { ok: true } });
    expect((await accounts.getUserById('target'))?.active).toBe(false);
    expect(sessions.deletedForUser).toContain('target');
  });

  it('a non-Admin cannot deactivate', async () => {
    const { lifecycle } = buildHarness();
    expect(await lifecycle.deactivateUser('viewer', 'c1', 'editor')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('cannot deactivate a user of another company', async () => {
    const { accounts, lifecycle } = buildHarness();
    accounts.users.set('other', {
      id: 'other',
      companyId: 'c9',
      email: 'o@other.test',
      passwordHash: null,
      roleId: null,
      name: null,
      instanceAdmin: false,
      active: true,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });

    expect(await lifecycle.deactivateUser('admin', 'c1', 'other')).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

describe('LifecycleService — instance-administration capability (REQ-SEC-014)', () => {
  it('an instance admin can grant and revoke the flag', async () => {
    const { accounts, lifecycle, adminId } = buildHarness();
    makeInstanceAdmin(accounts, 'admin');

    expect(await lifecycle.setInstanceAdmin(adminId, 'editor', true)).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect((await accounts.getUserById('editor'))?.instanceAdmin).toBe(true);

    expect(await lifecycle.setInstanceAdmin(adminId, 'editor', false)).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect((await accounts.getUserById('editor'))?.instanceAdmin).toBe(false);
  });

  it('a non-holder cannot change the flag', async () => {
    const { lifecycle } = buildHarness();
    expect(await lifecycle.setInstanceAdmin('admin', 'editor', true)).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('returns not_found for an unknown target', async () => {
    const { accounts, lifecycle } = buildHarness();
    makeInstanceAdmin(accounts, 'admin');

    expect(await lifecycle.setInstanceAdmin('admin', 'ghost', true)).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

describe('LifecycleService — password reset (REQ-SEC-013)', () => {
  it('does not disclose whether an address exists', async () => {
    const { lifecycle } = buildHarness();
    await expect(lifecycle.requestPasswordReset('c1', 'nobody@acme.test')).resolves.toBeUndefined();
    await expect(lifecycle.requestPasswordReset('c1', 'almost@nope')).resolves.toBeUndefined();
  });

  it('issues a token only for an active account with a local password', async () => {
    const { accounts, resetTokens, lifecycle } = buildHarness();
    setEditorWithPassword(accounts, 'hash:secret');

    await lifecycle.requestPasswordReset('c1', 'editor@acme.test');

    expect(resetTokens.tokens.size).toBe(1);
    expect([...resetTokens.tokens.values()][0]?.userId).toBe('editor');
  });

  it('sets the new password and marks the token single-use, then rejects a replay', async () => {
    const { accounts, resetTokens, lifecycle } = buildHarness();
    setEditorWithPassword(accounts, 'hash:oldpass');
    // Seed a token whose raw value we know, so we can replay it.
    await resetTokens.save({
      id: 'rt1',
      userId: 'editor',
      tokenHash: hashSessionToken('known-reset-token'),
      expiresAt: new Date(FIXED_NOW.getTime() + TTL_MS).toISOString(),
      usedAt: null,
      createdAt: FIXED_NOW.toISOString(),
    });

    expect(await lifecycle.resetPassword('known-reset-token', 'newpass123')).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect(accounts.users.get('editor')?.passwordHash).toBe('hash:newpass123');
    expect(resetTokens.tokens.get(hashSessionToken('known-reset-token'))?.usedAt).not.toBeNull();

    expect(await lifecycle.resetPassword('known-reset-token', 'another123')).toEqual({
      ok: false,
      error: { kind: 'invalid_or_expired_token' },
    });
  });

  it('rejects an expired token', async () => {
    const { accounts, resetTokens, lifecycle } = buildHarness();
    setEditorWithPassword(accounts, 'hash:oldpass');
    await resetTokens.save({
      id: 'rt2',
      userId: 'editor',
      tokenHash: hashSessionToken('expired-token'),
      expiresAt: new Date(FIXED_NOW.getTime() - 1000).toISOString(),
      usedAt: null,
      createdAt: FIXED_NOW.toISOString(),
    });

    expect(await lifecycle.resetPassword('expired-token', 'newpass123')).toEqual({
      ok: false,
      error: { kind: 'invalid_or_expired_token' },
    });
  });

  it('rejects a weak new password', async () => {
    const { accounts, resetTokens, lifecycle } = buildHarness();
    setEditorWithPassword(accounts, 'hash:oldpass');
    await resetTokens.save({
      id: 'rt3',
      userId: 'editor',
      tokenHash: hashSessionToken('good-token'),
      expiresAt: new Date(FIXED_NOW.getTime() + TTL_MS).toISOString(),
      usedAt: null,
      createdAt: FIXED_NOW.toISOString(),
    });

    expect(await lifecycle.resetPassword('good-token', 'short')).toEqual({
      ok: false,
      error: { kind: 'weak_password' },
    });
  });
});

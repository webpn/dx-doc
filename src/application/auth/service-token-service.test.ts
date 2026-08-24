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
import type {
  ApiServiceToken,
  NewServiceToken,
  ServiceTokenRepository,
} from '../ports/service-token-repository';

import { ServiceTokenService } from './service-token-service';
import { hashSessionToken } from './tokens';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');
const TTL_MS = 60 * 60 * 1000;

class FakeTokens implements ServiceTokenRepository {
  tokens: ApiServiceToken[] = [];

  create(token: NewServiceToken): Promise<void> {
    this.tokens.push({ ...token, revokedAt: null });
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<ApiServiceToken | null> {
    return Promise.resolve(this.tokens.find((token) => token.tokenHash === tokenHash) ?? null);
  }

  listForUser(userId: string): Promise<ApiServiceToken[]> {
    return Promise.resolve(this.tokens.filter((token) => token.userId === userId));
  }

  revoke(id: string, revokedAtIso: string): Promise<void> {
    const token = this.tokens.find((candidate) => candidate.id === id);
    if (token) {
      token.revokedAt = revokedAtIso;
    }
    return Promise.resolve();
  }
}

class FakeAccounts implements AccountRepository {
  users = new Map<string, UserAccount>();

  listUsersByEmail(email: string): Promise<UserAccount[]> {
    return Promise.resolve([...this.users.values()].filter((u) => u.email === email));
  }

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

function build(): { tokens: FakeTokens; accounts: FakeAccounts; service: ServiceTokenService } {
  const tokens = new FakeTokens();
  const accounts = new FakeAccounts();
  accounts.users.set('u1', {
    id: 'u1',
    companyId: null,
    email: 'owner@dxdoc.test',
    passwordHash: 'h',
    roleId: null,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const service = new ServiceTokenService(
    tokens,
    accounts,
    TTL_MS,
    () => FIXED_NOW,
    () => 'tok-1',
  );
  return { tokens, accounts, service };
}

describe('ServiceTokenService (REQ-API-009, M1.12)', () => {
  it('issues a token bound to the owner: raw value shown once, only its hash stored', async () => {
    const { tokens, service } = build();

    const result = await service.issue('u1', 'import');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected issuance to succeed');
    expect(result.value.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.value.expiresAt).toBe(new Date(FIXED_NOW.getTime() + TTL_MS).toISOString());
    // The store holds only the hash — the raw value never reaches persistence.
    expect(tokens.tokens[0]?.tokenHash).toBe(hashSessionToken(result.value.token));
    expect(tokens.tokens[0]?.name).toBe('import');
  });

  it('refuses to issue a token for a deactivated user', async () => {
    const { accounts, service } = build();
    const user = accounts.users.get('u1');
    if (user === undefined) throw new Error('u1 missing');
    accounts.users.set('u1', { ...user, active: false });

    expect(await service.issue('u1', 'import')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('rejects an empty token name', async () => {
    const { service } = build();
    expect(await service.issue('u1', '   ')).toEqual({
      ok: false,
      error: { kind: 'invalid_input' },
    });
  });

  it('resolves a valid token to the owner and stops resolving after revocation (within one request)', async () => {
    const { service } = build();
    const issued = await service.issue('u1', 'import');
    if (!issued.ok) throw new Error('expected issuance to succeed');
    const token = issued.value.token;

    expect(await service.resolve(token)).toBe('u1');

    await service.revoke('u1', issued.value.tokenId);
    expect(await service.resolve(token)).toBeNull();
  });

  it('stops resolving an expired token', async () => {
    const { tokens, accounts, service } = build();
    const issued = await service.issue('u1', 'import');
    if (!issued.ok) throw new Error('expected issuance to succeed');
    const token = issued.value.token;
    // Advance the clock past expiry against the same token store.
    const later = new ServiceTokenService(
      tokens,
      accounts,
      TTL_MS,
      () => new Date(FIXED_NOW.getTime() + TTL_MS + 1000),
      () => 'tok-2',
    );
    expect(await later.resolve(token)).toBeNull();
  });

  it('stops resolving when the owner is deactivated (within one request)', async () => {
    const { accounts, service } = build();
    const issued = await service.issue('u1', 'import');
    if (!issued.ok) throw new Error('expected issuance to succeed');
    const token = issued.value.token;

    const user = accounts.users.get('u1');
    if (user === undefined) throw new Error('u1 missing');
    accounts.users.set('u1', { ...user, active: false });

    expect(await service.resolve(token)).toBeNull();
  });

  it('lists only the owner tokens and never returns a token value', async () => {
    const { service } = build();
    await service.issue('u1', 'a');
    await service.issue('u1', 'b');

    const list = await service.list('u1');
    expect(list).toHaveLength(2);
    for (const item of list) {
      expect(item).not.toHaveProperty('token');
      expect(item).not.toHaveProperty('tokenHash');
      expect(item.active).toBe(true);
    }
  });

  it('cannot revoke another user token (not found)', async () => {
    const { accounts, service } = build();
    const issued = await service.issue('u1', 'a');
    if (!issued.ok) throw new Error('expected issuance to succeed');
    accounts.users.set('u2', {
      id: 'u2',
      companyId: null,
      email: 'two@dxdoc.test',
      passwordHash: 'h',
      roleId: null,
      name: null,
      instanceAdmin: false,
      active: true,
      passwordMustChange: false,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });

    expect(await service.revoke('u2', issued.value.tokenId)).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

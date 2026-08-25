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
import type { CompanyRecord, CompanyRepository } from '../ports/company-repository';
import type {
  InstanceAdminStepUp,
  InstanceAdminStepUpRepository,
  NewInstanceAdminStepUp,
} from '../ports/instance-admin-stepup-repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import { InstanceAdminStepUpService } from './instance-admin-stepup-service';
import { PermissionService } from './permissions';

const FIXED_NOW = new Date('2026-08-21T12:00:00.000Z');
const TTL_MINUTES = 15;

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

  listUsersByEmail(email: string): Promise<UserAccount[]> {
    return Promise.resolve([...this.users.values()].filter((u) => u.email === email));
  }
  roles = new Map<string, CompanyRole>();
  grants: ProjectGrant[] = [];

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

  createRole(role: NewCompanyRole): Promise<void> {
    this.roles.set(role.id, { id: role.id, companyId: role.companyId, name: role.name });
    return Promise.resolve();
  }

  listRolesForCompany(companyId: string): Promise<CompanyRole[]> {
    return Promise.resolve([...this.roles.values()].filter((role) => role.companyId === companyId));
  }

  listGrantsForUser(userId: string): Promise<ProjectGrant[]> {
    return Promise.resolve(this.grants.filter((grant) => grant.userId === userId));
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

class FakeCompanies implements CompanyRepository {
  companies = new Map<string, CompanyRecord>();

  createCompany(company: CompanyRecord): Promise<void> {
    this.companies.set(company.id, company);
    return Promise.resolve();
  }

  getCompanyById(id: string): Promise<CompanyRecord | null> {
    return Promise.resolve(this.companies.get(id) ?? null);
  }

  listCompanies(): Promise<CompanyRecord[]> {
    return Promise.resolve(
      [...this.companies.values()].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  updateCompany(company: CompanyRecord, expectedUpdatedAt?: string): Promise<boolean> {
    const existing = this.companies.get(company.id);
    if (expectedUpdatedAt !== undefined && existing?.updatedAt !== expectedUpdatedAt) {
      return Promise.resolve(false);
    }
    this.companies.set(company.id, company);
    return Promise.resolve(true);
  }

  deleteCompanyCascade(companyId: string): Promise<void> {
    this.companies.delete(companyId);
    return Promise.resolve();
  }

  countProjectsForCompany(_companyId: string): Promise<number> {
    return Promise.resolve(0);
  }
}

/**
 * Mirrors the in-memory step-up store contract pinned in
 * permissions.test.ts's FakeStepUps — notably that `getActiveStepUp` and
 * `listActiveStepUpsForUser` enforce expiry on read.
 */
class FakeStepUps implements InstanceAdminStepUpRepository {
  windows: InstanceAdminStepUp[] = [];

  openStepUp(stepUp: NewInstanceAdminStepUp): Promise<void> {
    this.windows = this.windows.filter(
      (candidate) =>
        !(candidate.userId === stepUp.userId && candidate.companyId === stepUp.companyId),
    );
    this.windows.push({ ...stepUp });
    return Promise.resolve();
  }

  getActiveStepUp(
    userId: string,
    companyId: string,
    now: string,
  ): Promise<InstanceAdminStepUp | null> {
    const found = this.windows.find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.companyId === companyId &&
        candidate.expiresAt > now,
    );
    return Promise.resolve(found ?? null);
  }

  listActiveStepUpsForUser(userId: string, now: string): Promise<InstanceAdminStepUp[]> {
    return Promise.resolve(
      this.windows.filter((candidate) => candidate.userId === userId && candidate.expiresAt > now),
    );
  }

  closeStepUp(userId: string, companyId: string): Promise<void> {
    this.windows = this.windows.filter(
      (candidate) => !(candidate.userId === userId && candidate.companyId === companyId),
    );
    return Promise.resolve();
  }
}

class FakeAuditLogs implements AuditLogRepository {
  entries: AuditLogEntry[] = [];

  appendLog(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }

  listLogsForCompany(_companyId: string, _limit?: number): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }

  listLogsForProject(_projectId: string, _limit?: number): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }
}

function setupUser(accounts: FakeAccounts, overrides: Partial<UserAccount>): UserAccount {
  const user: UserAccount = {
    id: 'ia1',
    companyId: null,
    email: 'admin@instance.test',
    passwordHash: 'hash:correct-password',
    roleId: null,
    name: null,
    instanceAdmin: true,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
    ...overrides,
  };
  accounts.users.set(user.id, user);
  return user;
}

function seedCompany(companies: FakeCompanies, id: string): void {
  companies.companies.set(id, {
    id,
    name: id,
    slug: id,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
}

function build(): {
  accounts: FakeAccounts;
  companies: FakeCompanies;
  stepUps: FakeStepUps;
  auditLogs: FakeAuditLogs;
  service: InstanceAdminStepUpService;
} {
  const accounts = new FakeAccounts();
  const companies = new FakeCompanies();
  const stepUps = new FakeStepUps();
  const auditLogs = new FakeAuditLogs();
  const permissions = new PermissionService(accounts, stepUps, () => FIXED_NOW);
  const hasher = new FakeHasher();
  let counter = 0;
  const service = new InstanceAdminStepUpService(
    accounts,
    hasher,
    companies,
    stepUps,
    permissions,
    auditLogs,
    TTL_MINUTES,
    () => FIXED_NOW,
    () => 'id-' + String(++counter),
  );
  return { accounts, companies, stepUps, auditLogs, service };
}

describe('InstanceAdminStepUpService (ADR-0027)', () => {
  it('opens a window for a correctly re-authenticated instance admin', async () => {
    const { accounts, companies, stepUps, auditLogs, service } = build();
    setupUser(accounts, {});
    seedCompany(companies, 'c1');

    const result = await service.openStepUp('ia1', 'c1', 'correct-password');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.expiresAt).toBe(
        new Date(FIXED_NOW.getTime() + TTL_MINUTES * 60_000).toISOString(),
      );
    }
    expect(await stepUps.getActiveStepUp('ia1', 'c1', FIXED_NOW.toISOString())).not.toBeNull();

    expect(auditLogs.entries).toHaveLength(1);
    expect(auditLogs.entries[0]).toMatchObject({
      companyId: 'c1',
      projectId: null,
      actorId: 'ia1',
      action: 'instance_admin.stepup_opened',
      entityType: 'company',
      entityId: 'c1',
    });
  });

  it('refuses a non-instance-admin even with the correct password', async () => {
    const { accounts, companies, stepUps, auditLogs, service } = build();
    setupUser(accounts, { instanceAdmin: false });
    seedCompany(companies, 'c1');

    const result = await service.openStepUp('ia1', 'c1', 'correct-password');

    expect(result).toEqual({ ok: false, error: { kind: 'forbidden' } });
    expect(await stepUps.getActiveStepUp('ia1', 'c1', FIXED_NOW.toISOString())).toBeNull();
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('refuses a deactivated instance admin', async () => {
    const { accounts, companies, stepUps, auditLogs, service } = build();
    setupUser(accounts, { active: false });
    seedCompany(companies, 'c1');

    const result = await service.openStepUp('ia1', 'c1', 'correct-password');

    expect(result).toEqual({ ok: false, error: { kind: 'forbidden' } });
    expect(await stepUps.getActiveStepUp('ia1', 'c1', FIXED_NOW.toISOString())).toBeNull();
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('does not open a window on a wrong password (port is never written to)', async () => {
    const { accounts, companies, stepUps, auditLogs, service } = build();
    setupUser(accounts, {});
    seedCompany(companies, 'c1');

    const result = await service.openStepUp('ia1', 'c1', 'wrong-password');

    expect(result).toEqual({ ok: false, error: { kind: 'invalid_password' } });
    expect(stepUps.windows).toHaveLength(0);
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('rejects an unknown company and never writes to the store', async () => {
    const { accounts, stepUps, auditLogs, service } = build();
    setupUser(accounts, {});

    const result = await service.openStepUp('ia1', 'does-not-exist', 'correct-password');

    expect(result).toEqual({ ok: false, error: { kind: 'not_found' } });
    expect(stepUps.windows).toHaveLength(0);
    expect(auditLogs.entries).toHaveLength(0);
  });

  it('opening a window for company A does not open one for company B', async () => {
    const { accounts, companies, stepUps, service } = build();
    setupUser(accounts, {});
    seedCompany(companies, 'c1');
    seedCompany(companies, 'c2');

    await service.openStepUp('ia1', 'c1', 'correct-password');

    expect(await stepUps.getActiveStepUp('ia1', 'c1', FIXED_NOW.toISOString())).not.toBeNull();
    expect(await stepUps.getActiveStepUp('ia1', 'c2', FIXED_NOW.toISOString())).toBeNull();
  });

  it("never mutates the actor's companyId", async () => {
    const { accounts, companies, service } = build();
    setupUser(accounts, {});
    seedCompany(companies, 'c1');

    await service.openStepUp('ia1', 'c1', 'correct-password');

    expect(accounts.users.get('ia1')?.companyId).toBeNull();
  });

  it('closes a window early and appends an audit entry', async () => {
    const { accounts, companies, stepUps, auditLogs, service } = build();
    setupUser(accounts, {});
    seedCompany(companies, 'c1');
    await service.openStepUp('ia1', 'c1', 'correct-password');
    auditLogs.entries = [];

    const result = await service.closeStepUp('ia1', 'c1');

    expect(result).toEqual({ ok: true, value: { ok: true } });
    expect(await stepUps.getActiveStepUp('ia1', 'c1', FIXED_NOW.toISOString())).toBeNull();
    expect(auditLogs.entries).toHaveLength(1);
    expect(auditLogs.entries[0]).toMatchObject({
      companyId: 'c1',
      actorId: 'ia1',
      action: 'instance_admin.stepup_closed',
      entityType: 'company',
      entityId: 'c1',
    });
  });

  it('refuses to close a window for a non-instance-admin', async () => {
    const { accounts, stepUps, service } = build();
    setupUser(accounts, { instanceAdmin: false });
    await stepUps.openStepUp({
      id: 's1',
      userId: 'ia1',
      companyId: 'c1',
      createdAt: FIXED_NOW.toISOString(),
      expiresAt: new Date(FIXED_NOW.getTime() + 15 * 60_000).toISOString(),
    });

    const result = await service.closeStepUp('ia1', 'c1');

    expect(result).toEqual({ ok: false, error: { kind: 'forbidden' } });
    expect(await stepUps.getActiveStepUp('ia1', 'c1', FIXED_NOW.toISOString())).not.toBeNull();
  });

  it("lists only the acting admin's own unexpired windows", async () => {
    const { accounts, stepUps, service } = build();
    setupUser(accounts, {});
    setupUser(accounts, { id: 'ia2' });
    await stepUps.openStepUp({
      id: 's1',
      userId: 'ia1',
      companyId: 'c1',
      createdAt: FIXED_NOW.toISOString(),
      expiresAt: new Date(FIXED_NOW.getTime() + 15 * 60_000).toISOString(),
    });
    await stepUps.openStepUp({
      id: 's2',
      userId: 'ia1',
      companyId: 'c2',
      createdAt: FIXED_NOW.toISOString(),
      expiresAt: new Date(FIXED_NOW.getTime() - 60_000).toISOString(),
    });
    await stepUps.openStepUp({
      id: 's3',
      userId: 'ia2',
      companyId: 'c3',
      createdAt: FIXED_NOW.toISOString(),
      expiresAt: new Date(FIXED_NOW.getTime() + 15 * 60_000).toISOString(),
    });

    const result = await service.listOpenStepUps('ia1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((window) => window.companyId)).toEqual(['c1']);
    }
  });

  it('refuses to list windows for a non-instance-admin', async () => {
    const { accounts, service } = build();
    setupUser(accounts, { instanceAdmin: false });

    const result = await service.listOpenStepUps('ia1');

    expect(result).toEqual({ ok: false, error: { kind: 'forbidden' } });
  });
});

import { describe, expect, it } from 'vitest';

import { PermissionService } from '../auth/permissions';
import { COMPANY_ROLE_NAMES } from '../auth/roles';
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
import type { PasswordHasher } from '../ports/password-hasher';

import { CompanyService } from './company-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

class FakeHasher implements PasswordHasher {
  hash(plaintext: string): Promise<string> {
    return Promise.resolve(`hashed:${plaintext}`);
  }
  verify(_plaintext: string, _hash: string): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class FakeAccounts implements AccountRepository {
  users = new Map<string, UserAccount>();

  listUsersByEmail(email: string): Promise<UserAccount[]> {
    return Promise.resolve([...this.users.values()].filter((u) => u.email === email));
  }
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

function buildHarness(): {
  accounts: FakeAccounts;
  companies: FakeCompanies;
  companyService: CompanyService;
  sysadminId: string;
  plainUserId: string;
  companyAId: string;
  companyAAdminId: string;
  companyAViewerId: string;
  companyBId: string;
  companyBAdminId: string;
} {
  const accounts = new FakeAccounts();
  const companies = new FakeCompanies();
  const permissions = new PermissionService(accounts);
  let counter = 0;
  const companyService = new CompanyService(
    accounts,
    companies,
    permissions,
    () => FIXED_NOW,
    () => 'id-' + String(++counter),
    new FakeHasher(),
  );

  // The instance administrator: company-less, holds the capability.
  const sysadminId = 'sysadmin';
  accounts.users.set(sysadminId, {
    id: sysadminId,
    companyId: null,
    email: 'root@dx.test',
    passwordHash: null,
    roleId: null,
    name: null,
    instanceAdmin: true,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const plainUserId = 'plain';
  accounts.users.set(plainUserId, {
    id: plainUserId,
    companyId: null,
    email: 'plain@dx.test',
    passwordHash: null,
    roleId: null,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });

  // Two tenants, each with an Admin (company A also has a Viewer), for the
  // get/update acceptance below.
  const companyAId = 'company-a';
  companies.companies.set(companyAId, {
    id: companyAId,
    name: 'Acme',
    slug: 'acme',
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const companyAAdminRoleId = 'company-a-admin-role';
  const companyAViewerRoleId = 'company-a-viewer-role';
  accounts.roles.set(companyAAdminRoleId, {
    id: companyAAdminRoleId,
    companyId: companyAId,
    name: 'admin',
  });
  accounts.roles.set(companyAViewerRoleId, {
    id: companyAViewerRoleId,
    companyId: companyAId,
    name: 'viewer',
  });
  const companyAAdminId = 'company-a-admin';
  accounts.users.set(companyAAdminId, {
    id: companyAAdminId,
    companyId: companyAId,
    email: 'admin@acme.test',
    passwordHash: null,
    roleId: companyAAdminRoleId,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const companyAViewerId = 'company-a-viewer';
  accounts.users.set(companyAViewerId, {
    id: companyAViewerId,
    companyId: companyAId,
    email: 'viewer@acme.test',
    passwordHash: null,
    roleId: companyAViewerRoleId,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });

  const companyBId = 'company-b';
  companies.companies.set(companyBId, {
    id: companyBId,
    name: 'Globex',
    slug: 'globex',
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const companyBAdminRoleId = 'company-b-admin-role';
  accounts.roles.set(companyBAdminRoleId, {
    id: companyBAdminRoleId,
    companyId: companyBId,
    name: 'admin',
  });
  const companyBAdminId = 'company-b-admin';
  accounts.users.set(companyBAdminId, {
    id: companyBAdminId,
    companyId: companyBId,
    email: 'admin@globex.test',
    passwordHash: null,
    roleId: companyBAdminRoleId,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });

  return {
    accounts,
    companies,
    companyService,
    sysadminId,
    plainUserId,
    companyAId,
    companyAAdminId,
    companyAViewerId,
    companyBId,
    companyBAdminId,
  };
}

describe('CompanyService.createCompany (REQ-FDN-002, REQ-SEC-015)', () => {
  it('the system admin creates the first company as a stub, seeding its four roles', async () => {
    const { accounts, companies, companyService, sysadminId } = buildHarness();

    const result = await companyService.createCompany(sysadminId, { name: 'Acme', slug: 'acme' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected create to succeed');
    }
    const companyId = result.value.companyId;
    const stub = await companies.getCompanyById(companyId);
    expect(stub?.name).toBe('Acme');
    expect(stub?.slug).toBe('acme');
    const roles = await accounts.listRolesForCompany(companyId);
    expect(roles.map((r) => r.name).sort()).toEqual([...COMPANY_ROLE_NAMES].sort());
  });

  it('optionally provisions the first Admin in the same call (REQ-SEC-014)', async () => {
    const { accounts, companyService, sysadminId } = buildHarness();

    const result = await companyService.createCompany(sysadminId, {
      name: 'Acme',
      slug: 'acme',
      firstAdmin: { email: 'FIRST@ACME.TEST', password: 'correct-horse-battery' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected create to succeed');
    }
    const companyId = result.value.companyId;
    const userId = result.value.firstAdminUserId;
    expect(userId).toBeDefined();
    if (userId === undefined) {
      throw new Error('expected firstAdminUserId to be set');
    }
    const admin = await accounts.getUserById(userId);
    expect(admin?.companyId).toBe(companyId);
    expect(admin?.email).toBe('first@acme.test');
    expect(admin?.passwordHash).toBe('hashed:correct-horse-battery');
    expect(admin?.passwordMustChange).toBe(false);
    const roles = await accounts.listRolesForCompany(companyId);
    const adminRole = roles.find((r) => r.name === 'admin');
    expect(admin?.roleId).toBe(adminRole?.id);

    // The new Admin can now pass canInCompany — the wall this closes.
    const permissions = new PermissionService(accounts);
    expect(await permissions.canInCompany(userId, companyId, 'company.manage_projects')).toBe(true);
  });

  it('provisions a password-less first Admin who must set one at first login', async () => {
    const { accounts, companyService, sysadminId } = buildHarness();

    const result = await companyService.createCompany(sysadminId, {
      name: 'Acme',
      slug: 'acme',
      firstAdmin: { email: 'invited@acme.test' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected create to succeed');
    }
    const userId = result.value.firstAdminUserId;
    if (userId === undefined) {
      throw new Error('expected firstAdminUserId to be set');
    }
    const admin = await accounts.getUserById(userId);
    expect(admin?.passwordHash).toBeNull();
    expect(admin?.passwordMustChange).toBe(true);
  });

  it('rejects an invalid first-Admin email', async () => {
    const { companyService, sysadminId } = buildHarness();

    const result = await companyService.createCompany(sysadminId, {
      name: 'Acme',
      slug: 'acme',
      firstAdmin: { email: 'not-an-email' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('a non-instance-admin cannot create a company', async () => {
    const { companyService, plainUserId } = buildHarness();

    expect(await companyService.createCompany(plainUserId, { name: 'X', slug: 'x' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('rejects a company with no identity (not even a stub)', async () => {
    const { companyService, sysadminId } = buildHarness();

    const result = await companyService.createCompany(sysadminId, { name: '  ', slug: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('validation');
    }
  });
});

describe('CompanyService.get (REQ-SEC-014)', () => {
  it('a member reads their own company', async () => {
    const { companyService, companyAViewerId, companyAId } = buildHarness();

    const result = await companyService.get(companyAViewerId, companyAId);

    expect(result).toEqual({
      ok: true,
      value: {
        id: companyAId,
        name: 'Acme',
        slug: 'acme',
        createdAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      },
    });
  });

  it('the instance administrator reads any company', async () => {
    const { companyService, sysadminId, companyBId } = buildHarness();

    const result = await companyService.get(sysadminId, companyBId);

    expect(result.ok).toBe(true);
  });

  it('a member of a different company cannot read it', async () => {
    const { companyService, companyBAdminId, companyAId } = buildHarness();

    expect(await companyService.get(companyBAdminId, companyAId)).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('a company-less user with no capability cannot read a company', async () => {
    const { companyService, plainUserId, companyAId } = buildHarness();

    expect(await companyService.get(plainUserId, companyAId)).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('reports not_found for a non-existent company', async () => {
    const { companyService, sysadminId } = buildHarness();

    expect(await companyService.get(sysadminId, 'nope')).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

describe('CompanyService.update (REQ-SEC-014)', () => {
  it("the company's own Admin renames it", async () => {
    const { companyService, companies, companyAAdminId, companyAId } = buildHarness();

    const result = await companyService.update(companyAAdminId, companyAId, { name: 'Acme Corp' });

    expect(result).toEqual({ ok: true, value: { ok: true } });
    expect((await companies.getCompanyById(companyAId))?.name).toBe('Acme Corp');
  });

  it('the instance administrator renames any company', async () => {
    const { companyService, companies, sysadminId, companyBId } = buildHarness();

    const result = await companyService.update(sysadminId, companyBId, { slug: 'globex-corp' });

    expect(result.ok).toBe(true);
    expect((await companies.getCompanyById(companyBId))?.slug).toBe('globex-corp');
  });

  it('a Viewer within the company cannot rename it', async () => {
    const { companyService, companyAViewerId, companyAId } = buildHarness();

    expect(await companyService.update(companyAViewerId, companyAId, { name: 'Nope' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('an Admin of another company cannot rename this one', async () => {
    const { companyService, companyBAdminId, companyAId } = buildHarness();

    expect(await companyService.update(companyBAdminId, companyAId, { name: 'Nope' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('rejects an empty name', async () => {
    const { companyService, companyAAdminId, companyAId } = buildHarness();

    const result = await companyService.update(companyAAdminId, companyAId, { name: '  ' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('reports not_found for a non-existent company', async () => {
    const { companyService, sysadminId } = buildHarness();

    expect(await companyService.update(sysadminId, 'nope', { name: 'X' })).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });
});

describe('CompanyService.update — Optimistic concurrency (REQ-AUTH-005, ADR-0016)', () => {
  it('accepts update with matching expectedUpdatedAt', async () => {
    const { companyService, companyAId, sysadminId, companies } = buildHarness();
    const company = await companies.getCompanyById(companyAId);
    if (!company) throw new Error('company not found');

    // Update with correct expectedUpdatedAt succeeds
    const edit = await companyService.update(sysadminId, companyAId, {
      name: 'Updated Acme',
      expectedUpdatedAt: company.updatedAt,
    });
    expect(edit.ok).toBe(true);
  });

  it('rejects update with wrong expectedUpdatedAt', async () => {
    const { companyService, companyAId, sysadminId } = buildHarness();

    // Update with obviously wrong expectedUpdatedAt fails
    const staleEdit = await companyService.update(sysadminId, companyAId, {
      name: 'Stale',
      expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
    });
    expect(staleEdit.ok).toBe(false);
    if (!staleEdit.ok) {
      expect(staleEdit.error.kind).toBe('stale_write');
    }
  });
});

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

import { CompanyService } from './company-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

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
}

function buildHarness(): {
  accounts: FakeAccounts;
  companies: FakeCompanies;
  companyService: CompanyService;
  sysadminId: string;
  plainUserId: string;
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

  return { accounts, companies, companyService, sysadminId, plainUserId };
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

  it('a non-instance-admin cannot create a company', async () => {
    const { companyService, plainUserId } = buildHarness();

    expect(await companyService.createCompany(plainUserId, { name: 'X', slug: 'x' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('rejects a company with no identity (not even a stub)', async () => {
    const { companyService, sysadminId } = buildHarness();

    expect(await companyService.createCompany(sysadminId, { name: '  ', slug: '' })).toEqual({
      ok: false,
      error: { kind: 'invalid_input' },
    });
  });
});

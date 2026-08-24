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
  InstanceAdminStepUp,
  InstanceAdminStepUpRepository,
  NewInstanceAdminStepUp,
} from '../ports/instance-admin-stepup-repository';

import {
  COMPANY_ACTION_ROLES,
  PermissionService,
  PROJECT_ACTION_ROLES,
  type CompanyAction,
  type ProjectAction,
} from './permissions';
import { COMPANY_ROLE_NAMES, type CompanyRoleName } from './roles';

class FakeAccounts implements AccountRepository {
  users = new Map<string, UserAccount>();

  listUsersByEmail(email: string): Promise<UserAccount[]> {
    return Promise.resolve([...this.users.values()].filter((u) => u.email === email));
  }
  roles = new Map<string, CompanyRole>();
  grants: ProjectGrant[] = [];

  createUser(input: CreateUserInput): Promise<void> {
    const user: UserAccount = {
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
    };
    this.users.set(input.id, user);
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

  listGrantsForUser(userId: string): Promise<ProjectGrant[]> {
    return Promise.resolve(this.grants.filter((grant) => grant.userId === userId));
  }

  createGrant(grant: NewProjectGrant): Promise<void> {
    const roleName = this.roles.get(grant.roleId)?.name ?? 'viewer';
    this.grants.push({
      id: grant.id,
      projectId: grant.projectId,
      userId: grant.userId,
      roleName,
    });
    return Promise.resolve();
  }

  updateGrantRole(grantId: string, roleId: string, _updatedAt: string): Promise<void> {
    const roleName = this.roles.get(roleId)?.name;
    const grant = this.grants.find((candidate) => candidate.id === grantId);
    if (grant && roleName) {
      grant.roleName = roleName;
    }
    return Promise.resolve();
  }

  revokeGrant(grantId: string): Promise<void> {
    this.grants = this.grants.filter((grant) => grant.id !== grantId);
    return Promise.resolve();
  }

  getGrantForProjectAndUser(projectId: string, userId: string): Promise<ProjectGrant | null> {
    const grant = this.grants.find(
      (candidate) => candidate.projectId === projectId && candidate.userId === userId,
    );
    return Promise.resolve(grant ?? null);
  }

  listGrantsForProject(projectId: string): Promise<ProjectGrant[]> {
    return Promise.resolve(this.grants.filter((grant) => grant.projectId === projectId));
  }

  countUsers(): Promise<number> {
    return Promise.resolve(this.users.size);
  }

  createRole(role: NewCompanyRole): Promise<void> {
    this.roles.set(role.id, { id: role.id, companyId: role.companyId, name: role.name });
    return Promise.resolve();
  }
}

/**
 * In-memory step-up store (ADR-0027). Mirrors the contract the real
 * repository must honour — notably that `getActiveStepUp` enforces expiry on
 * read, so an expired row is indistinguishable from an absent one.
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

function setupUser(accounts: FakeAccounts, overrides: Partial<UserAccount>): UserAccount {
  const user: UserAccount = {
    id: 'u1',
    companyId: 'c1',
    email: 'u@acme.test',
    passwordHash: null,
    roleId: null,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
  accounts.users.set(user.id, user);
  return user;
}

function buildRole(id: string, companyId: string, name: CompanyRoleName): CompanyRole {
  return { id, companyId, name };
}

describe('PermissionService project actions (REQ-SEC-003/011)', () => {
  const accounts = new FakeAccounts();
  const permissions = new PermissionService(accounts);
  const companyRoles = (COMPANY_ROLE_NAMES as readonly string[]).map(
    (name) => name as CompanyRoleName,
  );

  for (const action of Object.keys(PROJECT_ACTION_ROLES) as ProjectAction[]) {
    it(`${action}: allows every listed role and denies every other role`, async () => {
      const allowed = PROJECT_ACTION_ROLES[action];
      for (const roleName of companyRoles) {
        accounts.grants = [];
        accounts.users.clear();
        const user = setupUser(accounts, { roleId: `r-${roleName}` });
        accounts.grants.push({ id: 'g1', projectId: 'p1', userId: user.id, roleName });

        const expected = allowed.includes(roleName);
        await expect(permissions.canOnProject(user.id, 'p1', action)).resolves.toBe(expected);
      }
    });
  }

  it('denies every action when the user has no grant on the project', async () => {
    const user = setupUser(accounts, {});
    accounts.grants = [];

    for (const action of Object.keys(PROJECT_ACTION_ROLES) as ProjectAction[]) {
      await expect(permissions.canOnProject(user.id, 'p1', action)).resolves.toBe(false);
    }
  });
});

describe('PermissionService company actions (REQ-SEC-002/010)', () => {
  const accounts = new FakeAccounts();
  const permissions = new PermissionService(accounts);

  function userWithRole(
    roleName: CompanyRoleName | null,
    instanceAdmin = false,
    companyId = 'c1',
  ): UserAccount {
    const role = roleName === null ? null : buildRole(`r-${roleName}`, companyId, roleName);
    if (role !== null) {
      accounts.roles.set(role.id, role);
    }
    return setupUser(accounts, { roleId: role?.id ?? null, instanceAdmin, companyId });
  }

  for (const action of Object.keys(COMPANY_ACTION_ROLES) as CompanyAction[]) {
    it(`${action}: allowed only for the listed company roles`, async () => {
      const allowed = COMPANY_ACTION_ROLES[action];
      for (const roleName of COMPANY_ROLE_NAMES) {
        accounts.users.clear();
        accounts.roles.clear();
        const user = userWithRole(roleName);

        const expected = allowed.includes(roleName);
        await expect(permissions.canInCompany(user.id, 'c1', action)).resolves.toBe(expected);
      }
      // A deactivated user is denied even with the right role.
      accounts.users.clear();
      accounts.roles.clear();
      const deactivated = userWithRole('admin');
      deactivated.active = false;
      await expect(permissions.canInCompany(deactivated.id, 'c1', action)).resolves.toBe(false);
    });
  }

  it('denies company actions for a user of a different company', async () => {
    const user = userWithRole('admin', false, 'c9');
    return expect(
      permissions.canInCompany(user.id, 'c1', 'company.manage_catalogue'),
    ).resolves.toBe(false);
  });
});

describe('PermissionService instance administration (REQ-SEC-013/014)', () => {
  const accounts = new FakeAccounts();
  const permissions = new PermissionService(accounts);

  it('allows only active holders of the instance_admin capability', async () => {
    const admin = setupUser(accounts, { instanceAdmin: true });
    await expect(permissions.canAdministerInstance(admin.id)).resolves.toBe(true);

    const plainUser = setupUser(accounts, { id: 'u2' });
    await expect(permissions.canAdministerInstance(plainUser.id)).resolves.toBe(false);

    admin.active = false;
    await expect(permissions.canAdministerInstance(admin.id)).resolves.toBe(false);
  });
});

/**
 * ADR-0027: an instance administrator is permanently company-less, so
 * `canInCompany`'s membership rule can never admit them. An explicit,
 * expiring step-up window admits them for COMPANY actions in one named
 * company — and for nothing else. These tests pin all four bounds: scope
 * (that company only), expiry, capability (the flag is still required), and
 * the hard line that a step-up confers no project access whatsoever.
 */
describe('PermissionService instance-admin step-up (ADR-0027)', () => {
  const NOW = new Date('2026-08-21T12:00:00.000Z');

  function build(): {
    accounts: FakeAccounts;
    stepUps: FakeStepUps;
    permissions: PermissionService;
    admin: UserAccount;
  } {
    const accounts = new FakeAccounts();
    const stepUps = new FakeStepUps();
    const permissions = new PermissionService(accounts, stepUps, () => NOW);
    const admin = setupUser(accounts, {
      id: 'ia1',
      companyId: null,
      instanceAdmin: true,
      roleId: null,
    });
    return { accounts, stepUps, permissions, admin };
  }

  /** Opens a window expiring `minutes` from NOW (negative = already expired). */
  function openWindow(stepUps: FakeStepUps, userId: string, companyId: string, minutes: number) {
    return stepUps.openStepUp({
      id: `s-${companyId}`,
      userId,
      companyId,
      createdAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + minutes * 60_000).toISOString(),
    });
  }

  it('denies every company action to an instance admin with no step-up open', async () => {
    const { permissions, admin } = build();

    for (const action of Object.keys(COMPANY_ACTION_ROLES) as CompanyAction[]) {
      await expect(permissions.canInCompany(admin.id, 'c1', action)).resolves.toBe(false);
    }
  });

  it('admits every company action inside an open step-up for that company', async () => {
    const { permissions, stepUps, admin } = build();
    await openWindow(stepUps, admin.id, 'c1', 15);

    for (const action of Object.keys(COMPANY_ACTION_ROLES) as CompanyAction[]) {
      await expect(permissions.canInCompany(admin.id, 'c1', action)).resolves.toBe(true);
    }
  });

  it('does not leak across companies — a step-up for c1 grants nothing in c2', async () => {
    const { permissions, stepUps, admin } = build();
    await openWindow(stepUps, admin.id, 'c1', 15);

    await expect(permissions.canInCompany(admin.id, 'c2', 'company.manage_projects')).resolves.toBe(
      false,
    );
  });

  it('denies once the window has expired', async () => {
    const { permissions, stepUps, admin } = build();
    await openWindow(stepUps, admin.id, 'c1', -1);

    await expect(permissions.canInCompany(admin.id, 'c1', 'company.manage_projects')).resolves.toBe(
      false,
    );
  });

  it('requires the instance_admin capability — a step-up row alone is not enough', async () => {
    const { accounts, permissions, stepUps } = build();
    const impostor = setupUser(accounts, {
      id: 'u9',
      companyId: null,
      instanceAdmin: false,
      roleId: null,
    });
    await openWindow(stepUps, impostor.id, 'c1', 15);

    await expect(
      permissions.canInCompany(impostor.id, 'c1', 'company.manage_projects'),
    ).resolves.toBe(false);
  });

  it('denies a deactivated instance admin even inside an open window', async () => {
    const { permissions, stepUps, admin } = build();
    await openWindow(stepUps, admin.id, 'c1', 15);
    admin.active = false;

    await expect(permissions.canInCompany(admin.id, 'c1', 'company.manage_projects')).resolves.toBe(
      false,
    );
  });

  it('confers NO project access — the no-implied-content-access rule survives', async () => {
    const { permissions, stepUps, admin } = build();
    await openWindow(stepUps, admin.id, 'c1', 15);

    // Every project action stays denied: reaching content still needs a grant.
    for (const action of Object.keys(PROJECT_ACTION_ROLES) as ProjectAction[]) {
      await expect(permissions.canOnProject(admin.id, 'p1', action)).resolves.toBe(false);
    }
    // ...including through the deny-by-default combined helper.
    await expect(
      permissions.canOnProjectOrCompany(admin.id, 'project.read', 'p1', 'c1'),
    ).resolves.toBe(false);
  });

  it('still admits an ordinary company member without any step-up', async () => {
    const { accounts, permissions } = build();
    accounts.roles.set('r-admin', buildRole('r-admin', 'c1', 'admin'));
    const member = setupUser(accounts, { id: 'u3', companyId: 'c1', roleId: 'r-admin' });

    await expect(
      permissions.canInCompany(member.id, 'c1', 'company.manage_projects'),
    ).resolves.toBe(true);
  });
});

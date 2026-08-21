import { describe, expect, it } from 'vitest';

import type { AuditLogEntry } from '../../domain/entities';
import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  NewCompanyRole,
  NewProjectGrant,
  ProjectGrant,
  UserAccount,
} from '../ports/account-repository';
import type { ProjectRecord, ProjectRepository } from '../ports/project-repository';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import { GrantService } from './grant-service';
import { PermissionService } from './permissions';
import { COMPANY_ROLE_NAMES, type CompanyRoleName } from './roles';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

class FakeAccounts implements AccountRepository {
  users = new Map<string, UserAccount>();
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
    const grant = this.grants.find((candidate) => candidate.id === grantId);
    if (grant) {
      grant.roleName = this.roles.get(roleId)?.name ?? grant.roleName;
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
}

class FakeProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>();

  createProject(project: ProjectRecord): Promise<void> {
    this.projects.set(project.id, project);
    return Promise.resolve();
  }

  getProjectById(id: string): Promise<ProjectRecord | null> {
    return Promise.resolve(this.projects.get(id) ?? null);
  }

  getProjectByCompanyAndSlug(companyId: string, slug: string): Promise<ProjectRecord | null> {
    for (const p of this.projects.values()) {
      if (p.companyId === companyId && p.slug === slug) {
        return Promise.resolve(p);
      }
    }
    return Promise.resolve(null);
  }

  getProjectByCustomId(_companyId: string, _customId: string): Promise<ProjectRecord | null> {
    return Promise.resolve(null);
  }

  listProjectsForCompany(companyId: string): Promise<ProjectRecord[]> {
    return Promise.resolve(
      Array.from(this.projects.values()).filter((p) => p.companyId === companyId),
    );
  }

  updateProject(project: ProjectRecord, expectedUpdatedAt?: string): Promise<boolean> {
    const existing = this.projects.get(project.id);
    if (expectedUpdatedAt !== undefined && existing?.updatedAt !== expectedUpdatedAt) {
      return Promise.resolve(false);
    }
    this.projects.set(project.id, project);
    return Promise.resolve(true);
  }
}

function seedCompany(accounts: FakeAccounts, projects: FakeProjects, companyId: string): void {
  for (const name of COMPANY_ROLE_NAMES) {
    accounts.roles.set(`role-${name}-${companyId}`, {
      id: `role-${name}-${companyId}`,
      companyId,
      name,
    });
  }
  projects.projects.set('p1', {
    id: 'p1',
    companyId,
    name: 'Web',
    slug: 'web',
    description: null,
    icon: null,
    platform: 'web',
    tagManager: null,
    lifecycleState: 'active',
    integrationSettings: null,
    customId: null,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
}

function addUser(
  accounts: FakeAccounts,
  id: string,
  companyId: string,
  roleName: CompanyRoleName,
): void {
  accounts.users.set(id, {
    id,
    companyId,
    email: `${id}@acme.test`,
    passwordHash: null,
    roleId: `role-${roleName}-${companyId}`,
    name: null,
    instanceAdmin: false,
    active: true,
    passwordMustChange: false,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
}

class FakeAuditLogRepository implements AuditLogRepository {
  async appendLog(_entry: AuditLogEntry): Promise<void> {
    // No-op for tests
  }

  listLogsForCompany(_companyId: string, _limit?: number): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }

  listLogsForProject(_projectId: string, _limit?: number): Promise<AuditLogEntry[]> {
    return Promise.resolve([]);
  }
}

function build(): {
  accounts: FakeAccounts;
  projects: FakeProjects;
  grants: GrantService;
  adminId: string;
  viewerId: string;
} {
  const accounts = new FakeAccounts();
  const projects = new FakeProjects();
  seedCompany(accounts, projects, 'c1');
  addUser(accounts, 'admin', 'c1', 'admin');
  addUser(accounts, 'viewer', 'c1', 'viewer');
  const permissions = new PermissionService(accounts);
  const auditLogs = new FakeAuditLogRepository();
  let counter = 0;
  const grants = new GrantService(
    accounts,
    projects,
    permissions,
    auditLogs,
    () => FIXED_NOW,
    () => 'g-' + String(++counter),
  );
  // The admin holds a grant on p1 so they can administer its access.
  accounts.grants.push({ id: 'g-admin', projectId: 'p1', userId: 'admin', roleName: 'admin' });
  return { accounts, projects, grants, adminId: 'admin', viewerId: 'viewer' };
}

describe('GrantService (REQ-SEC-003, M1.12)', () => {
  it('an Admin grants a Viewer on one project; the Viewer reaches it and no other', async () => {
    const { accounts, grants, adminId, viewerId } = build();

    const result = await grants.setRole(adminId, 'p1', viewerId, 'viewer');

    expect(result.ok).toBe(true);
    const viewerGrants = await accounts.listGrantsForUser(viewerId);
    expect(viewerGrants).toHaveLength(1);
    expect(viewerGrants[0]).toMatchObject({ projectId: 'p1', roleName: 'viewer' });
    // The Viewer has no grant on any other project (there is none in the
    // harness; the grant is scoped to exactly p1).
    expect(await accounts.listGrantsForProject('p1')).toHaveLength(2); // admin + viewer
  });

  it('changes the role of an existing grant (idempotent set)', async () => {
    const { accounts, grants, adminId, viewerId } = build();
    await grants.setRole(adminId, 'p1', viewerId, 'viewer');

    const changed = await grants.setRole(adminId, 'p1', viewerId, 'editor');

    expect(changed.ok).toBe(true);
    const grants2 = await accounts.listGrantsForUser(viewerId);
    expect(grants2).toHaveLength(1);
    expect(grants2[0]?.roleName).toBe('editor');
  });

  it('a Project Manager can administer access; an Editor and Viewer cannot', async () => {
    const { accounts, grants, viewerId } = build();
    addUser(accounts, 'pm', 'c1', 'project_manager');
    addUser(accounts, 'editor', 'c1', 'editor');
    accounts.grants.push({
      id: 'g-pm',
      projectId: 'p1',
      userId: 'pm',
      roleName: 'project_manager',
    });
    accounts.grants.push({ id: 'g-ed', projectId: 'p1', userId: 'editor', roleName: 'editor' });

    expect((await grants.setRole('pm', 'p1', viewerId, 'viewer')).ok).toBe(true);
    expect(await grants.setRole('editor', 'p1', viewerId, 'viewer')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
    expect(await grants.setRole('viewer', 'p1', viewerId, 'viewer')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('rejects a role outside the four company roles', async () => {
    const { grants, adminId, viewerId } = build();

    expect(await grants.setRole(adminId, 'p1', viewerId, 'superuser')).toEqual({
      ok: false,
      error: { kind: 'invalid_role' },
    });
  });

  it('cannot grant a user of another company (no cross-tenant grants)', async () => {
    const { accounts, grants, adminId } = build();
    addUser(accounts, 'other', 'c9', 'viewer');

    expect(await grants.setRole(adminId, 'p1', 'other', 'viewer')).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });

  it('revokes a grant and lets a later revoke of an absent grant succeed', async () => {
    const { accounts, grants, adminId, viewerId } = build();
    await grants.setRole(adminId, 'p1', viewerId, 'viewer');

    expect(await grants.revoke(adminId, 'p1', viewerId)).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect(await accounts.listGrantsForUser(viewerId)).toHaveLength(0);
    expect(await grants.revoke(adminId, 'p1', viewerId)).toEqual({
      ok: true,
      value: { ok: true },
    });
  });

  it('lists the grants on a project for someone with manage_access', async () => {
    const { grants, adminId, viewerId } = build();
    await grants.setRole(adminId, 'p1', viewerId, 'viewer');

    const result = await grants.list(adminId, 'p1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  it('denies listing without manage_access', async () => {
    const { grants, viewerId } = build();

    expect(await grants.list(viewerId, 'p1')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });
});

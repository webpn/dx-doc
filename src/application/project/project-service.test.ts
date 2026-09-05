import { ok } from '@project/shared/result';
import { describe, expect, it } from 'vitest';

import { PermissionService } from '../auth/permissions';
import type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  NewCompanyRole,
  NewProjectGrant,
  ProjectGrant,
  UserAccount,
} from '../ports/account-repository';
import type { CatalogueCopier, CatalogueCopyCounts } from '../ports/catalogue-copier';
import type { ProjectRecord, ProjectRepository } from '../ports/project-repository';
import type { ProjectCreateInput } from '../validation/schemas';

import { ProjectService } from './project-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

class StubPermissions extends PermissionService {
  constructor(private readonly answers: { project?: boolean; company?: boolean }) {
    super({} as AccountRepository);
  }

  override canOnProject(): Promise<boolean> {
    return Promise.resolve(this.answers.project ?? true);
  }

  override canInCompany(): Promise<boolean> {
    return Promise.resolve(this.answers.company ?? true);
  }
}

/** Records every catalogue copy the service triggers (REQ-DOM-019). */
class RecordingCatalogueCopier implements CatalogueCopier {
  calls: { companyId: string; projectId: string }[] = [];

  copyCatalogueIntoProject(
    companyId: string,
    projectId: string,
  ): Promise<{ ok: true; value: CatalogueCopyCounts } | { ok: false; error: never }> {
    this.calls.push({ companyId, projectId });
    return Promise.resolve(ok({ copiedProperties: 0, copiedModules: 0 }));
  }
}

/**
 * In-memory accounts: only the role lookup + grant write the service needs.
 */
class FakeAccounts implements AccountRepository {
  roles = new Map<string, CompanyRole>();
  grants: ProjectGrant[] = [];

  createUser(_input: CreateUserInput): Promise<void> {
    return Promise.resolve();
  }

  getUserById(_id: string): Promise<UserAccount | null> {
    return Promise.resolve(null);
  }

  getUserByEmail(_companyId: string | null, _email: string): Promise<UserAccount | null> {
    return Promise.resolve(null);
  }

  listUsersByEmail(_email: string): Promise<UserAccount[]> {
    return Promise.resolve([]);
  }

  listUsersForCompany(_companyId: string): Promise<UserAccount[]> {
    return Promise.resolve([]);
  }

  updateUser(_user: UserAccount): Promise<void> {
    return Promise.resolve();
  }

  countUsers(): Promise<number> {
    return Promise.resolve(0);
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

/** Seed the four company roles for `companyId` into `accounts`. */
function seedCompanyRoles(accounts: FakeAccounts, companyId: string): void {
  const names = ['admin', 'project_manager', 'editor', 'viewer'] as const;
  for (const name of names) {
    accounts.roles.set(`role-${name}-${companyId}`, {
      id: `role-${name}-${companyId}`,
      companyId,
      name,
    });
  }
}

class FakeProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>();
  slugs = new Map<string, string>();
  customToId = new Map<string, string>();

  createProject(project: ProjectRecord, slug: string): Promise<void> {
    this.projects.set(project.id, project);
    this.slugs.set(project.id, slug);
    if (project.customId) {
      this.customToId.set(project.customId, project.id);
    }
    return Promise.resolve();
  }

  getProjectById(id: string): Promise<ProjectRecord | null> {
    return Promise.resolve(this.projects.get(id) ?? null);
  }

  getProjectByCompanyAndSlug(companyId: string, slug: string): Promise<ProjectRecord | null> {
    for (const p of this.projects.values()) {
      if (p.companyId === companyId && this.slugs.get(p.id) === slug) {
        return Promise.resolve(p);
      }
    }
    return Promise.resolve(null);
  }

  getProjectByCustomId(companyId: string, customId: string): Promise<ProjectRecord | null> {
    const id = this.customToId.get(customId);
    if (id === undefined) {
      return Promise.resolve(null);
    }
    const project = this.projects.get(id);
    if (project === undefined) {
      return Promise.resolve(null);
    }
    if (project.companyId !== companyId) {
      return Promise.resolve(null);
    }
    return Promise.resolve(project);
  }

  listProjectsForCompany(companyId: string): Promise<ProjectRecord[]> {
    return Promise.resolve(
      Array.from(this.projects.values()).filter((p) => p.companyId === companyId),
    );
  }

  updateProject(
    project: ProjectRecord,
    slug?: string,
    expectedUpdatedAt?: string,
  ): Promise<boolean> {
    const existing = this.projects.get(project.id);
    if (expectedUpdatedAt !== undefined && existing?.updatedAt !== expectedUpdatedAt) {
      return Promise.resolve(false);
    }
    this.projects.set(project.id, project);
    if (slug !== undefined) {
      this.slugs.set(project.id, slug);
    }
    if (project.customId) {
      this.customToId.set(project.customId, project.id);
    }
    return Promise.resolve(true);
  }

  slugOf(id: string): string | undefined {
    return this.slugs.get(id);
  }
}

function input(overrides: Partial<ProjectCreateInput> = {}): ProjectCreateInput {
  return { name: 'Web analytics', platform: 'web', ...overrides };
}

function build(): { projects: FakeProjects; accounts: FakeAccounts; service: ProjectService } {
  const projects = new FakeProjects();
  const accounts = new FakeAccounts();
  seedCompanyRoles(accounts, 'c1');
  const service = new ProjectService(
    projects,
    new StubPermissions({}),
    accounts,
    new RecordingCatalogueCopier(),
    () => FIXED_NOW,
    () => 'id-' + String(projects.projects.size),
  );
  return { projects, accounts, service };
}

describe('ProjectService.create (REQ-FDN-003, REQ-IMP-003)', () => {
  it('a company Admin creates a project', async () => {
    const { projects, service } = build();

    const result = await service.create('u1', 'c1', input());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(true);
      const stored = await projects.getProjectById(result.value.projectId);
      expect(stored?.name).toBe('Web analytics');
      expect(stored?.lifecycleState).toBe('active');
    }
  });

  it('copies the company catalogue into the project at creation (REQ-DOM-019, Critical Business Rule 3)', async () => {
    const projects = new FakeProjects();
    const accounts = new FakeAccounts();
    seedCompanyRoles(accounts, 'c1');
    const copier = new RecordingCatalogueCopier();
    const service = new ProjectService(
      projects,
      new StubPermissions({}),
      accounts,
      copier,
      () => FIXED_NOW,
      () => 'id',
    );

    const result = await service.create('u1', 'c1', input());

    expect(result.ok).toBe(true);
    expect(copier.calls).toHaveLength(1);
    if (result.ok) {
      expect(copier.calls[0]).toEqual({ companyId: 'c1', projectId: result.value.projectId });
    }
  });

  it('does not copy the catalogue again on the custom_id upsert path (REQ-DOM-019)', async () => {
    const projects = new FakeProjects();
    const accounts = new FakeAccounts();
    seedCompanyRoles(accounts, 'c1');
    const copier = new RecordingCatalogueCopier();
    const service = new ProjectService(
      projects,
      new StubPermissions({}),
      accounts,
      copier,
      () => FIXED_NOW,
      () => 'id',
    );

    await service.create('u1', 'c1', input({ customId: 'legacy:web' }));
    const copiesAfterFirstCreate = copier.calls.length;

    const repeated = await service.create('u1', 'c1', input({ customId: 'legacy:web' }));
    expect(repeated.ok).toBe(true);

    // The first write was a real creation and copied the catalogue; the
    // second was an upsert of the same custom_id and must not copy again.
    expect(copiesAfterFirstCreate).toBe(1);
    expect(copier.calls.length).toBe(copiesAfterFirstCreate);
  });

  it('rejects an invalid payload with uniform validation issues', async () => {
    const { service } = build();

    const result = await service.create('u1', 'c1', {
      name: '',
      slug: 'web-analytics',
      platform: 'banana',
    } as unknown as ProjectCreateInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('forbids a non-Admin', async () => {
    const projects = new FakeProjects();
    const accounts = new FakeAccounts();
    const service = new ProjectService(
      projects,
      new StubPermissions({ company: false }),
      accounts,
      new RecordingCatalogueCopier(),
      () => FIXED_NOW,
      () => 'id',
    );

    expect(await service.create('viewer', 'c1', input())).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });

  it('upserts idempotently on custom_id: a repeated write updates, not duplicates', async () => {
    const { projects, service } = build();

    const first = await service.create('u1', 'c1', input({ customId: 'legacy:tracking:web' }));
    const second = await service.create(
      'u1',
      'c1',
      input({ name: 'Renamed', customId: 'legacy:tracking:web' }),
    );

    expect(second.ok).toBe(true);
    const projectId = first.ok ? first.value.projectId : '';
    if (second.ok) {
      expect(second.value.created).toBe(false);
      expect(second.value.projectId).toBe(projectId);
    }
    const stored = await projects.getProjectById(projectId);
    expect(stored?.name).toBe('Renamed');
    expect(projects.projects.size).toBe(1);
  });
});

describe('ProjectService.update + get', () => {
  it('an Admin updates a project', async () => {
    const { projects, service } = build();
    const created = await service.create('u1', 'c1', input());
    const projectId = created.ok ? created.value.projectId : '';

    const result = await service.update('u1', projectId, { name: 'New name' });

    expect(result).toEqual({ ok: true, value: { ok: true } });
    expect((await projects.getProjectById(projectId))?.name).toBe('New name');
  });

  it('rejects a custom_id already used by another project in the company', async () => {
    const { service } = build();
    await service.create('u1', 'c1', input({ customId: 'shared' }));
    const b = await service.create('u1', 'c1', input({ name: 'B', platform: 'ios' }));
    const bId = b.ok ? b.value.projectId : '';

    expect(await service.update('u1', bId, { customId: 'shared' })).toEqual({
      ok: false,
      error: { kind: 'duplicate_custom_id' },
    });
  });

  it('returns not_found for a missing project', async () => {
    const { service } = build();
    expect(await service.get('u1', 'missing')).toEqual({ ok: false, error: { kind: 'not_found' } });
  });

  it('forbids read without a grant', async () => {
    const { projects, service } = build();
    const created = await service.create('u1', 'c1', input());
    const id = created.ok ? created.value.projectId : '';
    const restricted = new ProjectService(
      projects,
      new StubPermissions({ project: false }),
      new FakeAccounts(),
      new RecordingCatalogueCopier(),
      () => FIXED_NOW,
      () => 'id',
    );

    expect(await restricted.get('viewer', id)).toEqual({ ok: false, error: { kind: 'forbidden' } });
  });

  it('grants the creator the admin role on the project it just created (REQ-SEC-003, M1.12)', async () => {
    const { accounts, service } = build();

    const result = await service.create('u1', 'c1', input());
    const projectId = result.ok ? result.value.projectId : '';

    const grants = await accounts.listGrantsForUser('u1');
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ projectId, userId: 'u1', roleName: 'admin' });
  });
});

describe('ProjectService slugs — system-generated (auto-managed-slugs)', () => {
  it('generates the slug from the name on create', async () => {
    const { projects, service } = build();

    const created = await service.create('u1', 'c1', input({ name: 'Checkout Funnel' }));

    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(projects.slugOf(created.value.projectId)).toBe('checkout-funnel');
    }
  });

  it('appends a numeric suffix on collision within the company', async () => {
    const { projects, service } = build();

    const first = await service.create('u1', 'c1', input({ name: 'Checkout Funnel' }));
    const second = await service.create('u1', 'c1', input({ name: 'Checkout Funnel' }));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(projects.slugOf(first.value.projectId)).toBe('checkout-funnel');
      expect(projects.slugOf(second.value.projectId)).toBe('checkout-funnel-2');
    }
  });

  it('scopes uniqueness to the company', async () => {
    const projects = new FakeProjects();
    const accounts = new FakeAccounts();
    seedCompanyRoles(accounts, 'c1');
    seedCompanyRoles(accounts, 'c2');
    const service = new ProjectService(
      projects,
      new StubPermissions({}),
      accounts,
      new RecordingCatalogueCopier(),
      () => FIXED_NOW,
      () => 'id-' + String(projects.projects.size),
    );

    const a = await service.create('u1', 'c1', input({ name: 'Checkout Funnel' }));
    const b = await service.create('u1', 'c2', input({ name: 'Checkout Funnel' }));

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(projects.slugOf(a.value.projectId)).toBe('checkout-funnel');
      expect(projects.slugOf(b.value.projectId)).toBe('checkout-funnel');
    }
  });

  it('regenerates the slug on rename and keeps it when the name is unchanged', async () => {
    const { projects, service } = build();
    const created = await service.create('u1', 'c1', input({ name: 'Old Name' }));
    const projectId = created.ok ? created.value.projectId : '';
    expect(projects.slugOf(projectId)).toBe('old-name');

    await service.update('u1', projectId, { name: 'New Name' });
    expect(projects.slugOf(projectId)).toBe('new-name');

    await service.update('u1', projectId, { description: 'lorem' });
    expect(projects.slugOf(projectId)).toBe('new-name');
  });

  it('keeps the slug when a rename normalizes to the same base (self-hit)', async () => {
    const { projects, service } = build();
    const created = await service.create('u1', 'c1', input({ name: 'Web analytics' }));
    const projectId = created.ok ? created.value.projectId : '';

    await service.update('u1', projectId, { name: 'Web  analytics' });

    expect(projects.slugOf(projectId)).toBe('web-analytics');
  });

  it('regenerates the slug on custom_id upsert with a new name', async () => {
    const { projects, service } = build();
    const first = await service.create(
      'u1',
      'c1',
      input({ name: 'Web analytics', customId: 'legacy:web' }),
    );
    const projectId = first.ok ? first.value.projectId : '';

    await service.create('u1', 'c1', input({ name: 'Renamed', customId: 'legacy:web' }));

    expect(projects.slugOf(projectId)).toBe('renamed');
  });

  it('returns slug-free records', async () => {
    const { service } = build();
    const created = await service.create('u1', 'c1', input());
    const projectId = created.ok ? created.value.projectId : '';

    const got = await service.get('u1', projectId);

    expect(got.ok).toBe(true);
    if (got.ok) {
      expect('slug' in got.value).toBe(false);
    }
  });
});
describe('ProjectService.update — Optimistic concurrency (REQ-AUTH-005, ADR-0016)', () => {
  it('accepts update with matching expectedUpdatedAt', async () => {
    const { projects, service } = build();
    const created = await service.create('u1', 'c1', { name: 'Web', platform: 'web' });
    const projectId = created.ok ? created.value.projectId : '';
    const project = await projects.getProjectById(projectId);
    if (!project) throw new Error('project not found');

    // Update with correct expectedUpdatedAt succeeds
    const edit = await service.update('u1', projectId, {
      name: 'Updated',
      expectedUpdatedAt: project.updatedAt,
    });
    expect(edit.ok).toBe(true);
  });

  it('rejects update with wrong expectedUpdatedAt', async () => {
    const { service } = build();
    const created = await service.create('u1', 'c1', { name: 'Web', platform: 'web' });
    const projectId = created.ok ? created.value.projectId : '';

    // Update with obviously wrong expectedUpdatedAt fails
    const staleEdit = await service.update('u1', projectId, {
      name: 'Stale',
      expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
    });
    expect(staleEdit.ok).toBe(false);
    if (!staleEdit.ok) {
      expect(staleEdit.error.kind).toBe('stale_write');
    }
  });
});

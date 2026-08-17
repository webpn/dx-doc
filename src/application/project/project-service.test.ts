import { describe, expect, it } from 'vitest';

import { PermissionService } from '../auth/permissions';
import type { AccountRepository } from '../ports/account-repository';
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

class FakeProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>();
  customToId = new Map<string, string>();

  createProject(project: ProjectRecord): Promise<void> {
    this.projects.set(project.id, project);
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
      if (p.companyId === companyId && p.slug === slug) {
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

  updateProject(project: ProjectRecord): Promise<void> {
    this.projects.set(project.id, project);
    if (project.customId) {
      this.customToId.set(project.customId, project.id);
    }
    return Promise.resolve();
  }
}

function input(overrides: Partial<ProjectCreateInput> = {}): ProjectCreateInput {
  return { name: 'Web analytics', slug: 'web-analytics', platform: 'web', ...overrides };
}

function build(): { projects: FakeProjects; service: ProjectService } {
  const projects = new FakeProjects();
  const service = new ProjectService(
    projects,
    new StubPermissions({}),
    () => FIXED_NOW,
    () => 'id-' + String(projects.projects.size),
  );
  return { projects, service };
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

  it('rejects an invalid payload with uniform validation issues', async () => {
    const { service } = build();

    const result = await service.create('u1', 'c1', {
      name: '',
      slug: '',
      platform: 'banana',
    } as unknown as ProjectCreateInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('validation');
    }
  });

  it('forbids a non-Admin', async () => {
    const projects = new FakeProjects();
    const service = new ProjectService(
      projects,
      new StubPermissions({ company: false }),
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
    const b = await service.create('u1', 'c1', input({ name: 'B', slug: 'b', platform: 'ios' }));
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
      () => FIXED_NOW,
      () => 'id',
    );

    expect(await restricted.get('viewer', id)).toEqual({ ok: false, error: { kind: 'forbidden' } });
  });
});

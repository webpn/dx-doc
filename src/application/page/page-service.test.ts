import { describe, expect, it } from 'vitest';

import { PermissionService } from '../auth/permissions';
import type { AccountRepository } from '../ports/account-repository';
import type { PageRecord, PageRepository } from '../ports/page-repository';
import type { ProjectRecord, ProjectRepository } from '../ports/project-repository';

import { PageService } from './page-service';

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

class StubPermissions extends PermissionService {
  constructor(private readonly answers: { project?: boolean }) {
    super({} as AccountRepository);
  }

  override canOnProject(): Promise<boolean> {
    return Promise.resolve(this.answers.project ?? true);
  }
}

class FakePages implements PageRepository {
  pages = new Map<string, PageRecord>();
  customToId = new Map<string, string>();

  createPage(page: PageRecord): Promise<void> {
    this.pages.set(page.id, page);
    if (page.customId) {
      this.customToId.set(page.customId, page.id);
    }
    return Promise.resolve();
  }

  getPageById(id: string): Promise<PageRecord | null> {
    return Promise.resolve(this.pages.get(id) ?? null);
  }

  getPageByProjectAndSlug(projectId: string, slug: string): Promise<PageRecord | null> {
    for (const p of this.pages.values()) {
      if (p.projectId === projectId && p.slug === slug) {
        return Promise.resolve(p);
      }
    }
    return Promise.resolve(null);
  }

  getPageByCustomId(projectId: string, customId: string): Promise<PageRecord | null> {
    const id = this.customToId.get(customId);
    if (id === undefined) {
      return Promise.resolve(null);
    }
    const page = this.pages.get(id);
    if (page === undefined) {
      return Promise.resolve(null);
    }
    if (page.projectId !== projectId) {
      return Promise.resolve(null);
    }
    return Promise.resolve(page);
  }

  updatePage(page: PageRecord): Promise<void> {
    this.pages.set(page.id, page);
    if (page.customId) {
      this.customToId.set(page.customId, page.id);
    }
    return Promise.resolve();
  }
}

class FakeProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>();

  createProject(p: ProjectRecord): Promise<void> {
    this.projects.set(p.id, p);
    return Promise.resolve();
  }
  getProjectById(id: string): Promise<ProjectRecord | null> {
    return Promise.resolve(this.projects.get(id) ?? null);
  }
  getProjectByCompanyAndSlug(_c: string, _s: string): Promise<ProjectRecord | null> {
    return Promise.resolve(null);
  }
  getProjectByCustomId(_c: string, _s: string): Promise<ProjectRecord | null> {
    return Promise.resolve(null);
  }
  listProjectsForCompany(_c: string): Promise<ProjectRecord[]> {
    return Promise.resolve(Array.from(this.projects.values()));
  }
  updateProject(p: ProjectRecord): Promise<void> {
    this.projects.set(p.id, p);
    return Promise.resolve();
  }
}

function build(): { pages: FakePages; projects: FakeProjects; service: PageService } {
  const pages = new FakePages();
  const projects = new FakeProjects();
  projects.projects.set('proj-1', {
    id: 'proj-1',
    companyId: 'c1',
    name: 'Web',
    slug: 'web',
    platform: 'web',
    description: null,
    icon: null,
    tagManager: null,
    lifecycleState: 'active',
    integrationSettings: null,
    customId: null,
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
  });
  const service = new PageService(
    pages,
    projects,
    new StubPermissions({}),
    () => FIXED_NOW,
    () => 'page-' + String(pages.pages.size),
  );
  return { pages, projects, service };
}

describe('PageService.create (REQ-DOM-001, REQ-IMP-003)', () => {
  it('an Editor creates a page in a project', async () => {
    const { pages, service } = build();

    const result = await service.create('u1', 'proj-1', { name: 'Home', slug: 'home' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe(true);
      expect((await pages.getPageById(result.value.pageId))?.name).toBe('Home');
    }
  });

  it('upserts idempotently on custom_id', async () => {
    const { pages, service } = build();

    const first = await service.create('u1', 'proj-1', {
      name: 'Home',
      slug: 'home',
      customId: 'legacy:home',
    });
    const second = await service.create('u1', 'proj-1', {
      name: 'Homepage',
      slug: 'home',
      customId: 'legacy:home',
    });

    expect(second.ok).toBe(true);
    const id = first.ok ? first.value.pageId : '';
    if (second.ok) {
      expect(second.value.created).toBe(false);
      expect(second.value.pageId).toBe(id);
    }
    expect((await pages.getPageById(id))?.name).toBe('Homepage');
    expect(pages.pages.size).toBe(1);
  });

  it('returns not_found when the project does not exist', async () => {
    const { service } = build();
    expect(await service.create('u1', 'missing', { name: 'X', slug: 'x' })).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });

  it('rejects a parent from another project', async () => {
    const { pages, projects, service } = build();
    projects.projects.set('proj-2', { ...FIXED_PROJECT, id: 'proj-2' });
    await pages.createPage({
      id: 'other-page',
      projectId: 'proj-2',
      parentId: null,
      name: 'P',
      slug: 'p',
      customId: null,
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    });

    expect(
      await service.create('u1', 'proj-1', { name: 'X', slug: 'x', parentId: 'other-page' }),
    ).toEqual({
      ok: false,
      error: { kind: 'cross_project_parent' },
    });
  });

  it('forbids without an edit grant', async () => {
    const pages = new FakePages();
    const projects = new FakeProjects();
    projects.projects.set('proj-1', { ...FIXED_PROJECT, id: 'proj-1' });
    const service = new PageService(
      pages,
      projects,
      new StubPermissions({ project: false }),
      () => FIXED_NOW,
      () => 'page',
    );

    expect(await service.create('viewer', 'proj-1', { name: 'X', slug: 'x' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });
});

const FIXED_PROJECT: ProjectRecord = {
  id: 'proj-1',
  companyId: 'c1',
  name: 'Web',
  slug: 'web',
  platform: 'web',
  description: null,
  icon: null,
  tagManager: null,
  lifecycleState: 'active',
  integrationSettings: null,
  customId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PageService.update + get', () => {
  it('updates a page', async () => {
    const { pages, service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Home', slug: 'home' });
    const id = created.ok ? created.value.pageId : '';

    expect(await service.update('u1', id, { name: 'Homepage' })).toEqual({
      ok: true,
      value: { ok: true },
    });
    expect((await pages.getPageById(id))?.name).toBe('Homepage');
  });

  it('returns not_found for a missing page', async () => {
    const { service } = build();
    expect(await service.get('u1', 'missing')).toEqual({ ok: false, error: { kind: 'not_found' } });
  });
});

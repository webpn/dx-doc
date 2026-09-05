import { describe, expect, it } from 'vitest';

import { PermissionService } from '../auth/permissions';
import type { AccountRepository } from '../ports/account-repository';
import type { PageDeletionBlockers, PageRecord, PageRepository } from '../ports/page-repository';
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
  slugs = new Map<string, string>();
  customToId = new Map<string, string>();
  blockers: PageDeletionBlockers = { childPages: 0, trackings: 0, flowNodes: 0 };
  deleted: string[] = [];

  createPage(page: PageRecord, slug: string): Promise<void> {
    this.pages.set(page.id, page);
    this.slugs.set(page.id, slug);
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
      if (p.projectId === projectId && this.slugs.get(p.id) === slug) {
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

  listPagesByProject(projectId: string): Promise<PageRecord[]> {
    const result = Array.from(this.pages.values()).filter((p) => p.projectId === projectId);
    return Promise.resolve(result);
  }

  updatePage(page: PageRecord, slug?: string, expectedUpdatedAt?: string): Promise<boolean> {
    const existing = this.pages.get(page.id);
    if (expectedUpdatedAt !== undefined && existing?.updatedAt !== expectedUpdatedAt) {
      return Promise.resolve(false);
    }
    this.pages.set(page.id, page);
    if (slug !== undefined) {
      this.slugs.set(page.id, slug);
    }
    if (page.customId) {
      this.customToId.set(page.customId, page.id);
    }
    return Promise.resolve(true);
  }

  slugOf(id: string): string | undefined {
    return this.slugs.get(id);
  }

  getPageDeletionBlockers(): Promise<PageDeletionBlockers> {
    return Promise.resolve(this.blockers);
  }

  deletePage(id: string): Promise<void> {
    this.pages.delete(id);
    this.deleted.push(id);
    return Promise.resolve();
  }
}

class FakeProjects implements ProjectRepository {
  projects = new Map<string, ProjectRecord>();

  createProject(p: ProjectRecord, _slug: string): Promise<void> {
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
  updateProject(p: ProjectRecord, _slug?: string, expectedUpdatedAt?: string): Promise<boolean> {
    const existing = this.projects.get(p.id);
    if (expectedUpdatedAt !== undefined && existing?.updatedAt !== expectedUpdatedAt) {
      return Promise.resolve(false);
    }
    this.projects.set(p.id, p);
    return Promise.resolve(true);
  }
}

function build(): { pages: FakePages; projects: FakeProjects; service: PageService } {
  const pages = new FakePages();
  const projects = new FakeProjects();
  projects.projects.set('proj-1', {
    id: 'proj-1',
    companyId: 'c1',
    name: 'Web',
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

    const result = await service.create('u1', 'proj-1', { name: 'Home' });

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
      customId: 'legacy:home',
    });
    const second = await service.create('u1', 'proj-1', {
      name: 'Homepage',
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
    expect(await service.create('u1', 'missing', { name: 'X' })).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });

  it('rejects a parent from another project', async () => {
    const { pages, projects, service } = build();
    projects.projects.set('proj-2', { ...FIXED_PROJECT, id: 'proj-2' });
    await pages.createPage(
      {
        id: 'other-page',
        projectId: 'proj-2',
        parentId: null,
        name: 'P',
        description: null,
        customId: null,
        createdAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      },
      'p',
    );

    expect(
      await service.create('u1', 'proj-1', { name: 'X', parentId: 'other-page' }),
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

    expect(await service.create('viewer', 'proj-1', { name: 'X' })).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });
});

const FIXED_PROJECT: ProjectRecord = {
  id: 'proj-1',
  companyId: 'c1',
  name: 'Web',
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
    const created = await service.create('u1', 'proj-1', { name: 'Home' });
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

describe('PageService.delete (ADR-0025)', () => {
  it('deletes an unreferenced page', async () => {
    const { pages, service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Home' });
    const id = created.ok ? created.value.pageId : '';

    expect(await service.delete('u1', id)).toEqual({ ok: true, value: { ok: true } });
    expect(await pages.getPageById(id)).toBeNull();
  });

  it('refuses to delete a page with child pages, trackings or flow nodes', async () => {
    const { pages, service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Home' });
    const id = created.ok ? created.value.pageId : '';
    pages.blockers = { childPages: 2, trackings: 1, flowNodes: 3 };

    const result = await service.delete('u1', id);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'in_use',
        reason: 'still referenced by 2 child page(s), 1 tracking(s), 3 flow node(s)',
      },
    });
    expect(pages.deleted).toEqual([]);
  });

  it('returns not_found for a missing page', async () => {
    const { service } = build();
    expect(await service.delete('u1', 'missing')).toEqual({
      ok: false,
      error: { kind: 'not_found' },
    });
  });

  it('forbids deletion without an edit grant', async () => {
    const pages = new FakePages();
    const projects = new FakeProjects();
    projects.projects.set('proj-1', { ...FIXED_PROJECT, id: 'proj-1' });
    await pages.createPage(
      {
        id: 'pg1',
        projectId: 'proj-1',
        parentId: null,
        name: 'Home',
        description: null,
        customId: null,
        createdAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      },
      'home',
    );
    const service = new PageService(pages, projects, new StubPermissions({ project: false }));

    expect(await service.delete('viewer', 'pg1')).toEqual({
      ok: false,
      error: { kind: 'forbidden' },
    });
  });
});

describe('PageService slugs — system-generated (auto-managed-slugs)', () => {
  it('generates the slug from the name on create', async () => {
    const { pages, service } = build();

    const created = await service.create('u1', 'proj-1', { name: 'Product Home' });

    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(pages.slugOf(created.value.pageId)).toBe('product-home');
    }
  });

  it('appends a numeric suffix on collision within the project', async () => {
    const { pages, service } = build();

    const first = await service.create('u1', 'proj-1', { name: 'Product Home' });
    const second = await service.create('u1', 'proj-1', { name: 'Product Home' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(pages.slugOf(first.value.pageId)).toBe('product-home');
      expect(pages.slugOf(second.value.pageId)).toBe('product-home-2');
    }
  });

  it('scopes uniqueness to the project', async () => {
    const { pages, projects, service } = build();
    projects.projects.set('proj-2', { ...FIXED_PROJECT, id: 'proj-2' });

    const a = await service.create('u1', 'proj-1', { name: 'Product Home' });
    const b = await service.create('u1', 'proj-2', { name: 'Product Home' });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(pages.slugOf(a.value.pageId)).toBe('product-home');
      expect(pages.slugOf(b.value.pageId)).toBe('product-home');
    }
  });

  it('regenerates the slug on rename and keeps it when the name is unchanged', async () => {
    const { pages, service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Old Name' });
    const pageId = created.ok ? created.value.pageId : '';
    expect(pages.slugOf(pageId)).toBe('old-name');

    await service.update('u1', pageId, { name: 'New Name' });
    expect(pages.slugOf(pageId)).toBe('new-name');

    await service.update('u1', pageId, { description: 'lorem' });
    expect(pages.slugOf(pageId)).toBe('new-name');
  });

  it('regenerates the slug on custom_id upsert with a new name', async () => {
    const { pages, service } = build();
    const first = await service.create(
      'u1',
      'proj-1',
      { name: 'Home', customId: 'legacy:home' },
    );
    const pageId = first.ok ? first.value.pageId : '';

    await service.create('u1', 'proj-1', { name: 'Homepage', customId: 'legacy:home' });

    expect(pages.slugOf(pageId)).toBe('homepage');
  });

  it('returns slug-free records', async () => {
    const { service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Home' });
    const pageId = created.ok ? created.value.pageId : '';

    const got = await service.get('u1', pageId);

    expect(got.ok).toBe(true);
    if (got.ok) {
      expect('slug' in got.value).toBe(false);
    }
  });
});

describe('PageService.update — Optimistic concurrency (REQ-AUTH-005, ADR-0016)', () => {
  it('accepts update with matching expectedUpdatedAt', async () => {
    const { pages, service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Home' });
    const pageId = created.ok ? created.value.pageId : '';
    const page = await pages.getPageById(pageId);
    if (!page) throw new Error('page not found');

    // Update with correct expectedUpdatedAt succeeds
    const edit = await service.update('u1', pageId, {
      name: 'Updated',
      expectedUpdatedAt: page.updatedAt,
    });
    expect(edit.ok).toBe(true);
  });

  it('rejects update with wrong expectedUpdatedAt', async () => {
    const { service } = build();
    const created = await service.create('u1', 'proj-1', { name: 'Home' });
    const pageId = created.ok ? created.value.pageId : '';

    // Update with obviously wrong expectedUpdatedAt fails
    const staleEdit = await service.update('u1', pageId, {
      name: 'Stale',
      expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
    });
    expect(staleEdit.ok).toBe(false);
    if (!staleEdit.ok) {
      expect(staleEdit.error.kind).toBe('stale_write');
    }
  });
});

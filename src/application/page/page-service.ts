import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { PermissionService } from '../auth/permissions';
import type { PageRepository, PageRecord } from '../ports/page-repository';
import type { ProjectRepository } from '../ports/project-repository';
import type { ValidationIssue } from '../validation/issues';
import { pageCreateSchema, pageUpdateSchema } from '../validation/schemas';
import type { PageCreateInput, PageUpdateInput } from '../validation/schemas';
import { validate } from '../validation/validate';

export type PageServiceError =
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'validation'; issues: ValidationIssue[] }
  | { kind: 'duplicate_custom_id' }
  | { kind: 'cross_project_parent' }
  | { kind: 'in_use'; reason: string };

/**
 * Page/Screen CRUD within a project (REQ-DOM-001, REQ-API-001). Writes are
 * scoped to a project and gated on the actor's edit grant; all rules come from
 * the shared validation layer.
 */
export class PageService {
  constructor(
    private readonly pages: PageRepository,
    private readonly projects: ProjectRepository,
    private readonly permissions: PermissionService,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async create(
    actorId: string,
    projectId: string,
    input: PageCreateInput,
  ): Promise<Result<{ pageId: string; created: boolean }, PageServiceError>> {
    const parsed = validate(pageCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }
    if ((await this.projects.getProjectById(projectId)) === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const data = parsed.value;
    // Idempotent upsert on custom_id (REQ-IMP-003).
    if (data.customId !== undefined) {
      const existing = await this.pages.getPageByCustomId(projectId, data.customId);
      if (existing !== null) {
        existing.name = data.name;
        existing.slug = data.slug;
        existing.parentId = data.parentId ?? existing.parentId;
        existing.updatedAt = this.now().toISOString();
        await this.pages.updatePage(existing);
        return ok({ pageId: existing.id, created: false });
      }
    }

    const parentId = data.parentId ?? null;
    if (parentId !== null) {
      const parent = await this.pages.getPageById(parentId);
      if (parent === null) {
        return err({ kind: 'not_found' });
      }
      if (parent.projectId !== projectId) {
        return err({ kind: 'cross_project_parent' });
      }
    }

    const pageId = this.newId();
    const nowIso = this.now().toISOString();
    await this.pages.createPage({
      id: pageId,
      projectId,
      parentId,
      name: data.name,
      slug: data.slug,
      customId: data.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return ok({ pageId, created: true });
  }

  async get(actorId: string, pageId: string): Promise<Result<PageRecord, PageServiceError>> {
    const page = await this.pages.getPageById(pageId);
    if (page === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, page.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    return ok(page);
  }

  async update(
    actorId: string,
    pageId: string,
    input: PageUpdateInput,
  ): Promise<Result<{ ok: true }, PageServiceError>> {
    const parsed = validate(pageUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }
    const page = await this.pages.getPageById(pageId);
    if (page === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, page.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const data = parsed.value;
    if (data.customId !== undefined) {
      const existing = await this.pages.getPageByCustomId(page.projectId, data.customId);
      if (existing !== null && existing.id !== pageId) {
        return err({ kind: 'duplicate_custom_id' });
      }
      page.customId = data.customId;
    }
    if (data.name !== undefined) page.name = data.name;
    if (data.slug !== undefined) page.slug = data.slug;
    if (data.parentId !== undefined) page.parentId = data.parentId ?? null;
    page.updatedAt = this.now().toISOString();
    await this.pages.updatePage(page);
    return ok({ ok: true });
  }

  /**
   * Delete a page. Refused when child pages, attached trackings, or flow
   * nodes still reference it (ADR-0025) — the editor detaches or deletes
   * those first through the endpoints that already exist.
   */
  async delete(actorId: string, pageId: string): Promise<Result<{ ok: true }, PageServiceError>> {
    const page = await this.pages.getPageById(pageId);
    if (page === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, page.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const blockers = await this.pages.getPageDeletionBlockers(pageId);
    const reasons: string[] = [];
    if (blockers.childPages > 0) reasons.push(`${String(blockers.childPages)} child page(s)`);
    if (blockers.trackings > 0) reasons.push(`${String(blockers.trackings)} tracking(s)`);
    if (blockers.flowNodes > 0) reasons.push(`${String(blockers.flowNodes)} flow node(s)`);
    if (reasons.length > 0) {
      return err({ kind: 'in_use', reason: `still referenced by ${reasons.join(', ')}` });
    }

    await this.pages.deletePage(pageId);
    return ok({ ok: true });
  }
}

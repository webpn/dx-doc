import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { PermissionService } from '../auth/permissions';
import type { ProjectRepository, ProjectRecord } from '../ports/project-repository';
import type { ValidationIssue } from '../validation/issues';
import { projectCreateSchema, projectUpdateSchema } from '../validation/schemas';
import type { ProjectCreateInput, ProjectUpdateInput } from '../validation/schemas';
import { validate } from '../validation/validate';

export type ProjectServiceError =
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'validation'; issues: ValidationIssue[] }
  | { kind: 'duplicate_custom_id' };

/**
 * Project CRUD (REQ-FDN-003, REQ-API-001). All writes go through the shared
 * validation layer — every rule defined in projectCreateSchema/updateSchema
 * applies identically when called via HTTP, the MCP server, or a direct call.
 */
export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly permissions: PermissionService,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async create(
    actorId: string,
    companyId: string,
    input: ProjectCreateInput,
  ): Promise<Result<{ projectId: string; created: boolean }, ProjectServiceError>> {
    const parsed = validate(projectCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    if (!(await this.permissions.canInCompany(actorId, companyId, 'company.manage_projects'))) {
      return err({ kind: 'forbidden' });
    }

    // Idempotent upsert: a write with a `custom_id` that already exists
    // updates the existing entity (REQ-IMP-003).
    const data = parsed.value;
    if (data.customId !== undefined) {
      const existing = await this.projects.getProjectByCustomId(companyId, data.customId);
      if (existing !== null) {
        existing.name = data.name;
        existing.slug = data.slug;
        existing.description = data.description ?? existing.description;
        existing.icon = data.icon ?? existing.icon;
        existing.tagManager = data.tagManager ?? existing.tagManager;
        existing.updatedAt = this.now().toISOString();
        // platform and lifecycle_state are not updated on upsert (they are
        // set at creation / changed via dedicated operations).
        await this.projects.updateProject(existing);
        return ok({ projectId: existing.id, created: false });
      }
    }

    const projectId = this.newId();
    const nowIso = this.now().toISOString();
    await this.projects.createProject({
      id: projectId,
      companyId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      icon: data.icon ?? null,
      platform: data.platform,
      tagManager: data.tagManager ?? null,
      lifecycleState: 'active',
      integrationSettings: null,
      customId: data.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    return ok({ projectId, created: true });
  }

  async list(
    actorId: string,
    companyId: string,
  ): Promise<Result<ProjectServiceRecord[], ProjectServiceError>> {
    const projects = await this.projects.listProjectsForCompany(companyId);
    const accessible: ProjectServiceRecord[] = [];
    for (const p of projects) {
      if (await this.permissions.canOnProject(actorId, p.id, 'project.read')) {
        accessible.push(p);
      }
    }
    return ok(accessible);
  }

  async get(
    actorId: string,
    projectId: string,
  ): Promise<Result<ProjectServiceRecord, ProjectServiceError>> {
    const project = await this.projects.getProjectById(projectId);
    if (project === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    return ok(project);
  }

  async update(
    actorId: string,
    projectId: string,
    input: ProjectUpdateInput,
  ): Promise<Result<{ ok: true }, ProjectServiceError>> {
    const parsed = validate(projectUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const project = await this.projects.getProjectById(projectId);
    if (project === null) {
      return err({ kind: 'not_found' });
    }
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.manage'))) {
      return err({ kind: 'forbidden' });
    }

    const data = parsed.value;
    // If the input provides a custom_id that is already used by another
    // project in the same company, reject.
    if (data.customId !== undefined) {
      const existing = await this.projects.getProjectByCustomId(project.companyId, data.customId);
      if (existing !== null && existing.id !== projectId) {
        return err({ kind: 'duplicate_custom_id' });
      }
      project.customId = data.customId;
    }
    if (data.name !== undefined) project.name = data.name;
    if (data.slug !== undefined) project.slug = data.slug;
    if (data.description !== undefined) project.description = data.description ?? null;
    if (data.icon !== undefined) project.icon = data.icon ?? null;
    if (data.platform !== undefined) project.platform = data.platform;
    if (data.tagManager !== undefined) project.tagManager = data.tagManager ?? null;
    project.updatedAt = this.now().toISOString();
    await this.projects.updateProject(project);
    return ok({ ok: true });
  }
}

/** Public shape of a project (excludes integration_settings). */
export type ProjectServiceRecord = Omit<ProjectRecord, 'integrationSettings'>;

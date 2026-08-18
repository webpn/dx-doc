import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { ProjectGrant } from '../ports/account-repository';
import type { AccountRepository } from '../ports/account-repository';
import type { ProjectRepository } from '../ports/project-repository';

import type { ProjectAction } from './permissions';
import { PermissionService } from './permissions';
import { isCompanyRoleName, type CompanyRoleName } from './roles';

export type GrantServiceError =
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'invalid_role' };

/** The project action that gates grant administration (REQ-SEC-003). */
export const GRANT_ADMIN_ACTION: ProjectAction = 'project.manage_access';

/**
 * Per-project grant administration (REQ-SEC-003). One project at a time — no
 * bulk grant or revoke, and no view of everything one user can reach across
 * projects (the requirement is about that being deliberate).
 *
 * Every operation is gated on `project.manage_access` against the acting
 * user's grant on the target project (roles.ts: admin and project_manager).
 * Ownership is enforced: a grant may only be set for a user of the same
 * company as the project, so access cannot silently widen across tenants.
 */
export class GrantService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly projects: ProjectRepository,
    private readonly permissions: PermissionService,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  /**
   * Create or update the grant for `userId` on `projectId` at `roleName`.
   * Idempotent set: an existing grant has its role changed, a missing one is
   * created. The creator's auto-grant on creation (ProjectService.create) is
   * exactly this shape, minus the permission check.
   */
  async setRole(
    actorId: string,
    projectId: string,
    userId: string,
    roleName: string,
  ): Promise<Result<{ roleName: CompanyRoleName }, GrantServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, GRANT_ADMIN_ACTION))) {
      return err({ kind: 'forbidden' });
    }
    if (!isCompanyRoleName(roleName)) {
      return err({ kind: 'invalid_role' });
    }

    const project = await this.projects.getProjectById(projectId);
    if (project === null) {
      return err({ kind: 'not_found' });
    }
    const target = await this.accounts.getUserById(userId);
    if (target === null || target.companyId !== project.companyId) {
      return err({ kind: 'not_found' });
    }

    // Grant rows reference the company's role for this role name (schema v1:
    // role_id → roles.id). The company's roles are the only valid targets —
    // an instance admin outside any tenant can never be granted (no company).
    const companyRoles = await this.accounts.listRolesForCompany(project.companyId);
    const role = companyRoles.find((candidate) => candidate.name === roleName);
    if (role === undefined) {
      return err({ kind: 'not_found' });
    }

    const nowIso = this.now().toISOString();
    const existing = await this.accounts.getGrantForProjectAndUser(projectId, userId);
    if (existing === null) {
      await this.accounts.createGrant({
        id: this.newId(),
        projectId,
        userId,
        roleId: role.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    } else if (existing.roleName !== roleName) {
      await this.accounts.updateGrantRole(existing.id, role.id, nowIso);
    }

    return ok({ roleName });
  }

  async revoke(
    actorId: string,
    projectId: string,
    userId: string,
  ): Promise<Result<{ ok: true }, GrantServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, GRANT_ADMIN_ACTION))) {
      return err({ kind: 'forbidden' });
    }
    const existing = await this.accounts.getGrantForProjectAndUser(projectId, userId);
    if (existing !== null) {
      await this.accounts.revokeGrant(existing.id);
    }
    // Revoking an absent grant is a deliberate no-op success: there is no
    // access left to remove.
    return ok({ ok: true });
  }

  async list(
    actorId: string,
    projectId: string,
  ): Promise<Result<ProjectGrant[] | null, GrantServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, GRANT_ADMIN_ACTION))) {
      return err({ kind: 'forbidden' });
    }
    const project = await this.projects.getProjectById(projectId);
    if (project === null) {
      return err({ kind: 'not_found' });
    }
    return ok(await this.accounts.listGrantsForProject(projectId));
  }
}

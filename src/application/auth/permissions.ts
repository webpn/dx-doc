import type { AccountRepository, UserAccount } from '../ports/account-repository';
import type { InstanceAdminStepUpRepository } from '../ports/instance-admin-stepup-repository';

import type { CompanyRoleName } from './roles';

/**
 * Authorisation model (REQ-SEC-002/003/011/014).
 *
 * Two scopes, enforced server-side from the acting user's identity:
 *   * project actions — decided by the grant's role on that project; a user
 *     with no grant can do nothing on it (REQ-SEC-003: no role confers access
 *     to an ungranted project, and even an Admin's project access is
 *     grant-scoped).
 *   * company actions — decided by the user's company role.
 * plus the discrete instance-administration capability (REQ-SEC-014).
 *
 * These tables approximate Appendix B from the documented role semantics
 * (personas.md + REQ-SEC). The grid is data-driven so the remaining Appendix B
 * rows from the external spec artefact port in as data, not code. Cells not
 * yet enumerated fail closed (denied).
 */

export type ProjectAction =
  | 'project.read'
  | 'project.export'
  | 'project.edit'
  | 'project.publish'
  | 'project.manage'
  | 'project.manage_access'
  | 'project.manage_integrations'
  | 'project.archive';

export type CompanyAction =
  | 'company.manage'
  | 'company.manage_catalogue'
  | 'company.manage_projects'
  | 'company.read_audit_log'
  | 'company.invite_user'
  | 'company.deactivate_user';

export type InstanceAction = 'instance.create_company' | 'instance.manage_admin_flag';

/** Roles allowed per project action, read from the user's grant on the project. */
export const PROJECT_ACTION_ROLES: Readonly<Record<ProjectAction, readonly CompanyRoleName[]>> = {
  'project.read': ['admin', 'project_manager', 'editor', 'viewer'],
  'project.export': ['admin', 'project_manager', 'editor', 'viewer'],
  'project.edit': ['admin', 'editor'],
  'project.publish': ['admin', 'editor'],
  'project.manage': ['admin'],
  'project.manage_access': ['admin', 'project_manager'],
  'project.manage_integrations': ['admin'],
  'project.archive': ['admin'],
};

/** Roles allowed per company action, read from the user's company role. */
export const COMPANY_ACTION_ROLES: Readonly<Record<CompanyAction, readonly CompanyRoleName[]>> = {
  // Company identity and settings (REQ-SEC-014: "everything else an Admin
  // does — projects, integrations, catalogue, branding — stays with the
  // Admin role, inside one company"). Creating a company is the
  // instance-administration power; managing an existing one is not.
  'company.manage': ['admin'],
  'company.manage_catalogue': ['admin'],
  'company.read_audit_log': ['admin'],
  // REQ-SEC-002: an Admin creates and configures projects within their company.
  'company.manage_projects': ['admin'],
  // REQ-SEC-013: invitation is issued by an Admin, Project Manager or Editor.
  'company.invite_user': ['admin', 'project_manager', 'editor'],
  // Deactivation is stronger than invitation and undoes access; fail-closed to Admin.
  'company.deactivate_user': ['admin'],
};

export class PermissionService {
  /**
   * `stepUps` is optional so every existing construction site keeps working
   * and, more importantly, so the default is the *safe* one: with no step-up
   * store there is no step-up path, and an instance administrator is denied
   * every company action exactly as before (ADR-0027).
   */
  constructor(
    private readonly accounts: AccountRepository,
    private readonly stepUps?: InstanceAdminStepUpRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** May the user perform `action` on `projectId`? Requires a matching grant. */
  async canOnProject(userId: string, projectId: string, action: ProjectAction): Promise<boolean> {
    const grants = await this.accounts.listGrantsForUser(userId);
    const grant = grants.find((candidate) => candidate.projectId === projectId);
    if (grant === undefined) {
      return false;
    }
    return PROJECT_ACTION_ROLES[action].includes(grant.roleName);
  }

  /**
   * May the user perform `action` within `companyId`? Company membership is
   * the ordinary path; an instance administrator's audited, expiring step-up
   * window is the second (ADR-0027). Nothing else admits.
   */
  async canInCompany(userId: string, companyId: string, action: CompanyAction): Promise<boolean> {
    const user = await this.accounts.getUserById(userId);
    if (!user?.active) {
      return false;
    }
    if (user.companyId === companyId && user.roleId !== null) {
      const roles = await this.accounts.listRolesForCompany(companyId);
      const role = roles.find((candidate) => candidate.id === user.roleId);
      if (role !== undefined && COMPANY_ACTION_ROLES[action].includes(role.name)) {
        return true;
      }
    }
    return this.hasCompanyStepUp(user, companyId);
  }

  /**
   * ADR-0027: an open, unexpired step-up window admits a holder of the
   * `instance_admin` capability to COMPANY actions in that one company. The
   * flag is still required — a step-up row on a non-holder grants nothing —
   * and this is deliberately never consulted by `canOnProject`, which is what
   * keeps REQ-SEC-014's no-implied-content-access rule true.
   */
  private async hasCompanyStepUp(user: UserAccount, companyId: string): Promise<boolean> {
    if (this.stepUps === undefined || !user.instanceAdmin) {
      return false;
    }
    const stepUp = await this.stepUps.getActiveStepUp(
      user.id,
      companyId,
      this.now().toISOString(),
    );
    return stepUp !== null;
  }

  /** Instance administration capability (REQ-SEC-014). */
  async canAdministerInstance(userId: string): Promise<boolean> {
    const user = await this.accounts.getUserById(userId);
    return user !== null && user.instanceAdmin && user.active;
  }

  /** Deny-by-default authorisation helper (M1.13 hardening). */
  async canOnProjectOrCompany(
    userId: string,
    action: ProjectAction | CompanyAction | InstanceAction,
    projectId?: string,
    companyId?: string,
  ): Promise<boolean> {
    // Instance scope first
    if (action.startsWith('instance')) {
      return this.canAdministerInstance(userId);
    }
    // Company scope for company-wide actions
    if (action.startsWith('company.') && companyId) {
      const companyAction = action as CompanyAction;
      return this.canInCompany(userId, companyId, companyAction);
    }
    // Project scope for project actions
    if (action.startsWith('project.') && projectId) {
      return this.canOnProject(userId, projectId, action as ProjectAction);
    }
    return false;
  }
}

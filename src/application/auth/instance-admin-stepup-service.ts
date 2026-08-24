import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { AccountRepository } from '../ports/account-repository';
import type { CompanyRepository } from '../ports/company-repository';
import type {
  InstanceAdminStepUp,
  InstanceAdminStepUpRepository,
} from '../ports/instance-admin-stepup-repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import type { PermissionService } from './permissions';

export type StepUpError =
  { kind: 'forbidden' } | { kind: 'invalid_password' } | { kind: 'not_found' };

/**
 * Instance-admin step-up windows (ADR-0027, REQ-SEC-014).
 *
 * `canInCompany` already knows how to consult an open window (`permissions.ts`);
 * this service is the only place one is ever opened or closed, and it is the
 * enforcement point for the two properties ADR-0027 requires of that act:
 * re-authentication (a stolen session cannot open a window on its own) and an
 * audit trail (`instance_admin.stepup_opened` / `instance_admin.stepup_closed`).
 * `user.companyId` is never written here — the company-less invariant belongs
 * to REQ-SEC-014, not to this service.
 */
export class InstanceAdminStepUpService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly companies: CompanyRepository,
    private readonly stepUps: InstanceAdminStepUpRepository,
    private readonly permissions: PermissionService,
    private readonly auditLogs: AuditLogRepository,
    private readonly ttlMinutes: number,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  /**
   * Opens a step-up window for one named company (ADR-0027 §1). Requires the
   * actor to hold the `instance_admin` capability and be active, and requires
   * re-authenticating with their current password — the same rule
   * `AuthService.changePassword` enforces for "prove you are still you",
   * applied here to "prove you are still you before you administer a
   * company". A wrong password never opens a window.
   */
  async openStepUp(
    actorId: string,
    companyId: string,
    password: string,
  ): Promise<Result<{ expiresAt: string }, StepUpError>> {
    if (!(await this.permissions.canAdministerInstance(actorId))) {
      return err({ kind: 'forbidden' });
    }
    const actor = await this.accounts.getUserById(actorId);
    if (actor?.passwordHash === null || actor?.passwordHash === undefined) {
      return err({ kind: 'invalid_password' });
    }
    const passwordValid = await this.hasher.verify(password, actor.passwordHash);
    if (!passwordValid) {
      return err({ kind: 'invalid_password' });
    }
    const company = await this.companies.getCompanyById(companyId);
    if (company === null) {
      return err({ kind: 'not_found' });
    }

    const nowIso = this.now().toISOString();
    const expiresAt = new Date(this.now().getTime() + this.ttlMinutes * 60_000).toISOString();
    await this.stepUps.openStepUp({
      id: this.newId(),
      userId: actorId,
      companyId,
      createdAt: nowIso,
      expiresAt,
    });

    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId,
      projectId: null,
      actorId,
      action: 'instance_admin.stepup_opened',
      entityType: 'company',
      entityId: companyId,
      details: { expiresAt },
      createdAt: nowIso,
    });

    return ok({ expiresAt });
  }

  /** Closes a window early (ADR-0027 §1). Always audited. */
  async closeStepUp(
    actorId: string,
    companyId: string,
  ): Promise<Result<{ ok: true }, StepUpError>> {
    if (!(await this.permissions.canAdministerInstance(actorId))) {
      return err({ kind: 'forbidden' });
    }
    await this.stepUps.closeStepUp(actorId, companyId);

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId,
      projectId: null,
      actorId,
      action: 'instance_admin.stepup_closed',
      entityType: 'company',
      entityId: companyId,
      details: {},
      createdAt: nowIso,
    });

    return ok({ ok: true });
  }

  /** The actor's own unexpired windows, for the UI's current-context banner. */
  async listOpenStepUps(actorId: string): Promise<Result<InstanceAdminStepUp[], StepUpError>> {
    if (!(await this.permissions.canAdministerInstance(actorId))) {
      return err({ kind: 'forbidden' });
    }
    const windows = await this.stepUps.listActiveStepUpsForUser(actorId, this.now().toISOString());
    return ok(windows);
  }
}

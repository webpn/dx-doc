import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { AccountRepository } from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import type { NewSession, SessionService } from './session-service';

const MIN_PASSWORD_LENGTH = 8;

export type LoginResult =
  | {
      ok: true;
      session: NewSession;
      user: { id: string; companyId: string | null };
      /** True for a bootstrap admin whose initial password must be changed (REQ-SEC-013). */
      passwordChangeRequired: boolean;
    }
  | { ok: false; reason: 'invalid_credentials' };

export type ChangePasswordError =
  { kind: 'invalid_current_password' } | { kind: 'weak_password' } | { kind: 'not_found' };

/**
 * Email + password login (REQ-SEC-001). A failed attempt never discloses
 * whether the address exists: a missing account, a deactivated account, a
 * wrong password and an account with no local password all return the same
 * `invalid_credentials` result.
 */
export class AuthService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionService,
    private readonly auditLogs: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  /**
   * Log in with email + password (REQ-SEC-001, D18). A company-less
   * administrator authenticates with `companyId` null (REQ-SEC-013/014); this
   * is what the first-run bootstrap account needs, because it is created
   * before any tenant exists.
   */
  async login(companyId: string | null, email: string, password: string): Promise<LoginResult> {
    const user = await this.accounts.getUserByEmail(companyId, email.trim().toLowerCase());
    const hashToCheck = user?.passwordHash ?? (await this.dummyHash());

    const valid = await this.hasher.verify(password, hashToCheck);
    if (user === null || !user.active || !valid) {
      return { ok: false, reason: 'invalid_credentials' };
    }

    const session = await this.sessions.create(user.id);

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId: user.companyId ?? null,
      projectId: null,
      actorId: user.id,
      action: 'session.login',
      entityType: 'session',
      entityId: session.sessionId,
      details: { email: user.email },
      createdAt: nowIso,
      actorKind: 'session',
    });

    return {
      ok: true,
      session,
      user: { id: user.id, companyId: user.companyId },
      passwordChangeRequired: user.passwordMustChange,
    };
  }

  /**
   * Change the current user's password (REQ-SEC-013 first-login change and
   * routine changes). Requires the current password; clears the
   * password-must-change flag once a new password is set.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Result<{ ok: true }, ChangePasswordError>> {
    const user = await this.accounts.getUserById(userId);
    if (user === null) {
      return err({ kind: 'not_found' });
    }
    if (user.passwordHash === null || !user.active) {
      return err({ kind: 'not_found' });
    }
    const currentValid = await this.hasher.verify(currentPassword, user.passwordHash);
    if (!currentValid) {
      return err({ kind: 'invalid_current_password' });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return err({ kind: 'weak_password' });
    }
    user.passwordHash = await this.hasher.hash(newPassword);
    user.passwordMustChange = false;
    user.updatedAt = this.now().toISOString();
    await this.accounts.updateUser(user);

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId: user.companyId ?? null,
      projectId: null,
      actorId: userId,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
      details: {},
      createdAt: nowIso,
      actorKind: 'session',
    });

    return ok({ ok: true });
  }

  private cachedDummyHash: string | null = null;

  /** A real bcrypt compare runs even when the account is absent (timing parity). */
  private async dummyHash(): Promise<string> {
    return (this.cachedDummyHash ??= await this.hasher.hash('dx-doc-dummy-password'));
  }
}

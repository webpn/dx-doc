import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { AccountRepository } from '../ports/account-repository';
import type { EmailSender } from '../ports/email-sender';
import type { PasswordHasher } from '../ports/password-hasher';
import type { PasswordResetTokenRepository } from '../ports/reset-token-repository';
import type { SessionRepository } from '../ports/session-repository';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import type { PermissionService } from './permissions';
import { generateSessionToken, hashSessionToken } from './tokens';

export type LifecycleError =
  | { kind: 'forbidden' }
  | { kind: 'invalid_email' }
  | { kind: 'not_found' }
  | { kind: 'invalid_or_expired_token' }
  | { kind: 'weak_password' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Account lifecycle (REQ-SEC-013): invitation, deactivation, and self-service
 * password reset. Password reset never discloses whether the address exists —
 * a request for an unknown, password-less, or deactivated account is a no-op.
 */
export class LifecycleService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly sessions: SessionRepository,
    private readonly permissions: PermissionService,
    private readonly email: EmailSender,
    private readonly appUrl: string,
    private readonly resetTtlMs: number,
    private readonly auditLogs: AuditLogRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async inviteUser(
    actorId: string,
    companyId: string,
    email: string,
  ): Promise<Result<{ userId: string }, LifecycleError>> {
    if (!(await this.permissions.canInCompany(actorId, companyId, 'company.invite_user'))) {
      return err({ kind: 'forbidden' });
    }
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      return err({ kind: 'invalid_email' });
    }
    const userId = this.newId();
    // An invitation carries no role and no grants — those are assigned
    // separately and deliberately (REQ-SEC-013, REQ-SEC-004).
    await this.accounts.createUser({
      id: userId,
      companyId,
      email: trimmed,
      passwordHash: null,
      createdAt: this.now().toISOString(),
    });

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId,
      projectId: null,
      actorId,
      action: 'user.invited',
      entityType: 'user',
      entityId: userId,
      details: { email: trimmed },
      createdAt: nowIso,
    });

    return ok({ userId });
  }

  async deactivateUser(
    actorId: string,
    companyId: string,
    targetUserId: string,
  ): Promise<Result<{ ok: true }, LifecycleError>> {
    if (!(await this.permissions.canInCompany(actorId, companyId, 'company.deactivate_user'))) {
      return err({ kind: 'forbidden' });
    }
    const target = await this.accounts.getUserById(targetUserId);
    if (target === null) {
      return err({ kind: 'not_found' });
    }
    if (target.companyId !== companyId) {
      return err({ kind: 'not_found' });
    }
    target.active = false;
    target.updatedAt = this.now().toISOString();
    await this.accounts.updateUser(target);
    // End every session immediately; login also rejects deactivated users.
    await this.sessions.deleteAllForUser(targetUserId);

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId,
      projectId: null,
      actorId,
      action: 'user.deactivated',
      entityType: 'user',
      entityId: targetUserId,
      details: { email: target.email },
      createdAt: nowIso,
    });

    return ok({ ok: true });
  }

  /**
   * Grant or revoke the instance-administration capability (REQ-SEC-014).
   * Only an existing holder can change it; the change is a deliberate,
   * auditable act (audit recording is an M1.9 concern).
   */
  async setInstanceAdmin(
    actorId: string,
    targetUserId: string,
    value: boolean,
  ): Promise<Result<{ ok: true }, LifecycleError>> {
    if (!(await this.permissions.canAdministerInstance(actorId))) {
      return err({ kind: 'forbidden' });
    }
    const target = await this.accounts.getUserById(targetUserId);
    if (target === null) {
      return err({ kind: 'not_found' });
    }
    target.instanceAdmin = value;
    target.updatedAt = this.now().toISOString();
    await this.accounts.updateUser(target);

    const nowIso = this.now().toISOString();
    await this.auditLogs.appendLog({
      id: this.newId(),
      companyId: target.companyId ?? null,
      projectId: null,
      actorId,
      action: 'user.instance_admin_changed',
      entityType: 'user',
      entityId: targetUserId,
      details: { value },
      createdAt: nowIso,
    });

    return ok({ ok: true });
  }

  async requestPasswordReset(companyId: string | null, email: string): Promise<void> {
    const user = await this.accounts.getUserByEmail(companyId, email.trim().toLowerCase());
    // Uniform no-op for unknown, password-less (SSO), or deactivated accounts.
    if (user === null) {
      return;
    }
    if (user.passwordHash === null || !user.active) {
      return;
    }
    const token = generateSessionToken();
    await this.resetTokens.save({
      id: this.newId(),
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(this.now().getTime() + this.resetTtlMs).toISOString(),
      usedAt: null,
      createdAt: this.now().toISOString(),
    });
    const resetLink = `${this.appUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
    await this.email.send({
      to: user.email,
      subject: 'dx-doc password reset',
      text: `Use this link to reset your password (single use, valid for a limited time):\n\n${resetLink}\n\nIf you did not request this, you can ignore this message.`,
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<Result<{ ok: true }, LifecycleError>> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return err({ kind: 'weak_password' });
    }
    const record = await this.resetTokens.findByTokenHash(hashSessionToken(token));
    if (record === null) {
      return err({ kind: 'invalid_or_expired_token' });
    }
    if (record.usedAt !== null || Date.parse(record.expiresAt) <= this.now().getTime()) {
      return err({ kind: 'invalid_or_expired_token' });
    }
    const user = await this.accounts.getUserById(record.userId);
    if (user === null) {
      return err({ kind: 'invalid_or_expired_token' });
    }
    if (!user.active) {
      return err({ kind: 'invalid_or_expired_token' });
    }
    user.passwordHash = await this.hasher.hash(newPassword);
    user.updatedAt = this.now().toISOString();
    await this.accounts.updateUser(user);
    await this.resetTokens.markUsed(record.id, this.now().toISOString());
    return ok({ ok: true });
  }
}

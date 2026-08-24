import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { AccountRepository, UserAccount } from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { AuditLogRepository } from '../ports/tracking-repositories';

import type { NewSession, SessionService } from './session-service';

const MIN_PASSWORD_LENGTH = 8;

export type LoginResult =
  | {
      ok: true;
      session: NewSession;
      /**
       * `instanceAdmin` tells the client shell which surface to render
       * (REQ-SEC-014/015, ADR-0027): only a holder can create a company or open
       * a step-up window. It is a capability marker, not an authorisation —
       * every request is re-checked server-side regardless of what the client
       * believes.
       */
      user: { id: string; companyId: string | null; instanceAdmin: boolean };
      /** True for a bootstrap admin whose initial password must be changed (REQ-SEC-013). */
      passwordChangeRequired: boolean;
    }
  | {
      /**
       * The address resolves to accounts in several companies and no company was
       * supplied, so the caller must pick one and log in again with it. Only
       * returned once the password has been verified, so it never discloses
       * whether an address exists.
       */
      ok: false;
      reason: 'company_selection_required';
      companyIds: string[];
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
   * Log in with email + password (REQ-SEC-001, D18). An email address is unique
   * only within a company (`users_company_email_unique`), so the same address
   * may hold several accounts. With an explicit `companyId` the lookup is exact.
   * Without one, the address is resolved in this order:
   *
   * 1. an instance administrator (no company) wins — that account is the master
   *    control panel and must not be shadowed by a tenant account;
   * 2. exactly one usable company account — log straight into it;
   * 3. several — return `company_selection_required` so the caller can choose.
   *
   * The ambiguity is only ever resolved for a password that actually verifies,
   * so this discloses nothing about which addresses exist.
   */
  async login(companyId: string | null, email: string, password: string): Promise<LoginResult> {
    const normalisedEmail = email.trim().toLowerCase();

    if (companyId !== null) {
      return await this.completeLogin(
        await this.accounts.getUserByEmail(companyId, normalisedEmail),
        password,
      );
    }

    const candidates = (await this.accounts.listUsersByEmail(normalisedEmail)).filter(
      (candidate) => candidate.active,
    );

    // An instance administrator has no company, so it is both the rule-1 match
    // and the only account `getUserByEmail(null, …)` would have found.
    const instanceAdmin = candidates.find((candidate) => candidate.companyId === null);
    if (instanceAdmin !== undefined) {
      return await this.completeLogin(instanceAdmin, password);
    }

    if (candidates.length > 1) {
      // Verify the password against a real account before admitting the address
      // resolves to anything at all.
      // An account with no local password can never satisfy a password login,
      // so treat it as a miss rather than passing null to the hasher.
      const [first] = candidates;
      if (
        first?.passwordHash === undefined ||
        first.passwordHash === null ||
        !(await this.hasher.verify(password, first.passwordHash))
      ) {
        await this.dummyHash();
        return { ok: false, reason: 'invalid_credentials' };
      }
      return {
        ok: false,
        reason: 'company_selection_required',
        companyIds: candidates
          .map((candidate) => candidate.companyId)
          .filter((id): id is string => id !== null),
      };
    }

    return await this.completeLogin(candidates[0] ?? null, password);
  }

  /**
   * Verify a resolved candidate and open a session. Kept separate so every path
   * through `login` performs the same constant-time password check, including
   * the one where no account was found at all.
   */
  private async completeLogin(user: UserAccount | null, password: string): Promise<LoginResult> {
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
      user: { id: user.id, companyId: user.companyId, instanceAdmin: user.instanceAdmin },
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

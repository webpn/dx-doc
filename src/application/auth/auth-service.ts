import type { AccountRepository } from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';

import type { NewSession, SessionService } from './session-service';

export type LoginResult =
  | { ok: true; session: NewSession; user: { id: string; companyId: string | null } }
  | { ok: false; reason: 'invalid_credentials' };

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
  ) {}

  async login(companyId: string, email: string, password: string): Promise<LoginResult> {
    const user = await this.accounts.getUserByEmail(companyId, email.trim().toLowerCase());
    const hashToCheck = user?.passwordHash ?? (await this.dummyHash());

    const valid = await this.hasher.verify(password, hashToCheck);
    if (user === null || !user.active || !valid) {
      return { ok: false, reason: 'invalid_credentials' };
    }

    const session = await this.sessions.create(user.id);
    return { ok: true, session, user: { id: user.id, companyId: user.companyId } };
  }

  private cachedDummyHash: string | null = null;

  /** A real bcrypt compare runs even when the account is absent (timing parity). */
  private async dummyHash(): Promise<string> {
    return (this.cachedDummyHash ??= await this.hasher.hash('dx-doc-dummy-password'));
  }
}

import { randomUUID } from 'node:crypto';

import type { AccountRepository } from '../ports/account-repository';
import type { PasswordHasher } from '../ports/password-hasher';

export type BootstrapResult =
  | { applied: true; instanceAdminUserId: string }
  | { applied: false; reason: 'already_initialized' };

export interface BootstrapVariables {
  email: string | undefined;
  password: string | undefined;
}

/** Thrown when a fresh instance has no bootstrap administrator configured. */
export class BootstrapConfigError extends Error {
  constructor(missingVariables: readonly string[]) {
    super(
      `Instance has no users and no bootstrap administrator configured — set ${missingVariables.join(
        ' and ',
      )} to create the first instance administrator (REQ-SEC-013).`,
    );
    this.name = 'BootstrapConfigError';
  }
}

/**
 * First-run bootstrap (REQ-SEC-013, REQ-SEC-014): reads the bootstrap variables
 * exactly once, when the instance has no users, and creates the single
 * instance administrator (instance_admin). The administrator is company-less
 * — they create the first company (possibly a stub) via the create-company
 * capability (REQ-SEC-015). On any instance that already has a user, the
 * variables are ignored entirely.
 */
export class BootstrapService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async bootstrapFirstAdmin(vars: BootstrapVariables): Promise<BootstrapResult> {
    const userCount = await this.accounts.countUsers();
    if (userCount > 0) {
      return { applied: false, reason: 'already_initialized' };
    }

    const missing: string[] = [];
    if (this.isBlank(vars.email)) {
      missing.push('BOOTSTRAP_ADMIN_EMAIL');
    }
    if (this.isBlank(vars.password)) {
      missing.push('BOOTSTRAP_ADMIN_PASSWORD');
    }
    if (missing.length > 0) {
      throw new BootstrapConfigError(missing);
    }

    const id = this.newId();
    await this.accounts.createUser({
      id,
      companyId: null,
      email: this.email(vars.email),
      passwordHash: await this.hasher.hash(this.value(vars.password)),
      createdAt: this.now().toISOString(),
    });
    const admin = await this.accounts.getUserById(id);
    if (admin !== null) {
      admin.instanceAdmin = true;
      admin.updatedAt = this.now().toISOString();
      await this.accounts.updateUser(admin);
    }
    return { applied: true, instanceAdminUserId: id };
  }

  private isBlank(value: string | undefined): boolean {
    return value === undefined || value.trim() === '';
  }

  private email(value: string | undefined): string {
    return this.value(value).trim().toLowerCase();
  }

  private value(value: string | undefined): string {
    if (value === undefined) {
      throw new BootstrapConfigError(['BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_PASSWORD']);
    }
    return value;
  }
}

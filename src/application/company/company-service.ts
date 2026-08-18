import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { PermissionService } from '../auth/permissions';
import { COMPANY_ROLE_NAMES } from '../auth/roles';
import type { AccountRepository } from '../ports/account-repository';
import type { CompanyRepository } from '../ports/company-repository';

export type CompanyError = { kind: 'forbidden' } | { kind: 'invalid_input' };

/**
 * Company lifecycle (REQ-FDN-002, REQ-SEC-014). Creating a company — including
 * the first one — is an instance-administration power: the instance admin
 * creates tenants rather than belonging to a pre-made one. A company can be
 * created as a stub: only identity (name + slug) is required; configuration,
 * branding and the like are added later by that company's Admin.
 */
export class CompanyService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly companies: CompanyRepository,
    private readonly permissions: PermissionService,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  async createCompany(
    actorId: string,
    input: { name: string; slug: string },
  ): Promise<Result<{ companyId: string }, CompanyError>> {
    if (!(await this.permissions.canAdministerInstance(actorId))) {
      return err({ kind: 'forbidden' });
    }
    const name = input.name.trim();
    const slug = input.slug.trim();
    if (name === '' || slug === '') {
      return err({ kind: 'invalid_input' });
    }

    const companyId = this.newId();
    const nowIso = this.now().toISOString();
    await this.companies.createCompany({
      id: companyId,
      name,
      slug,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // A tenant is unusable without its four company roles (REQ-SEC-002).
    for (const roleName of COMPANY_ROLE_NAMES) {
      await this.accounts.createRole({ id: this.newId(), companyId, name: roleName });
    }

    return ok({ companyId });
  }
}

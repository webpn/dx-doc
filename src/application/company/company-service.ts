import { randomUUID } from 'node:crypto';

import { err, ok, type Result } from '@project/shared';

import type { PermissionService } from '../auth/permissions';
import { COMPANY_ROLE_NAMES } from '../auth/roles';
import type { AccountRepository } from '../ports/account-repository';
import type { CompanyRecord, CompanyRepository } from '../ports/company-repository';
import type { ValidationIssue } from '../validation/issues';
import { companyUpdateSchema, type CompanyUpdateInput } from '../validation/schemas';
import { validate } from '../validation/validate';

export type CompanyError =
  | { kind: 'forbidden' }
  | { kind: 'invalid_input' }
  | { kind: 'not_found' }
  | { kind: 'validation'; issues: ValidationIssue[] };

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

  /**
   * Read a company's own identity. The instance administrator reads any
   * company (REQ-SEC-014); anyone else may only read the company they
   * belong to — this is identity, not documentation content, so no project
   * grant is involved.
   */
  async get(actorId: string, companyId: string): Promise<Result<CompanyRecord, CompanyError>> {
    const company = await this.companies.getCompanyById(companyId);
    if (company === null) {
      return err({ kind: 'not_found' });
    }
    if (await this.permissions.canAdministerInstance(actorId)) {
      return ok(company);
    }
    const actor = await this.accounts.getUserById(actorId);
    if (actor === null || !actor.active || actor.companyId !== companyId) {
      return err({ kind: 'forbidden' });
    }
    return ok(company);
  }

  /**
   * Rename a company / change its slug. An Admin manages their own company's
   * identity (REQ-SEC-014: "everything else... stays with the Admin role");
   * the instance administrator may also act on any company.
   */
  async update(
    actorId: string,
    companyId: string,
    input: CompanyUpdateInput,
  ): Promise<Result<{ ok: true }, CompanyError>> {
    const parsed = validate(companyUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }
    const company = await this.companies.getCompanyById(companyId);
    if (company === null) {
      return err({ kind: 'not_found' });
    }
    const allowed =
      (await this.permissions.canAdministerInstance(actorId)) ||
      (await this.permissions.canInCompany(actorId, companyId, 'company.manage'));
    if (!allowed) {
      return err({ kind: 'forbidden' });
    }

    const data = parsed.value;
    if (data.name !== undefined) company.name = data.name;
    if (data.slug !== undefined) company.slug = data.slug;
    company.updatedAt = this.now().toISOString();
    await this.companies.updateCompany(company);
    return ok({ ok: true });
  }
}

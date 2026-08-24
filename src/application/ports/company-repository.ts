/**
 * Company persistence port. A Company is the tenant boundary (REQ-FDN-002).
 * Companies are created by the instance administrator (REQ-SEC-015), and the
 * first company may be created as a stub — nothing but identity is required.
 */
export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRepository {
  createCompany(company: CompanyRecord): Promise<void>;
  getCompanyById(id: string): Promise<CompanyRecord | null>;
  /** All companies (REQ-SEC-015), ordered by name. Instance-admin surface only. */
  listCompanies(): Promise<CompanyRecord[]>;
  /**
   * Applies `company`'s fields. When `expectedUpdatedAt` is provided, the
   * write is atomically guarded by `WHERE updated_at = expectedUpdatedAt`
   * (REQ-AUTH-005, ADR-0016): returns `false` and applies nothing if the row
   * has since changed, `true` if the write landed. Omitting the guard writes
   * unconditionally (last-write-wins) and returns `true`.
   */
  updateCompany(company: CompanyRecord, expectedUpdatedAt?: string): Promise<boolean>;
  /**
   * Permanently deletes the company and everything scoped to it — every
   * project (and that project's pages, trackings, flows, versions,
   * shared passwords), every company-scoped catalogue item (properties,
   * modules, destinations, tracking templates not scoped to one project),
   * every role, user, session, token and audit entry (REQ-SEC-015). There is
   * no undo: this is a true hard delete, not archival (ADR-0027).
   */
  deleteCompanyCascade(companyId: string): Promise<void>;
  /** Project count for one company — the count REQ-SEC-015's list surfaces. */
  countProjectsForCompany(companyId: string): Promise<number>;
}

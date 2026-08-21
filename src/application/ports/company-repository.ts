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
  /**
   * Applies `company`'s fields. When `expectedUpdatedAt` is provided, the
   * write is atomically guarded by `WHERE updated_at = expectedUpdatedAt`
   * (REQ-AUTH-005, ADR-0016): returns `false` and applies nothing if the row
   * has since changed, `true` if the write landed. Omitting the guard writes
   * unconditionally (last-write-wins) and returns `true`.
   */
  updateCompany(company: CompanyRecord, expectedUpdatedAt?: string): Promise<boolean>;
}

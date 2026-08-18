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
  updateCompany(company: CompanyRecord): Promise<void>;
}

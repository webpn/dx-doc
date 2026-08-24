import { apiRequest } from './client';

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreateInput {
  name: string;
  slug: string;
  /**
   * Optional first-Admin provisioning (REQ-SEC-014). A new company otherwise
   * has no member who could pass `canInCompany`, so supplying this seeds its
   * first Admin in the same operation. Omit `password` for a password-less
   * account that must set one at first login.
   */
  firstAdmin?: { email: string; password?: string };
}

export interface CompanyUpdateInput extends Partial<CompanyCreateInput> {
  expectedUpdatedAt?: string;
}

export const companiesApi = {
  create(input: CompanyCreateInput): Promise<{ companyId: string }> {
    return apiRequest<{ companyId: string }>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  get(id: string): Promise<CompanyRecord> {
    return apiRequest<CompanyRecord>(`/api/companies/${encodeURIComponent(id)}`);
  },
  update(id: string, input: CompanyUpdateInput): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/api/companies/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};

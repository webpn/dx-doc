import { useMutation, useQuery } from '@tanstack/react-query';

import { companiesApi, type CompanyCreateInput } from '../api';

import { queryKeys } from './keys';

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.company(companyId),
    queryFn: () => companiesApi.get(companyId),
  });
}

// No GET /api/companies list endpoint exists — a company is reachable only
// once its id is known (from login, or from creating it), so there is no
// query to invalidate after create.
export function useCreateCompany() {
  return useMutation({
    mutationFn: (input: CompanyCreateInput) => companiesApi.create(input),
  });
}

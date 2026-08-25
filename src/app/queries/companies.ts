import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { companiesApi, type CompanyCreateInput } from '../api';

import { queryKeys } from './keys';

/** All companies with project counts (REQ-SEC-015) — instance-admin surface only. */
export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies(),
    queryFn: () => companiesApi.list(),
  });
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.company(companyId),
    queryFn: () => companiesApi.get(companyId),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyCreateInput) => companiesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => companiesApi.remove(companyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
    },
  });
}

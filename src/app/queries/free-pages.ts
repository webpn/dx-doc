import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { freePagesApi, type FreePageCreateInput, type FreePageUpdateInput } from '../api';

import { queryKeys } from './keys';

export function useFreePages(companyId: string | undefined, projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.freePages(companyId ?? '', projectId),
    queryFn: () => freePagesApi.list(companyId ?? '', projectId),
    enabled: companyId !== undefined,
  });
}

export function useFreePage(freePageId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.freePage(freePageId ?? ''),
    queryFn: () => freePagesApi.get(freePageId ?? ''),
    enabled: freePageId !== undefined,
  });
}

export function useCreateFreePage(companyId: string, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FreePageCreateInput) => freePagesApi.create(companyId, projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.freePages(companyId, projectId) });
    },
  });
}

export function useUpdateFreePage(freePageId: string, companyId: string, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FreePageUpdateInput) => freePagesApi.update(freePageId, input),
    onSuccess: () => {
      // The page itself and the listing: a rename, a re-parent or a
      // publishable-flag flip changes how the page appears in the hierarchy,
      // not just its own record.
      void queryClient.invalidateQueries({ queryKey: queryKeys.freePage(freePageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.freePages(companyId, projectId) });
    },
  });
}

export function useDeleteFreePage(companyId: string, projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (freePageId: string) => freePagesApi.remove(freePageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.freePages(companyId, projectId) });
    },
  });
}

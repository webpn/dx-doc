import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sharedPasswordsApi, type SharedPasswordCreateInput } from '../api';

import { queryKeys } from './keys';

export function useSharedPasswords(projectId: string) {
  return useQuery({
    queryKey: queryKeys.sharedPasswords(projectId),
    queryFn: () => sharedPasswordsApi.list(projectId),
  });
}

export function useCreateSharedPassword(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SharedPasswordCreateInput) => sharedPasswordsApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sharedPasswords(projectId) });
    },
  });
}

export function useRemoveSharedPassword(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sharedPasswordId: string) =>
      sharedPasswordsApi.remove(projectId, sharedPasswordId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sharedPasswords(projectId) });
    },
  });
}

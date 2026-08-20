import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { grantsApi, type RoleName } from '../api';

import { queryKeys } from './keys';

export function useGrants(projectId: string) {
  return useQuery({
    queryKey: queryKeys.grants(projectId),
    queryFn: () => grantsApi.list(projectId),
  });
}

export function useSetGrant(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; roleName: RoleName }) =>
      grantsApi.set(projectId, input.userId, input.roleName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grants(projectId) });
    },
  });
}

export function useRemoveGrant(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => grantsApi.remove(projectId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.grants(projectId) });
    },
  });
}

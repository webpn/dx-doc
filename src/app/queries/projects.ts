import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { projectsApi, type ProjectCreateInput, type ProjectUpdateInput } from '../api';

import { queryKeys } from './keys';

export function useProjects(companyId: string | null) {
  return useQuery({
    queryKey: queryKeys.projects(companyId ?? ''),
    queryFn: () => projectsApi.list(companyId ?? ''),
    enabled: companyId !== null,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => projectsApi.get(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

export function useCreateProject(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCreateInput) => projectsApi.create(companyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects(companyId) });
    },
  });
}

export function useUpdateProject(projectId: string, companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectUpdateInput) => projectsApi.update(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects(companyId) });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pagesApi, type PageCreateInput, type PageUpdateInput } from '../api';

import { queryKeys } from './keys';

export function usePages(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pages(projectId ?? ''),
    queryFn: () => pagesApi.list(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

export function usePage(pageId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.page(pageId ?? ''),
    queryFn: () => pagesApi.get(pageId ?? ''),
    enabled: pageId !== undefined,
  });
}

export function useCreatePage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PageCreateInput) => pagesApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages(projectId) });
    },
  });
}

export function useUpdatePage(pageId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PageUpdateInput) => pagesApi.update(pageId, input),
    onSuccess: () => {
      // The page itself and the project's hierarchy: a rename or a re-parent
      // changes how the page appears in the tree, not just its own record.
      void queryClient.invalidateQueries({ queryKey: queryKeys.page(pageId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages(projectId) });
    },
  });
}

export function useDeletePage(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => pagesApi.remove(pageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pages(projectId) });
    },
  });
}

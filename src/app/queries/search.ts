import { useQuery } from '@tanstack/react-query';

import { searchApi } from '../api';

import { queryKeys } from './keys';

export function useProjectSearch(projectId: string | undefined, query: string) {
  const normalizedQuery = query.trim();
  return useQuery({
    queryKey: queryKeys.search(projectId ?? '', normalizedQuery),
    queryFn: () => searchApi.project(projectId ?? '', normalizedQuery),
    enabled: projectId !== undefined && normalizedQuery.length > 0,
  });
}

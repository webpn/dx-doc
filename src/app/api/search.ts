import { apiRequest } from './client';

export interface SearchResult {
  documentId: string;
  title: string;
  snippet: string;
}

export const searchApi = {
  project(projectId: string, query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });
    return apiRequest<SearchResult[]>(
      `/api/projects/${encodeURIComponent(projectId)}/search?${params.toString()}`,
    );
  },
};

import { apiRequest } from './client';

/**
 * A page as the API returns it (REQ-DOM-001). `description` is Markdown
 * (REQ-AUTH-001) with screenshots as image references inside it (REQ-AUTH-002);
 * `null` means the page has never been described.
 */
export interface Page {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageCreateInput {
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  customId?: string;
}

export interface PageUpdateInput {
  name?: string;
  slug?: string;
  parentId?: string;
  description?: string;
  customId?: string;
  /** Optimistic-concurrency guard (REQ-AUTH-005, ADR-0016). */
  expectedUpdatedAt?: string;
}

export const pagesApi = {
  list: (projectId: string): Promise<Page[]> =>
    apiRequest<Page[]>(`/api/projects/${projectId}/pages`),

  get: (pageId: string): Promise<Page> => apiRequest<Page>(`/api/pages/${pageId}`),

  create: (projectId: string, input: PageCreateInput): Promise<{ id: string; created: boolean }> =>
    apiRequest<{ id: string; created: boolean }>(`/api/projects/${projectId}/pages`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (pageId: string, input: PageUpdateInput): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (pageId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/pages/${pageId}`, { method: 'DELETE' }),
};

import { apiRequest } from './client';

/**
 * A free wiki page as the API returns it (REQ-AUTH-003).
 *
 * Free pages have their own hierarchy, independent of the project's
 * Page/Screen tree — `parentId` here points at another free page, never at a
 * `Page`. `projectId: null` means a company-catalogue free page rather than
 * one scoped to a project.
 */
export interface FreePage {
  id: string;
  companyId: string;
  projectId: string | null;
  title: string;
  slug: string;
  content: string;
  publishable: boolean;
  customId: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FreePageCreateInput {
  title: string;
  slug: string;
  content?: string;
  publishable?: boolean;
  customId?: string;
  parentId?: string | null;
}

export interface FreePageUpdateInput {
  title?: string;
  slug?: string;
  content?: string;
  publishable?: boolean;
  customId?: string;
  parentId?: string | null;
  /** Optimistic-concurrency guard (REQ-AUTH-005, ADR-0016). */
  expectedUpdatedAt?: string;
}

export const freePagesApi = {
  list: (companyId: string, projectId: string | null): Promise<FreePage[]> =>
    apiRequest<FreePage[]>(
      `/api/companies/${encodeURIComponent(companyId)}/free-pages${
        projectId !== null ? `?projectId=${encodeURIComponent(projectId)}` : ''
      }`,
    ),

  get: (freePageId: string): Promise<FreePage> =>
    apiRequest<FreePage>(`/api/free-pages/${encodeURIComponent(freePageId)}`),

  create: (
    companyId: string,
    projectId: string | null,
    input: FreePageCreateInput,
  ): Promise<{ id: string }> =>
    apiRequest<{ id: string }>(
      `/api/companies/${encodeURIComponent(companyId)}/free-pages${
        projectId !== null ? `?projectId=${encodeURIComponent(projectId)}` : ''
      }`,
      { method: 'POST', body: JSON.stringify(input) },
    ),

  update: (freePageId: string, input: FreePageUpdateInput): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/free-pages/${encodeURIComponent(freePageId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (freePageId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/free-pages/${encodeURIComponent(freePageId)}`, {
      method: 'DELETE',
    }),
};

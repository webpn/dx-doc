import { apiRequest } from './client';

export interface SharedPasswordRecord {
  id: string;
  projectId: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedPasswordCreateInput {
  password: string;
  label?: string;
  expiresAt?: string;
}

export const sharedPasswordsApi = {
  list(projectId: string): Promise<SharedPasswordRecord[]> {
    return apiRequest<SharedPasswordRecord[]>(
      `/api/projects/${encodeURIComponent(projectId)}/shared-passwords`,
    );
  },
  create(projectId: string, input: SharedPasswordCreateInput): Promise<{ id: string }> {
    return apiRequest<{ id: string }>(
      `/api/projects/${encodeURIComponent(projectId)}/shared-passwords`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  },
  remove(projectId: string, sharedPasswordId: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(
      `/api/projects/${encodeURIComponent(projectId)}/shared-passwords/${encodeURIComponent(sharedPasswordId)}`,
      { method: 'DELETE' },
    );
  },
};

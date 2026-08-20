import { apiRequest } from './client';

export const PLATFORMS = ['web', 'ios', 'android', 'flutter', 'react'] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface ProjectRecord {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  platform: Platform;
  tagManager: string | null;
  lifecycleState: 'active' | 'archived';
  integrationSettings: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  platform: Platform;
  tagManager?: string;
  customId?: string;
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {
  expectedUpdatedAt?: string;
}

export const projectsApi = {
  list(companyId: string): Promise<ProjectRecord[]> {
    return apiRequest<ProjectRecord[]>(`/api/companies/${encodeURIComponent(companyId)}/projects`);
  },
  create(companyId: string, input: ProjectCreateInput): Promise<{ id: string; created: boolean }> {
    return apiRequest<{ id: string; created: boolean }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ companyId, ...input }),
    });
  },
  get(id: string): Promise<ProjectRecord> {
    return apiRequest<ProjectRecord>(`/api/projects/${encodeURIComponent(id)}`);
  },
  update(id: string, input: ProjectUpdateInput): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};

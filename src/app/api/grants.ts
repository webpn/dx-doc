import { apiRequest } from './client';

export const ROLE_NAMES = ['admin', 'project_manager', 'editor', 'viewer'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export interface ProjectGrant {
  projectId: string;
  userId: string;
  roleName: RoleName;
}

/**
 * One row of the project access screen: an existing grant, or an active
 * company member who has none yet (`roleName: null`) and is eligible for a
 * first one.
 */
export interface ProjectAccessRow {
  userId: string;
  email: string;
  roleName: RoleName | null;
}

export const grantsApi = {
  list(projectId: string): Promise<{ grants: ProjectAccessRow[] }> {
    return apiRequest<{ grants: ProjectAccessRow[] }>(
      `/api/projects/${encodeURIComponent(projectId)}/grants`,
    );
  },
  set(projectId: string, userId: string, roleName: RoleName): Promise<ProjectGrant> {
    return apiRequest<ProjectGrant>(
      `/api/projects/${encodeURIComponent(projectId)}/grants/${encodeURIComponent(userId)}`,
      { method: 'PUT', body: JSON.stringify({ roleName }) },
    );
  },
  remove(projectId: string, userId: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(
      `/api/projects/${encodeURIComponent(projectId)}/grants/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
    );
  },
};

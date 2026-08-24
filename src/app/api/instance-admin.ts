import { apiRequest } from './client';

/**
 * Instance-admin step-up windows (ADR-0027).
 *
 * An instance administrator holds no company membership, so administering a
 * company requires opening a short-lived, per-company window by
 * re-authenticating. The window is server-side state; the client only opens,
 * lists and closes it.
 */
export interface InstanceAdminStepUp {
  id: string;
  userId: string;
  companyId: string;
  createdAt: string;
  expiresAt: string;
}

export interface StepUpOpenInput {
  companyId: string;
  password: string;
}

export const instanceAdminApi = {
  openStepUp(input: StepUpOpenInput): Promise<{ expiresAt: string }> {
    return apiRequest<{ expiresAt: string }>('/api/instance-admin/step-up', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  listStepUps(): Promise<InstanceAdminStepUp[]> {
    return apiRequest<InstanceAdminStepUp[]>('/api/instance-admin/step-up');
  },
  closeStepUp(companyId: string): Promise<undefined> {
    return apiRequest<undefined>(`/api/instance-admin/step-up/${encodeURIComponent(companyId)}`, {
      method: 'DELETE',
    });
  },
};

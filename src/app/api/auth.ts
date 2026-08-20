import { apiRequest } from './client';

export interface AuthenticatedUser {
  id: string;
  companyId: string | null;
}

export interface LoginResponse {
  ok: true;
  user: AuthenticatedUser;
  passwordChangeRequired: boolean;
}

export const authApi = {
  login(email: string, password: string, companyId?: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(companyId ? { companyId } : {}) }),
    });
  },
  logout(): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },
  changePassword(currentPassword: string, newPassword: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
  requestPasswordReset(email: string, companyId?: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email, ...(companyId ? { companyId } : {}) }),
    });
  },
  confirmPasswordReset(token: string, newPassword: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

import { apiRequest } from './client';

export interface AuthenticatedUser {
  id: string;
  companyId: string | null;
  /**
   * Holds the instance-administration capability (REQ-SEC-014). Decides which
   * surface the shell renders; the server re-checks every request regardless.
   */
  instanceAdmin: boolean;
}

export interface LoginResponse {
  ok: true;
  user: AuthenticatedUser;
  passwordChangeRequired: boolean;
}

/** The current session as rebuilt from the cookie by `GET /api/auth/me`. */
export interface SessionResponse {
  userId: string;
  companyId: string | null;
  instanceAdmin: boolean;
  passwordChangeRequired: boolean;
}

export const authApi = {
  login(email: string, password: string, companyId?: string): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(companyId ? { companyId } : {}) }),
    });
  },
  /**
   * The actor behind the current cookie, or a 401 (surfaced as an
   * ApiClientError) when there is no live session. Used to rehydrate the
   * in-memory session store on a full page load.
   */
  me(): Promise<SessionResponse> {
    return apiRequest<SessionResponse>('/api/auth/me', { method: 'GET' });
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

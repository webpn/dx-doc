export interface ApiError {
  code: string;
  message: string;
  issues?: unknown;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: ApiError,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface AuthenticatedUser {
  id: string;
  companyId: string | null;
}

export interface LoginResponse {
  ok: true;
  user: AuthenticatedUser;
  passwordChangeRequired: boolean;
}

export interface ProjectSummary {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  platform: string;
  lifecycleState: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const details = isApiErrorBody(body) ? body.error : undefined;
    throw new ApiClientError(details?.message ?? 'Request failed', response.status, details);
  }
  return body as T;
}

function isApiErrorBody(value: unknown): value is { error: ApiError } {
  if (value === null || typeof value !== 'object') return false;
  const error = (value as { error?: unknown }).error;
  return (
    error !== null &&
    typeof error === 'object' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

export const apiClient = {
  login(email: string, password: string, companyId?: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...(companyId ? { companyId } : {}) }),
    });
  },
  logout(): Promise<{ ok: true }> {
    return request<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  },
  listCompanies(): Promise<CompanySummary[]> {
    return request<CompanySummary[]>('/api/companies');
  },
  listProjects(companyId: string): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>(`/api/companies/${encodeURIComponent(companyId)}/projects`);
  },
};

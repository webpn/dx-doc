export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  issues?: ValidationIssue[];
  currentUpdatedAt?: string;
  reason?: string;
}

/**
 * Every entry point (HTTP/MCP/direct) shares the same error envelope
 * (REQ-FDN-010): `{ error: { code, message, issues?, currentUpdatedAt? } }`.
 * One parser covers every route.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: ValidationIssue[];
  readonly currentUpdatedAt?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.code;
    if (body.issues !== undefined) this.issues = body.issues;
    if (body.currentUpdatedAt !== undefined) this.currentUpdatedAt = body.currentUpdatedAt;
  }
}

/** A request that never reached the server (offline, DNS failure, CORS, etc.). */
export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super('Unable to reach the server');
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

function isApiErrorBody(value: unknown): value is { error: ApiErrorBody } {
  if (value === null || typeof value !== 'object') return false;
  const error = (value as { error?: unknown }).error;
  return (
    error !== null &&
    typeof error === 'object' &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('content-type', 'application/json');

  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: 'include', headers });
  } catch (cause) {
    throw new ApiNetworkError(cause);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiClientError(response.status, body.error);
    }
    throw new ApiClientError(response.status, { code: 'UNKNOWN', message: 'Request failed' });
  }
  return body as T;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from './auth';
import { ApiClientError, ApiNetworkError } from './client';
import { companiesApi } from './companies';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('returns the parsed body on success', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        user: { id: 'u1', companyId: null },
        passwordChangeRequired: false,
      }),
    );

    const result = await authApi.login('admin@example.com', 'hunter2');

    expect(result.user.id).toBe('u1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('throws ApiClientError with issues on a validation failure', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION',
          message: 'Invalid input',
          issues: [{ field: 'slug', code: 'invalid_format', message: 'must be lowercase' }],
        },
      }),
    );

    await expect(companiesApi.create({ name: 'Acme', slug: 'Acme' })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION',
      issues: [{ field: 'slug', code: 'invalid_format', message: 'must be lowercase' }],
    });
  });

  it('throws ApiClientError on an unauthorized response', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } }),
    );

    const error = await companiesApi.get('c1').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).status).toBe(401);
  });

  it('throws ApiClientError on a forbidden response', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { error: { code: 'FORBIDDEN', message: 'Not permitted' } }),
    );

    const error = await companiesApi.get('c1').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).status).toBe(403);
  });

  it('throws ApiNetworkError when the request never reaches the server', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const error = await authApi.logout().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiNetworkError);
  });
});

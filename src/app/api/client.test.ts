import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from './auth';
import { ApiClientError, ApiNetworkError, apiRequest } from './client';
import { companiesApi } from './companies';
import { searchApi } from './search';

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

  it('does not force a JSON content-type on a FormData body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 'a1', url: '/x.png', created: true }));

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'x.png');

    await apiRequest('/api/projects/p1/assets?companyId=c1', { method: 'POST', body: form });

    // The browser must set `multipart/form-data; boundary=…` itself. Forcing
    // application/json here makes the server unable to find the boundary, so
    // every upload fails with a parse error.
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('content-type')).toBeNull();
  });

  it('still sets a JSON content-type on a string body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await apiRequest('/api/anything', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
  });

  it('queries search with an explicit project scope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

    await searchApi.project('project/1', 'item_id');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project%2F1/search?q=item_id',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

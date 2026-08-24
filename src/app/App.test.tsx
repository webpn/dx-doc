import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../tests/support/render-with-providers';

import { App } from './App';
import { useSessionStore } from './stores/session-store';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * The session lives in an httpOnly cookie, which outlives the in-memory store.
 * These tests cover the boot path: on a full page load — a refresh, a pasted
 * URL, or anything that is not a client-side navigation — the app must ask the
 * server who the actor is before deciding to show the login screen.
 */
describe('App session rehydration', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useSessionStore.setState({ session: null });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    useSessionStore.setState({ session: null });
  });

  it('restores the session from the cookie and renders the requested route instead of the login page', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve(
          jsonResponse(200, {
            userId: 'u1',
            companyId: 'c1',
            instanceAdmin: false,
            passwordChangeRequired: false,
          }),
        );
      }
      // Whatever the deep-linked screen fetches is irrelevant here; the claim
      // under test is that we are NOT on the login page.
      return Promise.resolve(jsonResponse(200, []));
    });

    renderWithProviders(<App />, { route: '/companies/c1/projects/new' });

    await waitFor(() => {
      expect(useSessionStore.getState().session?.userId).toBe('u1');
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.anything());
    // The sign-in form must never appear for an actor who holds a live cookie.
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows the login page once the server says the cookie is not a session', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } }),
    );

    renderWithProviders(<App />, { route: '/companies/c1/projects/new' });

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('does not flash the login page while the session is still being resolved', async () => {
    // A pending /api/auth/me must not read as "signed out": rendering the login
    // form first and replacing it a moment later is the bug this guards.
    let release: (value: Response) => void = () => undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );

    renderWithProviders(<App />, { route: '/' });

    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();

    release(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } }),
    );
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});

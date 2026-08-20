import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../../tests/support/render-with-providers';

import { LoginPage } from './login-page';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('LoginPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('submits credentials and shows a pending state', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        user: { id: 'u1', companyId: 'c1' },
        passwordChangeRequired: false,
      }),
    );
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email address'), 'admin@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Signing in/ })).not.toBeInTheDocument();
    });
  });

  it('shows an authentication-error state on invalid credentials', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }),
    );
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email address'), 'admin@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('shows a network-error state when the request cannot reach the server', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email address'), 'admin@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server');
  });

  it('requires email and password before submitting', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText('Email address')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });
});

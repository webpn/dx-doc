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

  it('offers the companies to choose from when the email is registered with several, then signs in with the chosen one', async () => {
    // The API accepted the credentials but cannot tell which account is meant,
    // so the choice belongs on this screen rather than a separate route.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        error: {
          code: 'COMPANY_SELECTION_REQUIRED',
          message: 'This email is registered with more than one company. Choose one to continue.',
          companyIds: ['c1', 'c2'],
        },
      }),
    );
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email address'), 'shared@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const chooser = await screen.findByLabelText('Company');
    expect(chooser).toBeInTheDocument();
    // The free-text company field is replaced by the resolved choice, so the
    // user cannot be asked to type an id they have just been offered.
    expect(screen.queryByLabelText('Company ID')).not.toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        ok: true,
        user: { id: 'u2', companyId: 'c2', instanceAdmin: false },
        passwordChangeRequired: false,
      }),
    );
    await userEvent.selectOptions(chooser, 'c2');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(secondCall[1].body as string)).toMatchObject({
      email: 'shared@example.com',
      companyId: 'c2',
    });
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

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../../tests/support/render-with-providers';

import { PasswordChangePage } from './password-change-page';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('PasswordChangePage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('shows a validation-error state for a password under eight characters', async () => {
    renderWithProviders(<PasswordChangePage />);

    await userEvent.type(screen.getByLabelText('Current password'), 'oldpass1');
    await userEvent.type(screen.getByLabelText('New password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Use at least 8 characters.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces an invalid-current-password error from the server', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Wrong password' } }),
    );
    renderWithProviders(<PasswordChangePage />);

    await userEvent.type(screen.getByLabelText('Current password'), 'wrongpass');
    await userEvent.type(screen.getByLabelText('New password'), 'newpassword1');
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The current password is incorrect.',
    );
  });
});

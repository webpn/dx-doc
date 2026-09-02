import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../../tests/support/render-with-providers';
import { ApiClientError } from '../../api';
import type * as Queries from '../../queries';

import { ReaderAccessPage } from './reader-access-page';

const { navigate, verify } = vi.hoisted(() => ({
  navigate: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useVerifySharedPassword: () => ({ mutateAsync: verify, isPending: false }),
  };
});

/**
 * The shared-password entry point (M1.17, REQ-VIEW-001). A wrong password is
 * a 200 with `verified: false`, so the "try again" message is the screen's
 * own answer to a successful request — not an error branch.
 */
describe('ReaderAccessPage (REQ-VIEW-001)', () => {
  beforeEach(() => {
    navigate.mockReset();
    verify.mockReset();
  });

  function renderAccess(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<ReaderAccessPage />, {
      route: '/projects/prj_1/reader-access',
      routePath: '/projects/:projectId/reader-access',
    });
  }

  it('offers the shared-password form without any shell', () => {
    renderAccess();

    expect(
      screen.getByRole('heading', { name: 'Access published documentation' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Shared password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open documentation' })).toBeInTheDocument();
  });

  it('navigates to the read-only view when the password verifies', async () => {
    verify.mockResolvedValue({ verified: true, sharedPasswordId: 'sp_1' });
    const user = userEvent.setup();
    renderAccess();

    await user.type(screen.getByLabelText('Shared password'), 'reader-pass');
    await user.click(screen.getByRole('button', { name: 'Open documentation' }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/projects/prj_1/reader');
    });
  });

  it('asks for another try when the password does not verify', async () => {
    verify.mockResolvedValue({ verified: false, sharedPasswordId: null });
    const user = userEvent.setup();
    renderAccess();

    await user.type(screen.getByLabelText('Shared password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Open documentation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That shared password was not recognized.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not submit an empty password', async () => {
    const user = userEvent.setup();
    renderAccess();

    await user.click(screen.getByRole('button', { name: 'Open documentation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the shared password.');
    expect(verify).not.toHaveBeenCalled();
  });

  it('maps a verification failure to a translated error', async () => {
    verify.mockRejectedValue(new ApiClientError(403, { code: 'FORBIDDEN', message: 'nope' }));
    const user = userEvent.setup();
    renderAccess();

    await user.type(screen.getByLabelText('Shared password'), 'reader-pass');
    await user.click(screen.getByRole('button', { name: 'Open documentation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to do that.',
    );
  });
});

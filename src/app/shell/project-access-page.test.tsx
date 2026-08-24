import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type { RoleName } from '../api';

import { ProjectAccessPage } from './project-access-page';

/**
 * M1.15: manage who can reach a project, and in which role.
 *
 * Invite and grant are deliberately two steps, not one form. An invited user
 * lands in the company with no project access at all (deny-by-default,
 * REQ-SEC-012); granting a role is a separate, explicit decision. Collapsing
 * them into "invite as editor" would make the grant a side effect of the invite
 * and hide the moment access is given.
 */

const invite = vi.fn();
const setGrant = vi.fn();
const removeGrant = vi.fn();
// Typed so the mocked hook's return value is not `any`: an untyped vi.fn() here
// makes every `grants()` call an unsafe return.
const grants = vi.fn<
  () => {
    data: { grants: { projectId: string; userId: string; roleName: RoleName }[] } | undefined;
    isLoading: boolean;
    isError: boolean;
  }
>();

vi.mock('../queries', () => ({
  useInviteUser: () => ({ mutateAsync: invite, isPending: false }),
  useSetGrant: () => ({ mutateAsync: setGrant, isPending: false }),
  useRemoveGrant: () => ({ mutateAsync: removeGrant, isPending: false }),
  useGrants: () => grants(),
}));

beforeEach(() => {
  invite.mockReset();
  setGrant.mockReset();
  removeGrant.mockReset();
  grants.mockReset();
  grants.mockReturnValue({ data: { grants: [] }, isLoading: false, isError: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

const route = '/companies/cmp_1/projects/prj_1/access';
const routePath = '/companies/:companyId/projects/:projectId/access';

describe('ProjectAccessPage', () => {
  it('lists current grants with their roles', async () => {
    grants.mockReturnValue({
      data: {
        grants: [
          { projectId: 'prj_1', userId: 'usr_1', roleName: 'editor' },
          { projectId: 'prj_1', userId: 'usr_2', roleName: 'viewer' },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    expect(await screen.findByText('usr_1')).toBeInTheDocument();
    expect(screen.getByText('usr_2')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role for usr_1' })).toHaveValue('editor');
  });

  it('invites a user into the company without granting any access', async () => {
    const user = userEvent.setup();
    invite.mockResolvedValue({ userId: 'usr_9' });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    await user.type(screen.getByLabelText('Invite by email'), 'new@acme.test');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    await waitFor(() => {
      expect(invite).toHaveBeenCalledWith('new@acme.test');
    });
    // Deny-by-default: the invite must not silently grant a role.
    expect(setGrant).not.toHaveBeenCalled();
  });

  it('changes a role through the grant API', async () => {
    const user = userEvent.setup();
    grants.mockReturnValue({
      data: { grants: [{ projectId: 'prj_1', userId: 'usr_1', roleName: 'viewer' }] },
      isLoading: false,
      isError: false,
    });
    setGrant.mockResolvedValue({ projectId: 'prj_1', userId: 'usr_1', roleName: 'editor' });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Role for usr_1' }),
      'editor',
    );

    await waitFor(() => {
      expect(setGrant).toHaveBeenCalledWith({ userId: 'usr_1', roleName: 'editor' });
    });
  });

  it('revokes access', async () => {
    const user = userEvent.setup();
    grants.mockReturnValue({
      data: { grants: [{ projectId: 'prj_1', userId: 'usr_1', roleName: 'viewer' }] },
      isLoading: false,
      isError: false,
    });
    removeGrant.mockResolvedValue({ ok: true });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    await user.click(await screen.findByRole('button', { name: 'Revoke access for usr_1' }));

    await waitFor(() => {
      expect(removeGrant).toHaveBeenCalledWith('usr_1');
    });
  });

  it('explains an empty access list rather than showing a bare table', async () => {
    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    expect(
      await screen.findByText('Nobody has been granted access to this project yet.'),
    ).toBeInTheDocument();
  });
});

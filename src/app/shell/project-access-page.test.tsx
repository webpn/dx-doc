import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type { RoleName } from '../api';
import { useSessionStore } from '../stores/session-store';

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
const createSharedPassword = vi.fn();
const removeSharedPassword = vi.fn();
const sharedPasswordQuery = vi.fn<
  () => {
    data:
      | {
          id: string;
          projectId: string;
          label: string | null;
          expiresAt: string | null;
          createdAt: string;
          updatedAt: string;
        }[]
      | undefined;
    isLoading: boolean;
    isError: boolean;
  }
>();
// Typed so the mocked hook's return value is not `any`: an untyped vi.fn() here
// makes every `grants()` call an unsafe return.
const grants = vi.fn<
  () => {
    data: { grants: { userId: string; email: string; roleName: RoleName | null }[] } | undefined;
    isLoading: boolean;
    isError: boolean;
  }
>();

vi.mock('../queries', () => ({
  useInviteUser: () => ({ mutateAsync: invite, isPending: false }),
  useSetGrant: () => ({ mutateAsync: setGrant, isPending: false }),
  useRemoveGrant: () => ({ mutateAsync: removeGrant, isPending: false }),
  useGrants: () => grants(),
  useSharedPasswords: () => sharedPasswordQuery(),
  useCreateSharedPassword: () => ({ mutateAsync: createSharedPassword, isPending: false }),
  useRemoveSharedPassword: () => ({ mutateAsync: removeSharedPassword, isPending: false }),
}));

beforeEach(() => {
  invite.mockReset();
  setGrant.mockReset();
  removeGrant.mockReset();
  sharedPasswordQuery.mockReset();
  createSharedPassword.mockReset();
  removeSharedPassword.mockReset();
  grants.mockReset();
  useSessionStore.setState({
    session: {
      userId: 'usr_1',
      companyId: 'cmp_1',
      passwordChangeRequired: false,
      instanceAdmin: false,
    },
  });
  sharedPasswordQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  grants.mockReturnValue({ data: { grants: [] }, isLoading: false, isError: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

const route = '/companies/cmp_1/projects/prj_1/access';
const routePath = '/companies/:companyId/projects/:projectId/access';

describe('ProjectAccessPage', () => {
  it('lists shared passwords without exposing their secrets', async () => {
    sharedPasswordQuery.mockReturnValue({
      data: [
        {
          id: 'sp_1',
          projectId: 'prj_1',
          label: 'Agency',
          expiresAt: null,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    });
    grants.mockReturnValue({
      data: { grants: [{ userId: 'usr_1', email: 'usr1@acme.test', roleName: 'admin' }] },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    expect(await screen.findByText('Agency')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.queryByText(/hash|secret/i)).not.toBeInTheDocument();
  });

  it('creates a shared password with its optional expiry', async () => {
    const user = userEvent.setup();
    grants.mockReturnValue({
      data: { grants: [{ userId: 'usr_1', email: 'usr1@acme.test', roleName: 'project_manager' }] },
      isLoading: false,
      isError: false,
    });
    createSharedPassword.mockResolvedValue({ id: 'sp_2' });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    await user.type(screen.getByLabelText('Label (optional)'), 'Agency');
    await user.type(screen.getByLabelText('Password'), 'reader-password');
    await user.type(screen.getByLabelText('Expiry (optional)'), '2030-01-01T12:00');
    await user.click(screen.getByRole('button', { name: 'Create shared password' }));

    await waitFor(() => {
      expect(createSharedPassword).toHaveBeenCalledWith({
        password: 'reader-password',
        label: 'Agency',
        expiresAt: new Date('2030-01-01T12:00').toISOString(),
      });
    });
  });

  it('revokes a shared password', async () => {
    const user = userEvent.setup();
    grants.mockReturnValue({
      data: { grants: [{ userId: 'usr_1', email: 'usr1@acme.test', roleName: 'admin' }] },
      isLoading: false,
      isError: false,
    });
    sharedPasswordQuery.mockReturnValue({
      data: [
        {
          id: 'sp_1',
          projectId: 'prj_1',
          label: 'Agency',
          expiresAt: null,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    });
    removeSharedPassword.mockResolvedValue({ ok: true });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });
    await user.click(await screen.findByRole('button', { name: 'Revoke shared password Agency' }));

    await waitFor(() => {
      expect(removeSharedPassword).toHaveBeenCalledWith('sp_1');
    });
  });

  it('shows a shared-password loading error', async () => {
    sharedPasswordQuery.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    expect(await screen.findByText('Shared passwords could not be loaded.')).toBeInTheDocument();
  });

  it('lists current grants with their roles', async () => {
    grants.mockReturnValue({
      data: {
        grants: [
          { userId: 'usr_1', email: 'usr1@acme.test', roleName: 'editor' },
          { userId: 'usr_2', email: 'usr2@acme.test', roleName: 'viewer' },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    expect(await screen.findByText('usr1@acme.test')).toBeInTheDocument();
    expect(screen.getByText('usr2@acme.test')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role for usr1@acme.test' })).toHaveValue('editor');
  });

  it('shows an invited, ungranted member as eligible for a first role', async () => {
    const user = userEvent.setup();
    grants.mockReturnValue({
      data: { grants: [{ userId: 'usr_9', email: 'new@acme.test', roleName: null }] },
      isLoading: false,
      isError: false,
    });
    setGrant.mockResolvedValue({ projectId: 'prj_1', userId: 'usr_9', roleName: 'editor' });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    const roleSelect = await screen.findByRole('combobox', { name: 'Role for new@acme.test' });
    expect(roleSelect).toHaveValue('');
    // No role granted yet, so there is nothing to revoke.
    expect(
      screen.queryByRole('button', { name: 'Revoke access for new@acme.test' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(roleSelect, 'editor');

    await waitFor(() => {
      expect(setGrant).toHaveBeenCalledWith({ userId: 'usr_9', roleName: 'editor' });
    });
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
      data: { grants: [{ userId: 'usr_1', email: 'usr1@acme.test', roleName: 'viewer' }] },
      isLoading: false,
      isError: false,
    });
    setGrant.mockResolvedValue({ projectId: 'prj_1', userId: 'usr_1', roleName: 'editor' });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Role for usr1@acme.test' }),
      'editor',
    );

    await waitFor(() => {
      expect(setGrant).toHaveBeenCalledWith({ userId: 'usr_1', roleName: 'editor' });
    });
  });

  it('revokes access', async () => {
    const user = userEvent.setup();
    grants.mockReturnValue({
      data: { grants: [{ userId: 'usr_1', email: 'usr1@acme.test', roleName: 'viewer' }] },
      isLoading: false,
      isError: false,
    });
    removeGrant.mockResolvedValue({ ok: true });

    renderWithProviders(<ProjectAccessPage />, { route, routePath });

    await user.click(
      await screen.findByRole('button', { name: 'Revoke access for usr1@acme.test' }),
    );

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

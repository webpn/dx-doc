import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import { useSessionStore } from '../stores/session-store';

import { ProjectListPage } from './project-list-page';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ProjectListPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useSessionStore.setState({
      session: {
        userId: 'u1',
        companyId: 'c1',
        passwordChangeRequired: false,
        instanceAdmin: false,
      },
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    useSessionStore.setState({ session: null });
  });

  it('shows an empty state when the account has no accessible projects', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));
    renderWithProviders(<ProjectListPage />);

    expect(
      await screen.findByText('No projects are assigned to this account yet.'),
    ).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { error: { code: 'INTERNAL', message: 'Server error' } }),
    );
    renderWithProviders(<ProjectListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load projects.');
  });

  it('lists the projects returned by the API', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, [
        {
          id: 'p1',
          companyId: 'c1',
          name: 'Marketing site',
          slug: 'marketing-site',
          description: null,
          icon: null,
          platform: 'web',
          tagManager: null,
          lifecycleState: 'active',
          integrationSettings: null,
          customId: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );
    renderWithProviders(<ProjectListPage />);

    expect(await screen.findByText('Marketing site')).toBeInTheDocument();
    expect(screen.getByText('web · marketing-site')).toBeInTheDocument();
  });

  it('scopes to the company in the URL, which outranks the session company', async () => {
    // An instance administrator has `companyId: null` in their session and is
    // not a member of any company (REQ-SEC-014), so after creating one the only
    // place the company can live is the URL. The milestone already makes URL
    // state the source of truth for the selected company; this proves the list
    // honours it rather than silently querying the session's company.
    useSessionStore.setState({
      session: {
        userId: 'admin',
        companyId: null,
        passwordChangeRequired: false,
        instanceAdmin: true,
      },
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

    renderWithProviders(<ProjectListPage />, {
      route: '/companies/cmp_42/projects',
      routePath: '/companies/:companyId/projects',
    });

    await screen.findByText(
      'No projects are assigned to this account yet. As an instance administrator, create a company to get started.',
    );
    const requestedUrl = (fetchMock.mock.calls[0] as [string])[0];
    expect(requestedUrl).toContain('cmp_42');
  });

  it('offers company creation to an instance administrator with no company', async () => {
    useSessionStore.setState({
      session: {
        userId: 'admin',
        companyId: null,
        passwordChangeRequired: false,
        instanceAdmin: true,
      },
    });

    renderWithProviders(<ProjectListPage />);

    // No company in session and none in the URL: nothing can be listed, so the
    // only useful action is creating one. Without this the instance
    // administrator reaches a dead end — the deadlock that blocked M1.15's exit.
    expect(await screen.findByRole('link', { name: 'Create a company' })).toHaveAttribute(
      'href',
      '/companies/new',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

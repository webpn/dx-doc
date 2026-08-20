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
      session: { userId: 'u1', companyId: 'c1', passwordChangeRequired: false },
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
});

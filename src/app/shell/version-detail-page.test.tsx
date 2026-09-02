import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { VersionDetailPage } from './version-detail-page';

const { version } = vi.hoisted(() => ({
  version: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useVersion: () => version() as unknown,
  };
});

const RELEASE = {
  id: 'ver_1',
  projectId: 'prj_1',
  versionNumber: 1,
  title: 'First release',
  releaseNotes: 'Everything starts here.',
  changelog: [
    { type: 'added', entityType: 'property', entityId: 'prop_1', name: 'page_language' },
    { type: 'removed', entityType: 'tracking', entityId: 'trk_9', name: 'legacy_signup' },
  ],
  createdBy: 'user_1',
  createdAt: '2026-01-05T10:00:00.000Z',
};

describe('VersionDetailPage (REQ-VER-007)', () => {
  beforeEach(() => {
    version.mockReset();
  });

  function renderDetail(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<VersionDetailPage />, {
      routePath: '/projects/:projectId/versions/:versionId',
      route: '/projects/prj_1/versions/ver_1',
    });
  }

  it('announces the wait while the version loads', () => {
    version.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    renderDetail();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Version 1 — First release' }),
    ).not.toBeInTheDocument();
  });

  it('shows the metadata the editor supplied at publication', () => {
    version.mockReturnValue({
      data: RELEASE,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDetail();

    expect(screen.getByRole('heading', { name: 'Version 1 — First release' })).toBeInTheDocument();
    expect(screen.getByText('Release notes')).toBeInTheDocument();
    expect(screen.getByText('Everything starts here.')).toBeInTheDocument();
  });

  it('renders the generated changelog grouped by change type', () => {
    version.mockReturnValue({
      data: RELEASE,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDetail();

    expect(screen.getByRole('heading', { name: 'Added' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Removed' })).toBeInTheDocument();
    expect(screen.getByText('page_language')).toBeInTheDocument();
    expect(screen.getByText('(Property)')).toBeInTheDocument();
    expect(screen.getByText('legacy_signup')).toBeInTheDocument();
    expect(screen.getByText('(Tracking)')).toBeInTheDocument();
  });

  it('says so when the publication recorded no changes', () => {
    version.mockReturnValue({
      data: { ...RELEASE, changelog: [] },
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDetail();

    expect(screen.getByText('No changes were recorded for this version.')).toBeInTheDocument();
  });

  it('links back to the version history', () => {
    version.mockReturnValue({
      data: RELEASE,
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDetail();

    expect(screen.getByRole('link', { name: 'Back to version history' })).toHaveAttribute(
      'href',
      '/projects/prj_1/versions',
    );
  });

  it('reports a failed load', () => {
    version.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('kaboom'),
    });
    renderDetail();

    expect(screen.getByRole('alert')).toHaveTextContent('This version could not be loaded.');
  });
});

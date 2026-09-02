import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { VersionHistoryPage } from './version-history-page';

const { versions } = vi.hoisted(() => ({
  versions: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useVersions: () => versions() as unknown,
  };
});

const FIRST_RELEASE = {
  id: 'ver_1',
  projectId: 'prj_1',
  versionNumber: 1,
  title: 'First release',
  releaseNotes: 'Everything starts here.',
  changelog: [
    { type: 'added', entityType: 'property', entityId: 'prop_1', name: 'page_language' },
    { type: 'added', entityType: 'module', entityId: 'mod_1', name: 'Localization' },
  ],
  createdBy: 'user_1',
  createdAt: '2026-01-05T10:00:00.000Z',
};
const SECOND_RELEASE = {
  id: 'ver_2',
  projectId: 'prj_1',
  versionNumber: 2,
  title: null,
  releaseNotes: null,
  changelog: [
    { type: 'modified', entityType: 'property', entityId: 'prop_1', name: 'page_language' },
  ],
  createdBy: 'user_2',
  createdAt: '2026-02-10T10:00:00.000Z',
};

describe('VersionHistoryPage (REQ-VER-006)', () => {
  beforeEach(() => {
    versions.mockReset();
  });

  function renderHistory(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<VersionHistoryPage />, {
      routePath: '/projects/:projectId/versions',
      route: '/projects/prj_1/versions',
    });
  }

  it('announces the wait while the history loads', () => {
    versions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    renderHistory();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lists every publication with its number, title, creator and changes summary', () => {
    versions.mockReturnValue({
      data: [SECOND_RELEASE, FIRST_RELEASE],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderHistory();

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    // An untitled publication says so instead of silently rendering nothing.
    expect(screen.getByText(/Untitled/)).toBeInTheDocument();
    expect(screen.getByText('user_1')).toBeInTheDocument();
    expect(screen.getByText('2 added, 0 modified, 0 removed')).toBeInTheDocument();
    expect(screen.getByText('0 added, 1 modified, 0 removed')).toBeInTheDocument();
  });

  it('links each publication to its detail screen', () => {
    versions.mockReturnValue({
      data: [FIRST_RELEASE],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderHistory();

    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/projects/prj_1/versions/ver_1',
    );
  });

  it('shows the empty state when nothing has been published yet', () => {
    versions.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderHistory();

    expect(screen.getByText('Nothing has been published yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a failed load', () => {
    versions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('kaboom'),
    });
    renderHistory();

    expect(screen.getByRole('alert')).toHaveTextContent('Version history could not be loaded.');
  });
});

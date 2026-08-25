import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { FreePageListPage } from './free-page-list-page';

const { freePagesData, projectData } = vi.hoisted(() => ({
  freePagesData: vi.fn(),
  projectData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useFreePages: () => freePagesData() as unknown,
    useProject: () => projectData() as unknown,
  };
});

const PROJECT = { id: 'prj_1', companyId: 'cmp_1', name: 'Acme app', slug: 'acme' };

const FREE_PAGE = {
  id: 'fp1',
  companyId: 'cmp_1',
  projectId: 'prj_1',
  title: 'Glossary',
  slug: 'glossary',
  content: '',
  publishable: true,
  customId: null,
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('FreePageListPage (REQ-AUTH-003)', () => {
  beforeEach(() => {
    projectData.mockReturnValue({ data: PROJECT, isPending: false, error: null });
    freePagesData.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
  });

  function renderList(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<FreePageListPage />, {
      routePath: '/projects/:projectId/free-pages',
      route: '/projects/prj_1/free-pages',
    });
  }

  it('explains an empty list rather than showing a bare table', async () => {
    renderList();

    expect(await screen.findByText('No free pages yet.')).toBeInTheDocument();
  });

  it('lists free pages with their publishable state and a link to open each', async () => {
    freePagesData.mockReturnValue({
      data: [FREE_PAGE],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderList();

    expect(await screen.findByText('Glossary')).toBeInTheDocument();
    expect(screen.getByText('glossary')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/projects/prj_1/free-pages/fp1',
    );
  });

  it('offers creating a new free page', async () => {
    const user = userEvent.setup();
    renderList();

    const create = await screen.findByRole('link', { name: 'New free page' });
    expect(create).toHaveAttribute('href', '/projects/prj_1/free-pages/new');
    await user.click(create);
  });

  it('surfaces a load error', async () => {
    freePagesData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 500 },
    });

    renderList();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

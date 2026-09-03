import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { ProjectSearchPage } from './project-search-page';

const { project, search } = vi.hoisted(() => ({ project: vi.fn(), search: vi.fn() }));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useProject: () => project() as unknown,
    useProjectSearch: (...args: unknown[]) => search(...args) as unknown,
  };
});

vi.mock('./project-workspace', () => ({
  ProjectWorkspace: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ProjectSearchPage (REQ-AUTH-007)', () => {
  beforeEach(() => {
    project.mockReturnValue({ data: { id: 'prj_1' }, isLoading: false, isError: false });
    search.mockImplementation((_projectId: string, query: string) =>
      query === 'checkout'
        ? {
            data: [{ documentId: 'trk_1', title: 'Add to cart', snippet: 'value: checkout' }],
            isLoading: false,
            isError: false,
          }
        : { data: [], isLoading: false, isError: false },
    );
  });

  function renderSearch(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<ProjectSearchPage />, {
      routePath: '/projects/:projectId/search',
      route: '/projects/prj_1/search',
    });
  }

  it('searches a literal specific value and links results within the current project', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByRole('searchbox'), 'checkout');
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    expect(screen.getByRole('link', { name: 'Add to cart' })).toHaveAttribute(
      'href',
      '/projects/prj_1/trackings/trk_1',
    );
    expect(screen.getByDisplayValue('checkout')).toBeInTheDocument();
  });

  it('renders the empty state after a query with no matches', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'missing-value');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(await screen.findByText(/no matching documentation/i)).toBeInTheDocument();
  });

  it('renders the loading state', async () => {
    search.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'loading');
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    expect(screen.getByText(/searching project documentation/i)).toBeInTheDocument();
  });

  it('renders the error state', async () => {
    search.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error(),
    });
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('searchbox'), 'error');
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a result link scoped to the project in the URL', () => {
    search.mockReturnValue({
      data: [{ documentId: 'trk_2', title: 'Purchase', snippet: 'purchase_complete' }],
      isLoading: false,
      isError: false,
    });
    renderSearch();
    expect(screen.getByRole('link', { name: 'Purchase' })).toHaveAttribute(
      'href',
      '/projects/prj_1/trackings/trk_2',
    );
  });
});

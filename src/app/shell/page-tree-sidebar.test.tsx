import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { PageTreeSidebar } from './page-tree-sidebar';

const { pagesData, flowsData, trackingsData } = vi.hoisted(() => ({
  pagesData: vi.fn(),
  flowsData: vi.fn(),
  trackingsData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    usePages: () => pagesData() as unknown,
    useFlows: () => flowsData() as unknown,
    useTrackings: () => trackingsData() as unknown,
  };
});

const HOME = { id: 'pg1', name: 'Home', slug: 'home', parentId: null };
const CHECKOUT = { id: 'pg2', name: 'Checkout', slug: 'checkout', parentId: null };
const CHECKOUT_STEP_2 = {
  id: 'pg3',
  name: 'Checkout step 2',
  slug: 'checkout-step-2',
  parentId: 'pg2',
};
// Declares a parent that is not in the list — e.g. it belongs to another
// project's response the client never received, or was deleted after this
// list was fetched. It must still render, at the top level, never vanish.
const ORPHAN = { id: 'pg4', name: 'Orphan page', slug: 'orphan', parentId: 'missing' };

describe('PageTreeSidebar (REQ-NAV-001)', () => {
  beforeEach(() => {
    pagesData.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    flowsData.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    trackingsData.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
  });

  function renderSidebar(currentPageId?: string): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(
      <PageTreeSidebar
        {...(currentPageId === undefined ? {} : { currentPageId })}
        projectId="prj_1"
      />,
    );
  }

  it('explains an empty hierarchy rather than showing a bare nav', async () => {
    renderSidebar();

    expect(await screen.findByText('No pages yet.')).toBeInTheDocument();
  });

  it('nests a page under its parent and links to each page editor', async () => {
    pagesData.mockReturnValue({
      data: [HOME, CHECKOUT, CHECKOUT_STEP_2],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSidebar();

    const home = await screen.findByRole('link', { name: 'Home' });
    expect(home).toHaveAttribute('href', '/projects/prj_1/pages/pg1');

    const child = screen.getByRole('link', { name: 'Checkout step 2' });
    expect(child).toHaveAttribute('href', '/projects/prj_1/pages/pg3');
  });

  it('keeps a page with a missing parent visible at the top level', async () => {
    pagesData.mockReturnValue({
      data: [ORPHAN],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSidebar();

    expect(await screen.findByRole('link', { name: 'Orphan page' })).toBeInTheDocument();
  });

  it('marks the currently open page as the current nav item', async () => {
    pagesData.mockReturnValue({
      data: [HOME, CHECKOUT],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSidebar('pg2');

    const checkout = await screen.findByRole('link', { name: 'Checkout' });
    expect(checkout).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('offers creating a new page', async () => {
    renderSidebar();

    const create = await screen.findByRole('link', { name: 'New page' });
    expect(create).toHaveAttribute('href', '/projects/prj_1/pages/new');
  });

  it('lists trackings with links to their editors and offers creating one', async () => {
    trackingsData.mockReturnValue({
      data: [
        { id: 'trk1', name: 'Checkout completed', slug: 'checkout-completed' },
        { id: 'trk2', name: 'Page view', slug: 'page-view' },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderSidebar();

    const first = await screen.findByRole('link', { name: 'Checkout completed' });
    expect(first).toHaveAttribute('href', '/projects/prj_1/trackings/trk1');

    const create = screen.getByRole('link', { name: 'New tracking' });
    expect(create).toHaveAttribute('href', '/projects/prj_1/trackings/new');
  });

  it('surfaces a load error', async () => {
    pagesData.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 500 },
    });

    renderSidebar();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

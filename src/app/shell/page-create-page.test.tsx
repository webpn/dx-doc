import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { PageCreatePage } from './page-create-page';

const { create, pagesData } = vi.hoisted(() => ({
  create: vi.fn(),
  pagesData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useCreatePage: () => ({ mutateAsync: create, isPending: false }) as unknown,
    usePages: () => pagesData() as unknown,
  };
});

const HOME_PAGE = { id: 'pg1', name: 'Home', slug: 'home' };

describe('PageCreatePage (REQ-DOM-001)', () => {
  beforeEach(() => {
    create.mockReset();
    pagesData.mockReturnValue({ data: [HOME_PAGE], isLoading: false, error: null });
  });

  function renderCreate(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<PageCreatePage />, {
      routePath: '/projects/:projectId/pages/new',
      route: '/projects/prj_1/pages/new',
    });
  }

  it('rejects an empty name', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Create page' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an empty slug', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout');
    await user.click(screen.getByRole('button', { name: 'Create page' }));

    expect(await screen.findByText('Enter a slug.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('offers the project’s other pages as a parent choice', () => {
    renderCreate();

    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
  });

  it('creates a top-level page without a parent', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'pg2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout');
    await user.type(screen.getByLabelText('Slug'), 'checkout');
    await user.click(screen.getByRole('button', { name: 'Create page' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ name: 'Checkout', slug: 'checkout' });
    });
  });

  it('creates a page under a chosen parent', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'pg2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout step 2');
    await user.type(screen.getByLabelText('Slug'), 'checkout-step-2');
    await user.selectOptions(screen.getByLabelText('Parent page'), 'pg1');
    await user.click(screen.getByRole('button', { name: 'Create page' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Checkout step 2',
        slug: 'checkout-step-2',
        parentId: 'pg1',
      });
    });
  });
});

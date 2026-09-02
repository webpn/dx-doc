import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { TrackingCreatePage } from './tracking-create-page';

const { create, pagesData, eventsData } = vi.hoisted(() => ({
  create: vi.fn(),
  pagesData: vi.fn(),
  eventsData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useCreateTracking: () => ({ mutateAsync: create, isPending: false }) as unknown,
    usePages: () => pagesData() as unknown,
    useNavigationEvents: () => eventsData() as unknown,
  };
});

const HOME_PAGE = { id: 'pg1', name: 'Home', slug: 'home' };
const PAGE_VIEW_EVENT = { id: 'evt1', name: 'Page view' };

describe('TrackingCreatePage (REQ-DOM-002)', () => {
  beforeEach(() => {
    create.mockReset();
    pagesData.mockReturnValue({ data: [HOME_PAGE], isLoading: false, error: null });
    eventsData.mockReturnValue({ data: [PAGE_VIEW_EVENT], isLoading: false, error: null });
  });

  function renderCreate(
    route = '/projects/prj_1/trackings/new',
  ): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<TrackingCreatePage />, {
      routePath: '/projects/:projectId/trackings/new',
      route,
    });
  }

  it('rejects an empty name', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Create tracking' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an empty slug', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout completed');
    await user.click(screen.getByRole('button', { name: 'Create tracking' }));

    expect(await screen.findByText('Enter a slug.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a missing navigation event', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout completed');
    await user.type(screen.getByLabelText('Slug'), 'checkout-completed');
    await user.click(screen.getByRole('button', { name: 'Create tracking' }));

    expect(await screen.findByText('Choose a navigation event.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('offers the project’s navigation events and pages as choices', () => {
    renderCreate();

    expect(screen.getByRole('option', { name: 'Page view' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
  });

  it('creates a tracking attached to a chosen page', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'trk2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout completed');
    await user.type(screen.getByLabelText('Slug'), 'checkout-completed');
    await user.selectOptions(screen.getByLabelText('Navigation event'), 'evt1');
    await user.selectOptions(screen.getByLabelText('Page'), 'pg1');
    await user.click(screen.getByRole('button', { name: 'Create tracking' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Checkout completed',
        slug: 'checkout-completed',
        navigationEventId: 'evt1',
        pageId: 'pg1',
      });
    });
  });

  it('creates a tracking without a page attachment', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'trk2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Checkout completed');
    await user.type(screen.getByLabelText('Slug'), 'checkout-completed');
    await user.selectOptions(screen.getByLabelText('Navigation event'), 'evt1');
    await user.click(screen.getByRole('button', { name: 'Create tracking' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Checkout completed',
        slug: 'checkout-completed',
        navigationEventId: 'evt1',
      });
    });
  });

  it('preselects the page passed through ?pageId=', () => {
    renderCreate('/projects/prj_1/trackings/new?pageId=pg1');

    expect(screen.getByLabelText('Page')).toHaveValue('pg1');
  });
});

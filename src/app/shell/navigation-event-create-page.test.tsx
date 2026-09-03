import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { NavigationEventCreatePage } from './navigation-event-create-page';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useCreateNavigationEvent: () => ({ mutateAsync: create, isPending: false }) as unknown,
  };
});

describe('NavigationEventCreatePage (REQ-DOM-002)', () => {
  beforeEach(() => {
    create.mockReset();
  });

  it('rejects an empty name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavigationEventCreatePage />, {
      routePath: '/projects/:projectId/navigation-events/new',
      route: '/projects/prj_1/navigation-events/new',
    });

    await user.click(screen.getByRole('button', { name: 'Create navigation event' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates an active navigation event with its description', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'evt1' });
    renderWithProviders(<NavigationEventCreatePage />, {
      routePath: '/projects/:projectId/navigation-events/new',
      route: '/projects/prj_1/navigation-events/new',
    });

    await user.type(screen.getByLabelText('Name'), 'Checkout completed');
    await user.type(screen.getByLabelText('Description'), 'The checkout confirmation appears.');
    await user.click(screen.getByRole('button', { name: 'Create navigation event' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Checkout completed',
        description: 'The checkout confirmation appears.',
        active: true,
      });
    });
  });

  it('allows an inactive navigation event', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'evt1' });
    renderWithProviders(<NavigationEventCreatePage />, {
      routePath: '/projects/:projectId/navigation-events/new',
      route: '/projects/prj_1/navigation-events/new',
    });

    await user.type(screen.getByLabelText('Name'), 'Legacy checkout');
    await user.click(screen.getByLabelText('Active'));
    await user.click(screen.getByRole('button', { name: 'Create navigation event' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ name: 'Legacy checkout', active: false });
    });
  });
});

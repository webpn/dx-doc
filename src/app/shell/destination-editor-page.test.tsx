import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { DestinationEditorPage } from './destination-editor-page';

const { update, destination } = vi.hoisted(() => ({ update: vi.fn(), destination: vi.fn() }));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useDestination: () => destination() as unknown,
    useUpdateDestination: () => ({ mutateAsync: update, isPending: false }) as unknown,
  };
});

describe('DestinationEditorPage (REQ-DOM-005)', () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({});
    destination.mockReturnValue({
      data: {
        id: 'dst_1',
        companyId: 'cmp_1',
        projectId: 'prj_1',
        name: 'GA4 Purchase',
        platform: 'GA4',
        variableType: 'event_parameter',
        identifier: 'purchase_value',
        reconciliationIdentifier: 'txn_id',
        notes: 'Sent on the confirmation step only.',
        updatedAt: '2026-03-03T00:00:00.000Z',
      },
      isPending: false,
      error: null,
    });
  });

  function renderPage(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<DestinationEditorPage />, {
      routePath: '/projects/:projectId/destinations/:destinationId',
      route: '/projects/prj_1/destinations/dst_1',
    });
  }

  it('shows the stored destination mapping', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('GA4 Purchase')).toBeInTheDocument();
    expect(screen.getByDisplayValue('GA4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('event_parameter')).toBeInTheDocument();
    expect(screen.getByDisplayValue('purchase_value')).toBeInTheDocument();
    expect(screen.getByDisplayValue('txn_id')).toBeInTheDocument();
  });

  it('saves with the loaded updatedAt (REQ-AUTH-005)', async () => {
    const user = userEvent.setup();
    renderPage();

    const identifier = await screen.findByLabelText('Identifier');
    await user.clear(identifier);
    await user.type(identifier, 'purchase_revenue');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'purchase_revenue',
          expectedUpdatedAt: '2026-03-03T00:00:00.000Z',
        }),
      );
    });
  });

  it('requires the fields that make a mapping meaningful', async () => {
    const user = userEvent.setup();
    renderPage();

    // A destination without an identifier maps nothing.
    const identifier = await screen.findByLabelText('Identifier');
    await user.clear(identifier);
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

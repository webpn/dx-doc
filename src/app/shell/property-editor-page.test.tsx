import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { PropertyEditorPage } from './property-editor-page';

const { update, property } = vi.hoisted(() => ({ update: vi.fn(), property: vi.fn() }));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useProperty: () => property() as unknown,
    useUpdateProperty: () => ({ mutateAsync: update, isPending: false }) as unknown,
  };
});

describe('PropertyEditorPage (REQ-DOM-003)', () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({});
    property.mockReturnValue({
      data: {
        id: 'prop_1',
        companyId: 'cmp_1',
        projectId: 'prj_1',
        name: 'user_id',
        businessLabel: 'User ID',
        description: 'The signed-in user identifier.',
        type: 'string',
        dataSource: 'development',
        status: 'active',
        piiFlag: true,
        hashingPolicy: 'sha256',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      isPending: false,
      error: null,
    });
  });

  function renderPage(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<PropertyEditorPage />, {
      routePath: '/projects/:projectId/properties/:propertyId',
      route: '/projects/prj_1/properties/prop_1',
    });
  }

  it('shows the stored property, including its PII flag', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('user_id')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User ID')).toBeInTheDocument();
    expect(screen.getByLabelText(/personal data/i)).toBeChecked();
    expect(screen.getByDisplayValue('sha256')).toBeInTheDocument();
  });

  it('saves edits with the loaded updatedAt so a concurrent edit is caught (REQ-AUTH-005)', async () => {
    const user = userEvent.setup();
    renderPage();

    const label = await screen.findByLabelText(/business label/i);
    await user.clear(label);
    await user.type(label, 'Customer ID');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          businessLabel: 'Customer ID',
          expectedUpdatedAt: '2026-01-01T00:00:00.000Z',
        }),
      );
    });
  });

  it('requires a name', async () => {
    const user = userEvent.setup();
    renderPage();

    const name = await screen.findByLabelText(/^name/i);
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('reports a rejected save without discarding what was typed', async () => {
    const user = userEvent.setup();
    update.mockRejectedValueOnce(new Error('nope'));
    renderPage();

    const label = await screen.findByLabelText(/business label/i);
    await user.clear(label);
    await user.type(label, 'Kept Value');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // The edit must survive the failure: retyping it would be the real cost.
    expect(screen.getByLabelText(/business label/i)).toHaveValue('Kept Value');
  });
});

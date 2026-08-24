import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { ModuleEditorPage } from './module-editor-page';

const { update, module_, properties, preview, propagate } = vi.hoisted(() => ({
  update: vi.fn(),
  module_: vi.fn(),
  properties: vi.fn(),
  preview: vi.fn(),
  propagate: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useProject: () => ({ data: { id: 'prj_1', companyId: 'cmp_1' } }) as unknown,
    useModule: () => module_() as unknown,
    useProperties: () => properties() as unknown,
    useUpdateModule: () => ({ mutateAsync: update, isPending: false }) as unknown,
    useModulePropagationPreview: () => preview() as unknown,
    usePropagateModule: () => ({ mutateAsync: propagate, isPending: false }) as unknown,
  };
});

describe('ModuleEditorPage (REQ-DOM-004)', () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({});
    propagate.mockReset().mockResolvedValue({ updatedTrackingCount: 0 });
    // Not asked for yet: the preview is opt-in, so its default is "no data".
    preview.mockReset().mockReturnValue({ data: undefined, isPending: false });
    module_.mockReturnValue({
      // The API returns { module, propertyIds } — nested, not flattened.
      data: {
        module: {
          id: 'mod_1',
          companyId: 'cmp_1',
          projectId: 'prj_1',
          name: 'Ecommerce',
          description: 'Purchase funnel properties.',
          updatedAt: '2026-02-02T00:00:00.000Z',
        },
        propertyIds: ['prop_1'],
      },
      isPending: false,
      error: null,
    });
    properties.mockReturnValue({
      data: [
        { id: 'prop_1', name: 'order_id' },
        { id: 'prop_2', name: 'order_total' },
      ],
      isPending: false,
      error: null,
    });
  });

  function renderPage(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<ModuleEditorPage />, {
      routePath: '/projects/:projectId/modules/:moduleId',
      route: '/projects/prj_1/modules/mod_1',
    });
  }

  it('shows the module and which properties it is made of', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('Ecommerce')).toBeInTheDocument();
    expect(screen.getByLabelText('order_id')).toBeChecked();
    expect(screen.getByLabelText('order_total')).not.toBeChecked();
  });

  it('saves a changed property set with the loaded updatedAt (REQ-AUTH-005)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('order_total'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyIds: ['prop_1', 'prop_2'],
          expectedUpdatedAt: '2026-02-02T00:00:00.000Z',
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

  it('lets a module be emptied of properties', async () => {
    const user = userEvent.setup();
    renderPage();

    // Unticking the only property must send [] — not be treated as "unchanged".
    await user.click(await screen.findByLabelText('order_id'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ propertyIds: [] }));
    });
  });

  it('does not propagate to existing trackings as a side effect of saving (REQ-DOM-007)', async () => {
    const user = userEvent.setup();
    renderPage();

    const name = await screen.findByLabelText(/^name/i);
    await user.clear(name);
    await user.type(name, 'Ecommerce v2');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalled();
    });

    // The default is no propagation, so saving must never trigger it.
    expect(propagate).not.toHaveBeenCalled();
  });

  it('shows what propagation would change before doing it (REQ-DOM-007)', async () => {
    preview.mockReturnValue({
      data: { affected: [{ trackingId: 'trk_1', addedPropertyIds: ['prop_2'] }] },
      isPending: false,
    });

    const user = userEvent.setup();
    renderPage();

    // Asking what would change must not change anything.
    await user.click(await screen.findByRole('button', { name: /check what would change/i }));
    expect(propagate).not.toHaveBeenCalled();

    expect(await screen.findByText(/1 tracking/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /propagate now/i }));
    await waitFor(() => {
      expect(propagate).toHaveBeenCalled();
    });
  });
});

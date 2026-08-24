import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { TrackingEditorPage } from './tracking-editor-page';

const { update, applyModule, removeProperty, setPresence, detail, navEvents, mods, props, pages } =
  vi.hoisted(() => ({
    update: vi.fn(),
    applyModule: vi.fn(),
    removeProperty: vi.fn(),
    setPresence: vi.fn(),
    detail: vi.fn(),
    navEvents: vi.fn(),
    mods: vi.fn(),
    props: vi.fn(),
    pages: vi.fn(),
  }));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useTracking: () => detail() as unknown,
    useNavigationEvents: () => navEvents() as unknown,
    useModules: () => mods() as unknown,
    useProperties: () => props() as unknown,
    usePages: () => pages() as unknown,
    useProject: () => ({ data: { companyId: 'cmp_1' } }) as unknown,
    useUpdateTracking: () => ({ mutateAsync: update, isPending: false }) as unknown,
    useApplyModule: () => ({ mutateAsync: applyModule, isPending: false }) as unknown,
    useRemoveTrackingProperty: () => ({ mutateAsync: removeProperty, isPending: false }) as unknown,
    useSetPresence: () => ({ mutateAsync: setPresence, isPending: false }) as unknown,
  };
});

vi.mock('../editor', () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <textarea
      aria-label="Description"
      onChange={(event) => {
        onChange(event.target.value);
      }}
      value={value}
    />
  ),
}));

const DETAIL = {
  tracking: {
    id: 'trk_1',
    projectId: 'prj_1',
    pageId: 'pg_1',
    navigationEventId: 'nav_1',
    name: 'Add to cart',
    slug: 'add-to-cart',
    description: 'Fires on tap.',
    customId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  moduleIds: ['mod_1'],
  properties: [
    {
      id: 'tp_1',
      trackingId: 'trk_1',
      propertyId: 'prop_1',
      source: 'module' as const,
      presence: 'always' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  specificValues: [],
};

describe('TrackingEditorPage (REQ-DOM-002, REQ-DOM-008)', () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({ ok: true });
    applyModule.mockReset().mockResolvedValue({ ok: true });
    removeProperty.mockReset().mockResolvedValue({ ok: true });
    setPresence.mockReset().mockResolvedValue({ ok: true });
    detail.mockReturnValue({ data: DETAIL, isPending: false, error: null });
    navEvents.mockReturnValue({
      data: [
        { id: 'nav_1', name: 'Element click', active: true },
        { id: 'nav_2', name: 'Screen view', active: true },
      ],
      isPending: false,
      error: null,
    });
    mods.mockReturnValue({
      data: [
        { id: 'mod_1', name: 'Commerce' },
        { id: 'mod_2', name: 'Consent' },
      ],
      isPending: false,
      error: null,
    });
    props.mockReturnValue({
      data: [{ id: 'prop_1', name: 'item_id', businessLabel: 'Item ID' }],
      isPending: false,
      error: null,
    });
    pages.mockReturnValue({
      data: [{ id: 'pg_1', name: 'Product detail' }],
      isPending: false,
      error: null,
    });
  });

  function renderEditor(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<TrackingEditorPage />, {
      routePath: '/projects/:projectId/trackings/:trackingId',
      route: '/projects/prj_1/trackings/trk_1',
    });
  }

  it('loads the tracking with its navigation event and page selected', async () => {
    renderEditor();

    expect(await screen.findByDisplayValue('Add to cart')).toBeInTheDocument();
    expect(screen.getByLabelText(/navigation event/i)).toHaveValue('nav_1');
    expect(screen.getByLabelText(/page/i)).toHaveValue('pg_1');
  });

  it('saves with the loaded updatedAt as the concurrency guard', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(await screen.findByLabelText(/navigation event/i), 'nav_2');
    await user.click(screen.getByRole('button', { name: /save tracking/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          navigationEventId: 'nav_2',
          expectedUpdatedAt: '2026-01-02T00:00:00.000Z',
        }),
      );
    });
  });

  it('attaches a module that is not already applied', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(await screen.findByLabelText(/attach module/i), 'mod_2');
    await user.click(screen.getByRole('button', { name: /attach$/i }));

    await waitFor(() => {
      expect(applyModule).toHaveBeenCalledWith('mod_2');
    });
  });

  it('warns the editor when removing a property detached its module (REQ-DOM-008)', async () => {
    removeProperty.mockResolvedValue({ ok: true, warnModuleDetached: true });
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole('button', { name: /remove property/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/module/i);
  });

  it('does not warn when the module survives the removal', async () => {
    removeProperty.mockResolvedValue({ ok: true, warnModuleDetached: false });
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole('button', { name: /remove property/i }));

    await waitFor(() => {
      expect(removeProperty).toHaveBeenCalledWith('prop_1');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('changes a property presence (REQ-DOM-027)', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(await screen.findByLabelText(/presence/i), 'sometimes');

    await waitFor(() => {
      expect(setPresence).toHaveBeenCalledWith({
        propertyId: 'prop_1',
        presence: 'sometimes',
      });
    });
  });
});

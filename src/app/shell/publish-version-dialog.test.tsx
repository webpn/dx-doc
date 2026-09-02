import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import { ApiClientError } from '../api';
import type * as Queries from '../queries';

import { PublishVersionDialog } from './publish-version-dialog';

const { preview, confirm, trackings, pages, flows } = vi.hoisted(() => ({
  preview: vi.fn(),
  confirm: vi.fn(),
  trackings: vi.fn(),
  pages: vi.fn(),
  flows: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    usePublicationPreview: () => preview() as unknown,
    usePublishVersion: () => ({ mutateAsync: confirm, isPending: false }) as unknown,
    useTrackings: () => trackings() as unknown,
    useFreePages: () => pages() as unknown,
    useFlows: () => flows() as unknown,
  };
});

const ADDED_PAGE_LANGUAGE = {
  changelog: [{ type: 'added', entityType: 'property', entityId: 'prop_1', name: 'page_language' }],
};

describe('PublishVersionDialog (M1.17, REQ-VER-003, REQ-VER-004, REQ-VER-005)', () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockReset();
    confirm.mockReset();
    preview.mockReturnValue({
      data: ADDED_PAGE_LANGUAGE,
      isLoading: false,
      isError: false,
      error: null,
    });
    trackings.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    pages.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    flows.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
  });

  function renderDialog(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(
      <PublishVersionDialog companyId="cmp_1" onOpenChange={onOpenChange} open projectId="prj_1" />,
    );
  }

  it('shows the pre-publication diff before the metadata is filled in', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: 'What would this publication contain?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('page_language')).toBeInTheDocument();
    expect(screen.getByText('(Property)')).toBeInTheDocument();
  });

  it('says when the draft has nothing new to publish', () => {
    preview.mockReturnValue({
      data: { changelog: [] },
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDialog();

    expect(screen.getByText('Nothing has changed since the last publication.')).toBeInTheDocument();
  });

  it('publishes with the metadata the editor supplied', async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValue({ versionId: 'ver_2', versionNumber: 2 });
    renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Second release');
    await user.type(screen.getByLabelText('Release notes'), 'Fixed the language property.');
    await user.click(screen.getByRole('button', { name: 'Publish version' }));

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith({
        title: 'Second release',
        releaseNotes: 'Fixed the language property.',
      });
    });
    expect(await screen.findByText('Version 2 published.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open it in the version history' })).toHaveAttribute(
      'href',
      '/projects/prj_1/versions',
    );
  });

  it('sends an empty payload when no metadata was entered', async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValue({ versionId: 'ver_1', versionNumber: 1 });
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Publish version' }));

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith({});
    });
  });

  it('sends a held-back tracking in the publish payload (REQ-VER-003)', async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValue({ versionId: 'ver_2', versionNumber: 2 });
    trackings.mockReturnValue({
      data: [{ id: 'trk_checkout', name: 'Checkout events' }],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Hold back from this publication' }));
    await user.click(screen.getByLabelText('Checkout events'));
    await user.click(screen.getByRole('button', { name: 'Publish version' }));

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith({ excludedTrackingIds: ['trk_checkout'] });
    });
  });

  it('publishes everything when the lists offer items but nothing is held back', async () => {
    const user = userEvent.setup();
    confirm.mockResolvedValue({ versionId: 'ver_1', versionNumber: 1 });
    trackings.mockReturnValue({
      data: [{ id: 'trk_1', name: 'Page view' }],
      isLoading: false,
      isError: false,
      error: null,
    });
    pages.mockReturnValue({
      data: [{ id: 'pg_1', title: 'Home', publishable: true }],
      isLoading: false,
      isError: false,
      error: null,
    });
    flows.mockReturnValue({
      data: [{ id: 'flow_1', name: 'Signup flow' }],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Publish version' }));

    // Omitted exclusion arrays are the wire's "publish everything" (the
    // server schema reads a missing array as empty).
    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith({});
    });
  });

  it('maps the integrity reason when a held-back page blocked the publication', async () => {
    const user = userEvent.setup();
    confirm.mockRejectedValue(
      new ApiClientError(409, {
        code: 'PUBLICATION_INTEGRITY',
        message: 'Publication contains a reference to excluded content',
        reason: 'Flow flow_1 references excluded page pg_1',
      }),
    );
    pages.mockReturnValue({
      data: [{ id: 'pg_1', title: 'Home', publishable: true }],
      isLoading: false,
      isError: false,
      error: null,
    });
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Hold back from this publication' }));
    await user.click(screen.getByLabelText('Home'));
    await user.click(screen.getByRole('button', { name: 'Publish version' }));

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith({ excludedPageIds: ['pg_1'] });
    });
    expect(
      await screen.findByText(
        'This publication cannot be saved: Flow flow_1 references excluded page pg_1',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('PUBLICATION_INTEGRITY')).not.toBeInTheDocument();
  });

  it('maps a lost race to the stale-write message instead of the raw code (STALE_WRITE)', async () => {
    const user = userEvent.setup();
    confirm.mockRejectedValue(
      new ApiClientError(409, {
        code: 'STALE_WRITE',
        message: 'Conflict: record has been modified by another edit',
      }),
    );
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Publish version' }));

    expect(
      await screen.findByText(
        'Your changes were not saved: someone else edited this record after you opened it. Your edits are still here — reload in another tab to see theirs, then save again.',
      ),
    ).toBeInTheDocument();
  });

  it('reports a preview that could not be loaded', () => {
    preview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('kaboom'),
    });
    renderDialog();

    expect(screen.getByText('The pre-publication diff could not be loaded.')).toBeInTheDocument();
  });

  it('closes without publishing on cancel', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(confirm).not.toHaveBeenCalled();
  });
});

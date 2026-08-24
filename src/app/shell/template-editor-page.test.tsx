import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { TemplateEditorPage } from './template-editor-page';

const { update, template } = vi.hoisted(() => ({ update: vi.fn(), template: vi.fn() }));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useTrackingTemplate: () => template() as unknown,
    useUpdateTrackingTemplate: () => ({ mutateAsync: update, isPending: false }) as unknown,
  };
});

describe('TemplateEditorPage (REQ-DOM-009)', () => {
  beforeEach(() => {
    update.mockReset().mockResolvedValue({});
    template.mockReturnValue({
      data: {
        id: 'tpl_1',
        companyId: 'cmp_1',
        projectId: 'prj_1',
        name: 'Page View',
        description: 'Standard page view blueprint.',
        navigationEventId: null,
        configJson: '{"modules":["mod_1"]}',
        customId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
      },
      isPending: false,
      error: null,
    });
  });

  function renderPage(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<TemplateEditorPage />, {
      routePath: '/projects/:projectId/templates/:templateId',
      route: '/projects/prj_1/templates/tpl_1',
    });
  }

  it('shows the stored template, including its config', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('Page View')).toBeInTheDocument();
    expect(screen.getByDisplayValue('{"modules":["mod_1"]}')).toBeInTheDocument();
  });

  it('saves edits with the loaded updatedAt so a concurrent edit is caught (REQ-AUTH-005)', async () => {
    const user = userEvent.setup();
    renderPage();

    const name = await screen.findByLabelText(/^name/i);
    await user.clear(name);
    await user.type(name, 'Page View v2');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Page View v2',
          expectedUpdatedAt: '2026-04-04T00:00:00.000Z',
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

  it('rejects malformed config JSON before sending it', async () => {
    const user = userEvent.setup();
    renderPage();

    const config = await screen.findByLabelText(/config/i);
    await user.clear(config);
    // `{` and `[` are special in userEvent.type key syntax; escape them so the
    // literal malformed JSON reaches the field.
    await user.type(config, '{{not valid json');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

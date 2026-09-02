import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { CatalogueCopyPage } from './catalogue-copy-page';

const { copy, catalogueProps, catalogueMods } = vi.hoisted(() => ({
  copy: vi.fn(),
  catalogueProps: vi.fn(),
  catalogueMods: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useProject: () => ({ data: { id: 'prj_1', companyId: 'cmp_1', name: 'Web' } }) as unknown,
    useProperties: () => catalogueProps() as unknown,
    useModules: () => catalogueMods() as unknown,
    useCopyCatalogue: () => ({ mutateAsync: copy, isPending: false }) as unknown,
  };
});

describe('CatalogueCopyPage (REQ-DOM-019)', () => {
  beforeEach(() => {
    copy.mockReset().mockResolvedValue({ copiedProperties: 1, copiedModules: 1 });
    catalogueProps.mockReturnValue({
      data: [
        { id: 'prop_1', name: 'global_user_id' },
        { id: 'prop_2', name: 'consent_state' },
      ],
      isPending: false,
      error: null,
    });
    catalogueMods.mockReturnValue({
      data: [{ id: 'mod_1', name: 'Global Identity' }],
      isPending: false,
      error: null,
    });
  });

  function renderPage(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<CatalogueCopyPage />, {
      routePath: '/projects/:projectId/catalogue',
      route: '/projects/prj_1/catalogue',
    });
  }

  it('lists the company catalogue available to copy', async () => {
    renderPage();

    expect(await screen.findByLabelText('global_user_id')).toBeInTheDocument();
    expect(screen.getByLabelText('consent_state')).toBeInTheDocument();
    expect(screen.getByLabelText('Global Identity')).toBeInTheDocument();
  });

  it('links to creating a brand-new property and module in the project (M1.16)', () => {
    renderPage();

    const property = screen.getByRole('link', { name: 'New property' });
    expect(property).toHaveAttribute('href', '/projects/prj_1/properties/new');

    const module = screen.getByRole('link', { name: 'New module' });
    expect(module).toHaveAttribute('href', '/projects/prj_1/modules/new');
  });

  it('copies only the selected items', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('global_user_id'));
    await user.click(screen.getByLabelText('Global Identity'));
    await user.click(screen.getByRole('button', { name: /copy into project/i }));

    await waitFor(() => {
      expect(copy).toHaveBeenCalledWith({
        propertyIds: ['prop_1'],
        moduleIds: ['mod_1'],
      });
    });
  });

  it('does not call the API when nothing is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /copy into project/i }));

    expect(copy).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('reports what was copied, and that the copy is independent', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('consent_state'));
    await user.click(screen.getByRole('button', { name: /copy into project/i }));

    // The count matters: a module pulls its own properties in, so the number
    // copied can exceed what was ticked (REQ-DOM-019).
    // Success is role="status", not "alert" — only errors are assertive.
    const done = await screen.findByRole('status');
    expect(done).toHaveTextContent(/1 property/i);
    expect(done).toHaveTextContent(/no longer linked/i);
  });
});

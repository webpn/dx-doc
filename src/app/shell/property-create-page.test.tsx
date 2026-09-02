import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { PropertyCreatePage } from './property-create-page';

const { create, projectData } = vi.hoisted(() => ({
  create: vi.fn(),
  projectData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useProject: () => projectData() as unknown,
    useCreateProperty: () => ({ mutateAsync: create, isPending: false }) as unknown,
  };
});

describe('PropertyCreatePage (REQ-DOM-003)', () => {
  beforeEach(() => {
    create.mockReset();
    projectData.mockReturnValue({
      data: { id: 'prj_1', companyId: 'cmp_1', name: 'Web analytics' },
      isLoading: false,
      error: null,
    });
  });

  function renderCreate(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<PropertyCreatePage />, {
      routePath: '/projects/:projectId/properties/new',
      route: '/projects/prj_1/properties/new',
    });
  }

  it('rejects an empty name', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Create property' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a property with the typed attributes and the schema defaults', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'prop_2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'page_language');
    await user.type(screen.getByLabelText('Business label'), 'Page language');
    await user.click(screen.getByLabelText('Contains personal data'));
    await user.click(screen.getByRole('button', { name: 'Create property' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'page_language',
        type: 'string',
        dataSource: 'development',
        status: 'active',
        piiFlag: true,
        businessLabel: 'Page language',
        // Description and hashing policy were left empty, so they are
        // omitted — the API stores null, never ''.
      });
    });
  });

  it('sends a chosen type, data source and status', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'prop_2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'consent_state');
    await user.selectOptions(screen.getByLabelText('Type'), 'boolean');
    await user.selectOptions(screen.getByLabelText('Data source'), 'tag_manager');
    await user.selectOptions(screen.getByLabelText('Status'), 'deprecated');
    await user.click(screen.getByRole('button', { name: 'Create property' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'consent_state',
          type: 'boolean',
          dataSource: 'tag_manager',
          status: 'deprecated',
          piiFlag: false,
        }),
      );
    });
  });

  it('offers the property types, data sources and statuses the API accepts', () => {
    renderCreate();

    for (const type of ['string', 'number', 'boolean', 'array', 'object']) {
      expect(screen.getByRole('option', { name: type })).toBeInTheDocument();
    }
    for (const source of ['development', 'tag_manager', 'other']) {
      expect(screen.getByRole('option', { name: source })).toBeInTheDocument();
    }
    for (const status of ['active', 'deprecated']) {
      expect(screen.getByRole('option', { name: status })).toBeInTheDocument();
    }
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { ModuleCreatePage } from './module-create-page';

const { create, projectData, propertiesData } = vi.hoisted(() => ({
  create: vi.fn(),
  projectData: vi.fn(),
  propertiesData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useProject: () => projectData() as unknown,
    useProperties: () => propertiesData() as unknown,
    useCreateModule: () => ({ mutateAsync: create, isPending: false }) as unknown,
  };
});

const PAGE_LANGUAGE = { id: 'prop_1', name: 'page_language' };
const CONSENT_STATE = { id: 'prop_2', name: 'consent_state' };

describe('ModuleCreatePage (REQ-DOM-004)', () => {
  beforeEach(() => {
    create.mockReset();
    projectData.mockReturnValue({
      data: { id: 'prj_1', companyId: 'cmp_1', name: 'Web analytics' },
      isLoading: false,
      error: null,
    });
    propertiesData.mockReturnValue({
      data: [PAGE_LANGUAGE, CONSENT_STATE],
      isLoading: false,
      error: null,
    });
  });

  function renderCreate(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<ModuleCreatePage />, {
      routePath: '/projects/:projectId/modules/new',
      route: '/projects/prj_1/modules/new',
    });
  }

  it('rejects an empty name', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Create module' }));

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('offers the project’s own properties as the module’s building blocks', () => {
    renderCreate();

    expect(screen.getByLabelText('page_language')).toBeInTheDocument();
    expect(screen.getByLabelText('consent_state')).toBeInTheDocument();
  });

  it('creates a module with the selected properties', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'mod_2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Localization Module');
    await user.click(screen.getByLabelText('page_language'));
    await user.click(screen.getByRole('button', { name: 'Create module' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Localization Module',
        propertyIds: ['prop_1'],
      });
    });
  });

  it('creates an empty module, sending the empty property set explicitly', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'mod_2', created: true });
    renderCreate();

    await user.type(screen.getByLabelText('Name'), 'Shell module');
    await user.click(screen.getByRole('button', { name: 'Create module' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Shell module',
        propertyIds: [],
      });
    });
  });
});

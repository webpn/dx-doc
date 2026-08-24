import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as ReactRouterDom from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';

import { ProjectCreatePage } from './project-create-page';

/**
 * M1.15: create a project inside the company currently selected in the URL.
 *
 * `platform` is required by ProjectCreateInput and has no default in the domain,
 * so the screen must make the actor choose rather than silently pick one.
 */

const createProject = vi.fn();
const navigate = vi.fn();

vi.mock('../queries', () => ({
  useCreateProject: () => ({ mutateAsync: createProject, isPending: false }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigate };
});

beforeEach(() => {
  createProject.mockReset();
  navigate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

const route = '/companies/cmp_1/projects/new';
const routePath = '/companies/:companyId/projects/new';

describe('ProjectCreatePage', () => {
  it('creates a project with the chosen platform', async () => {
    const user = userEvent.setup();
    createProject.mockResolvedValue({ id: 'prj_1', created: true });

    renderWithProviders(<ProjectCreatePage />, { route, routePath });

    await user.type(screen.getByLabelText('Project name'), 'Marketing site');
    await user.type(screen.getByLabelText('Slug'), 'marketing-site');
    await user.selectOptions(screen.getByLabelText('Platform'), 'web');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith({
        name: 'Marketing site',
        slug: 'marketing-site',
        platform: 'web',
      });
    });
  });

  it('requires a platform choice rather than defaulting to one', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ProjectCreatePage />, { route, routePath });

    await user.type(screen.getByLabelText('Project name'), 'Marketing site');
    await user.type(screen.getByLabelText('Slug'), 'marketing-site');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    expect(createProject).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a platform.');
  });

  it('omits optional fields left blank instead of sending empty strings', async () => {
    const user = userEvent.setup();
    createProject.mockResolvedValue({ id: 'prj_1', created: true });

    renderWithProviders(<ProjectCreatePage />, { route, routePath });

    await user.type(screen.getByLabelText('Project name'), 'Marketing site');
    await user.type(screen.getByLabelText('Slug'), 'marketing-site');
    await user.selectOptions(screen.getByLabelText('Platform'), 'ios');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalled();
    });
    // An empty description is absent, not the empty string: the column is
    // nullable and "" would be a value the actor never typed.
    const [payload] = createProject.mock.calls[0] as [Record<string, unknown>];
    expect('description' in payload).toBe(false);
    expect('tagManager' in payload).toBe(false);
    expect('customId' in payload).toBe(false);
  });

  it('navigates to the created project', async () => {
    const user = userEvent.setup();
    createProject.mockResolvedValue({ id: 'prj_77', created: true });

    renderWithProviders(<ProjectCreatePage />, { route, routePath });

    await user.type(screen.getByLabelText('Project name'), 'Marketing site');
    await user.type(screen.getByLabelText('Slug'), 'marketing-site');
    await user.selectOptions(screen.getByLabelText('Platform'), 'web');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/projects/prj_77');
    });
  });
});

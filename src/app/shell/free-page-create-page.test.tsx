import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { FreePageCreatePage } from './free-page-create-page';

const { create, projectData } = vi.hoisted(() => ({
  create: vi.fn(),
  projectData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useCreateFreePage: () => ({ mutateAsync: create, isPending: false }) as unknown,
    useProject: () => projectData() as unknown,
  };
});

const PROJECT = { id: 'prj_1', companyId: 'cmp_1', name: 'Acme app', slug: 'acme' };

describe('FreePageCreatePage (REQ-AUTH-003)', () => {
  beforeEach(() => {
    create.mockReset();
    projectData.mockReturnValue({ data: PROJECT, isPending: false, error: null });
  });

  function renderCreate(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<FreePageCreatePage />, {
      routePath: '/projects/:projectId/free-pages/new',
      route: '/projects/prj_1/free-pages/new',
    });
  }

  it('rejects an empty title', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.click(screen.getByRole('button', { name: 'Create free page' }));

    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an empty slug', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.type(screen.getByLabelText('Title'), 'Glossary');
    await user.click(screen.getByRole('button', { name: 'Create free page' }));

    expect(await screen.findByText('Enter a slug.')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a free page with a title and slug', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({ id: 'fp1' });
    renderCreate();

    await user.type(screen.getByLabelText('Title'), 'Glossary');
    await user.type(screen.getByLabelText('Slug'), 'glossary');
    await user.click(screen.getByRole('button', { name: 'Create free page' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ title: 'Glossary', slug: 'glossary' });
    });
  });
});

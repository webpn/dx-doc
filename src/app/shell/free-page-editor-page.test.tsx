import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { FreePageEditorPage } from './free-page-editor-page';

const { update, remove, freePageData, freePagesData, projectData } = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  freePageData: vi.fn(),
  freePagesData: vi.fn(),
  projectData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    useFreePage: () => freePageData() as unknown,
    useFreePages: () => freePagesData() as unknown,
    useProject: () => projectData() as unknown,
    useUpdateFreePage: () => ({ mutateAsync: update, isPending: false }) as unknown,
    useDeleteFreePage: () => ({ mutateAsync: remove, isPending: false }) as unknown,
  };
});

// The editor itself is verified in markdown-editor.test.tsx; here it stands in
// as a plain textarea so this suite tests the screen's own behaviour, same
// convention as page-editor-page.test.tsx.
vi.mock('../editor', () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (next: string) => void }) => (
    <textarea
      aria-label="Content"
      onChange={(event) => {
        onChange(event.target.value);
      }}
      value={value}
    />
  ),
}));

const PROJECT = { id: 'prj_1', companyId: 'cmp_1', name: 'Acme app', slug: 'acme' };

const FREE_PAGE = {
  id: 'fp1',
  companyId: 'cmp_1',
  projectId: 'prj_1',
  title: 'Glossary',
  slug: 'glossary',
  content: '## Terms',
  publishable: true,
  customId: null,
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('FreePageEditorPage (REQ-AUTH-003)', () => {
  beforeEach(() => {
    update.mockReset();
    remove.mockReset();
    update.mockResolvedValue({ ok: true });
    remove.mockResolvedValue({ ok: true });
    projectData.mockReturnValue({ data: PROJECT, isPending: false, error: null });
    freePageData.mockReturnValue({ data: FREE_PAGE, isPending: false, error: null });
    freePagesData.mockReturnValue({ data: [FREE_PAGE], isPending: false, error: null });
  });

  function renderEditor(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<FreePageEditorPage />, {
      routePath: '/projects/:projectId/free-pages/:freePageId',
      route: '/projects/prj_1/free-pages/fp1',
    });
  }

  it('loads the stored title, slug, publishable flag and content', async () => {
    renderEditor();

    expect(await screen.findByDisplayValue('Glossary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('glossary')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue('## Terms');
    expect(screen.getByLabelText('Publishable')).toBeChecked();
  });

  it('offers only other free pages as a parent, never the page itself', async () => {
    freePagesData.mockReturnValue({
      data: [FREE_PAGE, { ...FREE_PAGE, id: 'fp2', title: 'FAQ', slug: 'faq' }],
      isPending: false,
      error: null,
    });
    renderEditor();

    const parent = await screen.findByLabelText(/parent/i);
    const options = Array.from(parent.querySelectorAll('option')).map((o) => o.textContent);

    expect(options).toContain('FAQ');
    expect(options).not.toContain('Glossary');
  });

  it('saves an edit with the loaded updatedAt as the concurrency guard', async () => {
    const user = userEvent.setup();
    renderEditor();

    const content = await screen.findByLabelText('Content');
    await user.clear(content);
    await user.type(content, 'Rewritten.');
    await user.click(screen.getByRole('button', { name: /save free page/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Rewritten.',
          expectedUpdatedAt: '2026-01-02T00:00:00.000Z',
        }),
      );
    });
  });

  it('reports a stale write instead of silently discarding the edit', async () => {
    update.mockRejectedValue(Object.assign(new Error('stale'), { code: 'stale_write' }));
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole('button', { name: /save free page/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('deletes the free page after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole('button', { name: 'Delete free page' }));

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith('fp1');
    });
  });

  it('does not delete when the confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole('button', { name: 'Delete free page' }));

    expect(remove).not.toHaveBeenCalled();
  });
});

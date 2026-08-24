import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';
import type * as Queries from '../queries';

import { PageEditorPage } from './page-editor-page';

const { update, pageData, pagesData } = vi.hoisted(() => ({
  update: vi.fn(),
  pageData: vi.fn(),
  pagesData: vi.fn(),
}));

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    usePage: () => pageData() as unknown,
    usePages: () => pagesData() as unknown,
    useUpdatePage: () => ({ mutateAsync: update, isPending: false }) as unknown,
  };
});

// The editor itself is verified in markdown-editor.test.tsx; here it stands in
// as a plain textarea so this suite tests the screen's own behaviour (loading,
// parent choices, save payload) rather than re-testing MDXEditor.
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

const PAGE = {
  id: 'pg1',
  projectId: 'prj_1',
  parentId: null,
  name: 'Home',
  slug: 'home',
  description: '## Behaviour\n\nShown after login.',
  customId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('PageEditorPage (REQ-DOM-001, REQ-AUTH-001)', () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue({ ok: true });
    pageData.mockReturnValue({ data: PAGE, isPending: false, error: null });
    pagesData.mockReturnValue({ data: [PAGE], isPending: false, error: null });
  });

  function renderEditor(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<PageEditorPage />, {
      routePath: '/projects/:projectId/pages/:pageId',
      route: '/projects/prj_1/pages/pg1',
    });
  }

  it('loads the stored name, slug and description', async () => {
    renderEditor();

    expect(await screen.findByDisplayValue('Home')).toBeInTheDocument();
    expect(screen.getByDisplayValue('home')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveValue('## Behaviour\n\nShown after login.');
  });

  it('saves an edited description with the loaded updatedAt as the concurrency guard', async () => {
    const user = userEvent.setup();
    renderEditor();

    const description = await screen.findByLabelText('Description');
    await user.clear(description);
    await user.type(description, 'Rewritten.');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Rewritten.',
          expectedUpdatedAt: '2026-01-02T00:00:00.000Z',
        }),
      );
    });
  });

  it('offers only other pages as a parent, never the page itself', async () => {
    pagesData.mockReturnValue({
      data: [PAGE, { ...PAGE, id: 'pg2', name: 'Checkout', slug: 'checkout' }],
      isPending: false,
      error: null,
    });
    renderEditor();

    const parent = await screen.findByLabelText(/parent/i);
    const options = Array.from(parent.querySelectorAll('option')).map((o) => o.textContent);

    expect(options).toContain('Checkout');
    expect(options).not.toContain('Home');
  });

  it('reports a stale write instead of silently discarding the edit', async () => {
    update.mockRejectedValue(Object.assign(new Error('stale'), { code: 'stale_write' }));
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

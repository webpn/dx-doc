import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../../tests/support/render-with-providers';
import { ApiClientError } from '../../api';
import type * as Queries from '../../queries';

import { ReaderViewPage } from './reader-view-page';

const { publishedContent } = vi.hoisted(() => ({
  publishedContent: vi.fn(),
}));

vi.mock('../../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof Queries>();
  return {
    ...actual,
    usePublishedReaderContent: () => publishedContent() as unknown,
  };
});

// The markdown surface is verified in markdown-editor.test.tsx; here the
// shared editor stands in as a plain text node so this suite tests the
// reader screen's own behaviour, same convention as the editor screen tests.
vi.mock('../../editor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <div>{value}</div>,
}));

const PAGE_ONE = {
  id: 'fp_1',
  companyId: 'cmp_1',
  projectId: 'prj_1',
  title: 'Getting started',
  slug: 'getting-started',
  content: '## Overview\nWelcome aboard.',
  publishable: true,
  customId: null,
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const PAGE_TWO = {
  id: 'fp_2',
  companyId: 'cmp_1',
  projectId: 'prj_1',
  title: 'Tracking plan',
  slug: 'tracking-plan',
  content: '## Events\nThe checkout event fires on purchase.',
  publishable: true,
  customId: null,
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

/** Would never leave the server (REQ-SEC-012) — used to prove the client still guards. */
const DRAFT_PAGE = {
  id: 'fp_9',
  companyId: 'cmp_1',
  projectId: 'prj_1',
  title: 'Draft notes',
  slug: 'draft-notes',
  content: 'Do not release this.',
  publishable: false,
  customId: null,
  parentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const CONTENT = {
  versionId: 'ver_3',
  projectId: 'prj_1',
  versionNumber: 3,
  title: 'Acme tracking plan',
  releaseNotes: 'Added checkout events.',
  createdAt: '2026-01-05T10:00:00.000Z',
  snapshot: {
    versionNumber: 3,
    title: 'Acme tracking plan',
    releaseNotes: 'Added checkout events.',
    createdAt: '2026-01-05T10:00:00.000Z',
    properties: [],
    modules: [],
    destinations: [],
    freePages: [PAGE_ONE, PAGE_TWO, DRAFT_PAGE],
    trackings: [],
    flows: [],
  },
};

/**
 * The read-only published view (M1.17, REQ-VIEW-001). Everything asserted
 * here is about what the reader CANNOT do as much as what it shows: nobody
 * can publish, edit, delete or sign out from this surface, because that
 * chrome does not exist to be rendered.
 */
describe('ReaderViewPage (REQ-VIEW-001)', () => {
  beforeEach(() => {
    publishedContent.mockReset();
  });

  function renderReader(): ReturnType<typeof renderWithProviders> {
    return renderWithProviders(<ReaderViewPage />, {
      route: '/projects/prj_1/reader',
      routePath: '/projects/:projectId/reader',
    });
  }

  it('announces the wait while the published documentation loads', () => {
    publishedContent.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    renderReader();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Version 3/ })).not.toBeInTheDocument();
  });

  it('renders the version identity: number, title and publication date', () => {
    publishedContent.mockReturnValue({
      data: CONTENT,
      isPending: false,
      isError: false,
      error: null,
    });
    renderReader();

    expect(
      screen.getByRole('heading', { name: 'Version 3 — Acme tracking plan' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Published /)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders the release notes the editor supplied at publication', () => {
    publishedContent.mockReturnValue({
      data: CONTENT,
      isPending: false,
      isError: false,
      error: null,
    });
    renderReader();

    expect(screen.getByRole('heading', { name: 'Release notes' })).toBeInTheDocument();
    expect(screen.getByText('Added checkout events.')).toBeInTheDocument();
  });

  it('lists the published pages and renders the selected page content', async () => {
    publishedContent.mockReturnValue({
      data: CONTENT,
      isPending: false,
      isError: false,
      error: null,
    });
    const user = userEvent.setup();
    renderReader();

    // The first page is open by default.
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText(/## Overview/)).toBeInTheDocument();
    expect(screen.getByText(/Welcome aboard\./)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tracking plan' }));

    expect(screen.getByRole('heading', { name: 'Tracking plan' })).toBeInTheDocument();
    expect(screen.getByText(/The checkout event fires on purchase\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tracking plan' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('never renders a non-publishable page, even if one reached the payload', () => {
    publishedContent.mockReturnValue({
      data: CONTENT,
      isPending: false,
      isError: false,
      error: null,
    });
    renderReader();

    expect(screen.queryByRole('button', { name: 'Draft notes' })).not.toBeInTheDocument();
    expect(screen.queryByText('Do not release this.')).not.toBeInTheDocument();
  });

  it('exposes no edit, publish, delete or sign-out affordance', () => {
    publishedContent.mockReturnValue({
      data: CONTENT,
      isPending: false,
      isError: false,
      error: null,
    });
    renderReader();

    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('offers a path back to the password entry', () => {
    publishedContent.mockReturnValue({
      data: CONTENT,
      isPending: false,
      isError: false,
      error: null,
    });
    renderReader();

    expect(screen.getByRole('link', { name: 'Enter the shared password again' })).toHaveAttribute(
      'href',
      '/projects/prj_1/reader-access',
    );
  });

  it('shows the re-entry path when the reader session is missing or expired (401)', () => {
    publishedContent.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiClientError(401, { code: 'UNAUTHENTICATED', message: 'no session' }),
    });
    renderReader();

    expect(screen.getByRole('heading', { name: 'Access expired' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter the shared password' })).toHaveAttribute(
      'href',
      '/projects/prj_1/reader-access',
    );
  });

  it('says so when the project has never published (404)', () => {
    publishedContent.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new ApiClientError(404, { code: 'NOT_FOUND', message: 'no version' }),
    });
    renderReader();

    expect(screen.getByRole('heading', { name: 'Nothing published yet' })).toBeInTheDocument();
  });

  it('reports a generic load failure without pretending it is an expiry', () => {
    publishedContent.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('kaboom'),
    });
    renderReader();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The published documentation could not be loaded.',
    );
  });
});

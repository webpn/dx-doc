import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../tests/support/render-with-providers';

import { ProjectPage } from './project-page';

vi.mock('../queries', () => ({
  useProject: () => ({
    data: {
      id: 'prj_1',
      companyId: 'cmp_1',
      name: 'Marketing site',
      slug: 'marketing-site',
      platform: 'web',
    },
    isLoading: false,
    isError: false,
  }),
  useUnpublishedChanges: () => ({ data: { hasUnpublishedChanges: false } }),
  usePublicationPreview: () => ({ data: undefined, isLoading: false, isError: false }),
  usePublishVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('./project-workspace', () => ({
  ProjectWorkspace: (props: { children: ReactNode }) => <div>{props.children}</div>,
}));

vi.mock('./publish-version-dialog', () => ({
  PublishVersionDialog: () => null,
}));

describe('ProjectPage', () => {
  it('links to the public reader-access screen', () => {
    renderWithProviders(<ProjectPage />, {
      route: '/projects/prj_1',
      routePath: '/projects/:projectId',
    });

    expect(screen.getByRole('link', { name: 'Open reader access' })).toHaveAttribute(
      'href',
      '/projects/prj_1/reader-access',
    );
  });
});

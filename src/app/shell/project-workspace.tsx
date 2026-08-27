import type { ReactElement, ReactNode } from 'react';

import { PageTreeSidebar } from './page-tree-sidebar';

export interface ProjectWorkspaceProps {
  projectId: string;
  /** The page open in the content area, if any, so the sidebar highlights it. */
  currentPageId?: string;
  children: ReactNode;
}

/**
 * Two-column layout shared by every screen that lives inside a project's
 * page hierarchy (REQ-NAV-001): the navigable sidebar on the left, the
 * screen's own content on the right. Desktop-only per REQ-NFR-007, matching
 * the design system's layout primitives — no responsive collapse.
 */
export function ProjectWorkspace(props: ProjectWorkspaceProps): ReactElement {
  const { projectId, currentPageId, children } = props;
  return (
    <div className="flex items-start gap-6">
      <PageTreeSidebar
        {...(currentPageId === undefined ? {} : { currentPageId })}
        projectId={projectId}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

import { Alert, Button, Skeleton, cn } from '@project/design-system';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import type { Page } from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useFlows, usePages } from '../queries';

interface PageTreeNode {
  page: Page;
  children: PageTreeNode[];
}

/**
 * Arranges a flat page list into the parent/child tree the sidebar renders
 * (REQ-NAV-001). A page whose declared parent is missing from the list — it
 * belongs to another project, or was deleted after this page was loaded — is
 * shown at the top level rather than silently dropped, so no page ever
 * disappears from the nav because of a dangling reference.
 */
function buildTree(pages: Page[]): PageTreeNode[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const childrenOf = new Map<string, Page[]>();
  const roots: Page[] = [];

  for (const page of pages) {
    if (page.parentId !== null && byId.has(page.parentId)) {
      const siblings = childrenOf.get(page.parentId) ?? [];
      siblings.push(page);
      childrenOf.set(page.parentId, siblings);
    } else {
      roots.push(page);
    }
  }

  function toNode(page: Page): PageTreeNode {
    return {
      page,
      children: (childrenOf.get(page.id) ?? []).map(toNode),
    };
  }

  return roots.map(toNode);
}

interface PageTreeItemProps {
  node: PageTreeNode;
  projectId: string;
  currentPageId: string | undefined;
  depth: number;
}

function PageTreeItem(props: PageTreeItemProps): ReactElement {
  const { node, projectId, currentPageId, depth } = props;
  const isCurrent = node.page.id === currentPageId;

  return (
    <li>
      <Link
        aria-current={isCurrent ? 'page' : undefined}
        className={cn(
          'block rounded-md px-2 py-1.5 text-sm',
          isCurrent
            ? 'bg-[var(--color-primary)] font-semibold text-white'
            : 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]',
        )}
        style={{ paddingLeft: `${String(depth * 16 + 8)}px` }}
        to={`/projects/${projectId}/pages/${node.page.id}`}
      >
        {node.page.name}
      </Link>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <PageTreeItem
              currentPageId={currentPageId}
              depth={depth + 1}
              key={child.page.id}
              node={child}
              projectId={projectId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export interface PageTreeSidebarProps {
  projectId: string;
  /** The page currently open in the content area, if any, so it can be highlighted. */
  currentPageId?: string;
}

/**
 * Navigable sidebar over a project's page hierarchy (REQ-NAV-001). The whole
 * tree loads in one request — `usePages` already caches it project-wide — so
 * opening any page never re-fetches the nav around it.
 */
export function PageTreeSidebar(props: PageTreeSidebarProps): ReactElement {
  const { projectId, currentPageId } = props;
  const t = useTranslate();
  const pages = usePages(projectId);
  const flows = useFlows(projectId);

  return (
    <nav
      aria-label={t('page.tree.title')}
      className="w-64 flex-none border-r border-[var(--color-border)] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t('page.tree.title')}</h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/projects/${projectId}/pages/new`}>{t('page.tree.newPage')}</Link>
        </Button>
      </div>

      {pages.isLoading ? <Skeleton className="h-24" /> : null}

      {pages.isError ? <Alert variant="error">{t(apiErrorMessageKey(pages.error))}</Alert> : null}

      {pages.data?.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('page.tree.empty')}</p>
      ) : null}

      {pages.data !== undefined && pages.data.length > 0 ? (
        <ul>
          {buildTree(pages.data).map((node) => (
            <PageTreeItem
              currentPageId={currentPageId}
              depth={0}
              key={node.page.id}
              node={node}
              projectId={projectId}
            />
          ))}
        </ul>
      ) : null}

      {/* Flows exposed alongside the hierarchy (REQ-NAV-007). */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t('flow.list.title')}</h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/projects/${projectId}/flows/new`}>{t('flow.list.create')}</Link>
        </Button>
      </div>

      {flows.isLoading ? <Skeleton className="h-24" /> : null}

      {flows.isError ? <Alert variant="error">{t(apiErrorMessageKey(flows.error))}</Alert> : null}

      {flows.data?.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('flow.list.empty')}</p>
      ) : null}

      {flows.data !== undefined && flows.data.length > 0 ? (
        <ul>
          {flows.data.map((flow) => (
            <li key={flow.id}>
              <Link
                className="block rounded-md px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                to={`/projects/${projectId}/flows/${flow.id}`}
              >
                {flow.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}

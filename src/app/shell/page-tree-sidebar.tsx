import { Alert, Button, Skeleton, cn } from '@project/design-system';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import type { Page } from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import {
  useFlows,
  useModules,
  useNavigationEvents,
  usePages,
  useProject,
  useProperties,
  useTrackings,
} from '../queries';

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
  const trackings = useTrackings(projectId);
  const navigationEvents = useNavigationEvents(projectId);
  // Properties and modules are company-scoped with a project filter; the
  // project supplies the company scope, exactly as the catalogue screen does.
  const companyId = useProject(projectId).data?.companyId;
  const properties = useProperties(companyId, projectId);
  const modules = useModules(companyId, projectId);

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

      {/* Trackings alongside the hierarchy and flows, in the same section
          pattern — until this existed the tracking editor had no entry point
          outside a page's tracking recap. */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          {t('tracking.list.title')}
        </h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/projects/${projectId}/trackings/new`}>{t('tracking.list.create')}</Link>
        </Button>
      </div>

      {trackings.isLoading ? <Skeleton className="h-24" /> : null}

      {trackings.isError ? (
        <Alert variant="error">{t(apiErrorMessageKey(trackings.error))}</Alert>
      ) : null}

      {trackings.data?.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('tracking.list.empty')}</p>
      ) : null}

      {trackings.data !== undefined && trackings.data.length > 0 ? (
        <ul>
          {trackings.data.map((tracking) => (
            <li key={tracking.id}>
              <Link
                className="block rounded-md px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                to={`/projects/${projectId}/trackings/${tracking.id}`}
              >
                {tracking.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          {t('navigationEvent.list.title')}
        </h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/projects/${projectId}/navigation-events/new`}>
            {t('navigationEvent.list.create')}
          </Link>
        </Button>
      </div>

      {navigationEvents.isLoading ? <Skeleton className="h-24" /> : null}

      {navigationEvents.isError ? (
        <Alert variant="error">{t(apiErrorMessageKey(navigationEvents.error))}</Alert>
      ) : null}

      {navigationEvents.data?.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('navigationEvent.list.empty')}</p>
      ) : null}

      {navigationEvents.data !== undefined && navigationEvents.data.length > 0 ? (
        <ul>
          {navigationEvents.data.map((navigationEvent) => (
            <li key={navigationEvent.id}>
              <span className="block rounded-md px-2 py-1.5 text-sm text-[var(--color-ink)]">
                {navigationEvent.name}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Properties and modules in the same section pattern — until these
          sections existed the property and module editors had no entry point
          outside a direct URL. */}
      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          {t('property.list.title')}
        </h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/projects/${projectId}/properties/new`}>{t('property.list.create')}</Link>
        </Button>
      </div>

      {properties.isLoading ? <Skeleton className="h-24" /> : null}

      {properties.isError ? (
        <Alert variant="error">{t(apiErrorMessageKey(properties.error))}</Alert>
      ) : null}

      {properties.data?.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('property.list.empty')}</p>
      ) : null}

      {properties.data !== undefined && properties.data.length > 0 ? (
        <ul>
          {properties.data.map((property) => (
            <li key={property.id}>
              <Link
                className="block rounded-md px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                to={`/projects/${projectId}/properties/${property.id}`}
              >
                {property.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{t('module.list.title')}</h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={`/projects/${projectId}/modules/new`}>{t('module.list.create')}</Link>
        </Button>
      </div>

      {modules.isLoading ? <Skeleton className="h-24" /> : null}

      {modules.isError ? (
        <Alert variant="error">{t(apiErrorMessageKey(modules.error))}</Alert>
      ) : null}

      {modules.data?.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('module.list.empty')}</p>
      ) : null}

      {modules.data !== undefined && modules.data.length > 0 ? (
        <ul>
          {modules.data.map((module) => (
            <li key={module.id}>
              <Link
                className="block rounded-md px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
                to={`/projects/${projectId}/modules/${module.id}`}
              >
                {module.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}

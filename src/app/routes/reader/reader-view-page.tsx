import { Alert, AppHeader, AppMain, AppShell, Skeleton } from '@project/design-system';
import { useState, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiClientError, type FreePage } from '../../api';
import { MarkdownEditor } from '../../editor';
import { useFormatters, useTranslate } from '../../i18n';
import { usePublishedReaderContent } from '../../queries';

/** A free page and its publishable children, nested for the reader's nav. */
interface ReaderNavNode {
  page: FreePage;
  children: ReaderNavNode[];
}

/**
 * Builds the page tree the reader navigates. A page whose parent is not in
 * the publishable set (held back from this publication, REQ-VER-003) becomes
 * a top-level entry rather than disappearing: its content was published, so
 * it must be reachable. Server order is preserved, roots then children, so
 * the nav is stable across reloads.
 *
 * The server already strips non-publishable pages (REQ-SEC-012); the extra
 * `publishable` filter is defence in depth so the reader stays honest even if
 * a non-publishable record ever reached the client by accident.
 */
function buildPageTree(pages: FreePage[]): ReaderNavNode[] {
  const publishable = pages.filter((page) => page.publishable);
  const byId = new Map<string, ReaderNavNode>(
    publishable.map((page) => [page.id, { page, children: [] }]),
  );
  const roots: ReaderNavNode[] = [];
  for (const node of byId.values()) {
    const parent = node.page.parentId === null ? undefined : byId.get(node.page.parentId);
    if (parent === undefined) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }
  return roots;
}

function flatten(nodes: ReaderNavNode[]): FreePage[] {
  return nodes.flatMap((node) => [node.page, ...flatten(node.children)]);
}

/**
 * The read-only published documentation (M1.17, REQ-VIEW-001): what a
 * person holding the project's shared password lands on.
 *
 * Rendered OUTSIDE the authenticated shell on purpose — no company or
 * project switcher, no management navigation, no edit affordance of any
 * kind. The only actions are navigating between published pages and going
 * back to the password entry. The server already filtered the snapshot to
 * publishable pages (REQ-SEC-012); this screen renders exactly that payload
 * and nothing the client could reconstruct.
 */
export function ReaderViewPage(): ReactElement {
  const t = useTranslate();
  const { formatDateTime } = useFormatters();
  const { projectId } = useParams<{ projectId: string }>();
  const reader = usePublishedReaderContent(projectId);

  // Which page is open in the content area. Kept as an id so a page click
  // does not depend on the array identity; an id that is gone after a reload
  // falls back to the first page.
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const accessPath = `/projects/${projectId ?? ''}/reader-access`;

  // A missing or expired reader session is an expected state, not an error:
  // the API answers 401 and the reader must be told how to get back in. This
  // is checked before the generic error branch so the re-entry path never
  // flashes behind a generic failure message.
  if (reader.isError && isUnauthenticated(reader.error)) {
    return (
      <AppShell>
        <AppHeader className="h-auto flex-col items-start gap-2 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('reader.eyebrow')}
          </p>
        </AppHeader>
        <AppMain>
          <div className="max-w-md">
            <h1 className="text-2xl font-bold text-[var(--color-ink)]">
              {t('reader.expired.title')}
            </h1>
            <p className="mt-2 text-[var(--color-muted)]">{t('reader.expired.description')}</p>
            <Link
              className="mt-6 inline-flex h-10 w-fit items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"
              to={accessPath}
            >
              {t('reader.expired.action')}
            </Link>
          </div>
        </AppMain>
      </AppShell>
    );
  }

  // No published version at all: the reader session is valid, there is just
  // nothing to read yet.
  if (reader.isError && isNotFound(reader.error)) {
    return (
      <AppShell>
        <AppHeader className="h-auto flex-col items-start gap-2 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('reader.eyebrow')}
          </p>
        </AppHeader>
        <AppMain>
          <div className="max-w-md">
            <h1 className="text-2xl font-bold text-[var(--color-ink)]">
              {t('reader.notPublished.title')}
            </h1>
            <p className="mt-2 text-[var(--color-muted)]">{t('reader.notPublished.description')}</p>
            <Link
              className="mt-6 inline-flex h-10 w-fit items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)]"
              to={accessPath}
            >
              {t('reader.expired.action')}
            </Link>
          </div>
        </AppMain>
      </AppShell>
    );
  }

  if (reader.isLoading) {
    return (
      <AppShell>
        <AppHeader className="h-auto flex-col items-start gap-2 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('reader.eyebrow')}
          </p>
        </AppHeader>
        <AppMain>
          <div role="status">
            <Skeleton className="h-24 w-64" />
            <Skeleton className="mt-4 h-48" />
          </div>
        </AppMain>
      </AppShell>
    );
  }

  if (reader.isError) {
    return (
      <AppShell>
        <AppHeader className="h-auto flex-col items-start gap-2 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('reader.eyebrow')}
          </p>
        </AppHeader>
        <AppMain>
          <Alert variant="error">{t('reader.loadError')}</Alert>
        </AppMain>
      </AppShell>
    );
  }

  if (reader.data === undefined) {
    return <></>;
  }

  const version = reader.data;
  const tree = buildPageTree(version.snapshot.freePages);
  const pages = flatten(tree);
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];

  return (
    <AppShell className="bg-[var(--color-surface-muted)]">
      <AppHeader className="h-auto flex-col items-start gap-2 py-4">
        <div className="flex w-full items-center justify-between gap-6">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('reader.eyebrow')}
          </p>
          <Link
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            to={accessPath}
          >
            {t('reader.header.reEnter')}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">
          {t('reader.header.versionTitle', { number: version.versionNumber })}
          {version.title !== null && version.title !== '' ? ` — ${version.title}` : ''}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          {t('reader.header.publishedAt', { date: formatDateTime(version.createdAt) })}
        </p>
      </AppHeader>

      <AppMain>
        <div className="flex items-start gap-8">
          <nav aria-label={t('reader.pagesLabel')} className="w-64 shrink-0">
            {pages.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">{t('reader.pagesEmpty')}</p>
            ) : (
              <ul className="space-y-0.5">
                {tree.map((node) => (
                  <ReaderNavBranch
                    depth={0}
                    isSelected={(page) => page.id === selectedPage?.id}
                    key={node.page.id}
                    node={node}
                    onSelect={setSelectedPageId}
                  />
                ))}
              </ul>
            )}
          </nav>

          <div className="min-w-0 flex-1">
            {version.releaseNotes !== null && version.releaseNotes !== '' ? (
              <section className="mb-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                  {t('reader.releaseNotes')}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-ink)]">
                  {version.releaseNotes}
                </p>
              </section>
            ) : null}

            <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
              {selectedPage === undefined ? (
                <p className="text-sm text-[var(--color-muted)]">{t('reader.pagesEmpty')}</p>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                    {selectedPage.title}
                  </h2>
                  <section className="mt-6">
                    <MarkdownEditor
                      onChange={() => {
                        // Read-only rendering: the shared editor (ADR-0023) in
                        // readOnly mode never fires onChange; the no-op keeps
                        // this consumer honest about being a viewer, not an
                        // author.
                      }}
                      readOnly
                      value={selectedPage.content}
                    />
                  </section>
                </>
              )}
            </article>
          </div>
        </div>
      </AppMain>
    </AppShell>
  );
}

function isUnauthenticated(error: Error): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

function isNotFound(error: Error): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

function ReaderNavBranch(props: {
  depth: number;
  isSelected: (page: FreePage) => boolean;
  node: ReaderNavNode;
  onSelect: (pageId: string | null) => void;
}): ReactElement {
  const { depth, isSelected, node, onSelect } = props;
  const selected = isSelected(node.page);
  return (
    <li>
      <button
        aria-current={selected ? 'true' : undefined}
        className={`block w-full rounded-md px-3 py-1.5 text-left text-sm ${
          selected
            ? 'bg-[var(--color-surface)] font-semibold text-[var(--color-ink)]'
            : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
        }`}
        onClick={() => {
          onSelect(node.page.id);
        }}
        style={depth === 0 ? undefined : { paddingLeft: `${String(12 + depth * 16)}px` }}
        type="button"
      >
        {node.page.title}
      </button>
      {node.children.length > 0 ? (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <ReaderNavBranch
              depth={depth + 1}
              isSelected={isSelected}
              key={child.page.id}
              node={child}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

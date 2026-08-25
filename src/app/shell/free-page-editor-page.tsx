import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@project/design-system';
import { useEffect, useState, type ReactElement, type SyntheticEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { MarkdownEditor } from '../editor';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import {
  useDeleteFreePage,
  useFreePage,
  useFreePages,
  useProject,
  useUpdateFreePage,
} from '../queries';

/**
 * Edit one free page: title, slug, its own parent, the publishable flag, and
 * content (REQ-AUTH-003).
 *
 * Free pages have a hierarchy independent of the Page/Screen tree, so the
 * parent choices offered here are other free pages in the same scope, never a
 * `Page`. Content is Markdown through the shared editor (REQ-AUTH-001), same
 * as a page description.
 *
 * Saving sends the loaded `updatedAt` as `expectedUpdatedAt` (REQ-AUTH-005,
 * ADR-0016): a concurrent edit is reported, never silently overwritten.
 */
export function FreePageEditorPage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId, freePageId } = useParams<{ projectId: string; freePageId: string }>();
  const project = useProject(projectId);
  const companyId = project.data?.companyId;
  const freePage = useFreePage(freePageId);
  const freePages = useFreePages(companyId, projectId ?? null);
  const updateFreePage = useUpdateFreePage(freePageId ?? '', companyId ?? '', projectId ?? null);
  const deleteFreePage = useDeleteFreePage(companyId ?? '', projectId ?? null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [publishable, setPublishable] = useState(true);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Seed the form from the loaded free page, re-seeding whenever the stored
  // record changes (including after a save, which bumps updatedAt) but never
  // on an unrelated re-render that would discard typing — same convention as
  // PageEditorPage.
  const loaded = freePage.data;
  useEffect(() => {
    if (loaded === undefined) return;
    setTitle(loaded.title);
    setSlug(loaded.slug);
    setParentId(loaded.parentId ?? '');
    setPublishable(loaded.publishable);
    setContent(loaded.content);
  }, [loaded]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (title.trim() === '') {
      setError(t('freePage.edit.missingTitle'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('freePage.edit.missingSlug'));
      return;
    }
    if (loaded === undefined) return;

    try {
      await updateFreePage.mutateAsync({
        title: title.trim(),
        slug: slug.trim(),
        // An omitted parentId leaves the parent alone; the API treats the
        // absent key and an explicit null differently (tri-state), so only a
        // real choice is sent as null and only when it actually changed to
        // "no parent".
        parentId: parentId === '' ? null : parentId,
        publishable,
        content,
        expectedUpdatedAt: loaded.updatedAt,
      });
      setNotice(t('freePage.edit.saved'));
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleDelete(): Promise<void> {
    if (freePageId === undefined) return;
    // window.confirm is used deliberately: no AlertDialog primitive exists yet
    // for destructive-action confirmation elsewhere in this codebase.
    if (!window.confirm(t('freePage.edit.deleteConfirm'))) return;

    setError(null);
    try {
      await deleteFreePage.mutateAsync(freePageId);
      void navigate(`/projects/${projectId ?? ''}/free-pages`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  if (freePage.isPending) {
    return <p>{t('freePage.edit.loading')}</p>;
  }
  if (freePage.error !== null || loaded === undefined) {
    return <Alert variant="error">{t('freePage.edit.loadError')}</Alert>;
  }

  // A free page cannot be its own parent; the service also rejects a cycle
  // and a cross-scope parent, but filtering self out here avoids offering the
  // one choice that is always wrong.
  const parentChoices = (freePages.data ?? []).filter((candidate) => candidate.id !== loaded.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('freePage.edit.title')}</CardTitle>
        <CardDescription>{t('freePage.edit.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="free-page-title" label={t('freePage.edit.titleLabel')}>
          <Input
            id="free-page-title"
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            value={title}
          />
        </Field>
        <Field htmlFor="free-page-slug" label={t('freePage.edit.slug')}>
          <Input
            id="free-page-slug"
            onChange={(e) => {
              setSlug(e.target.value);
            }}
            value={slug}
          />
        </Field>
        <Field htmlFor="free-page-parent" label={t('freePage.edit.parent')}>
          <select
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            id="free-page-parent"
            onChange={(e) => {
              setParentId(e.target.value);
            }}
            value={parentId}
          >
            <option value="">{t('freePage.edit.parentNone')}</option>
            {parentChoices.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center gap-2">
          <input
            checked={publishable}
            id="free-page-publishable"
            onChange={(e) => {
              setPublishable(e.target.checked);
            }}
            type="checkbox"
          />
          <label htmlFor="free-page-publishable">{t('freePage.edit.publishable')}</label>
        </div>
        <Field htmlFor="free-page-content" label={t('freePage.edit.content')}>
          <MarkdownEditor
            companyId={companyId}
            onChange={setContent}
            projectId={projectId}
            value={content}
          />
        </Field>
        {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        <Button disabled={updateFreePage.isPending} type="submit">
          {t('freePage.edit.save')}
        </Button>
      </form>

      <Button
        disabled={deleteFreePage.isPending}
        onClick={() => void handleDelete()}
        type="button"
        variant="secondary"
      >
        {t('freePage.edit.delete')}
      </Button>
    </Card>
  );
}

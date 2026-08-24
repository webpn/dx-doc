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
import { useParams } from 'react-router-dom';

import { MarkdownEditor } from '../editor';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { usePage, usePages, useProject, useUpdatePage } from '../queries';

/**
 * Edit one page: name, slug, parent and behavioural description (REQ-DOM-001).
 *
 * The description is Markdown through the shared editor (REQ-AUTH-001), so
 * screenshots are pasted straight into it as uploaded-asset references
 * (REQ-AUTH-002) — there is no separate screenshot field to manage.
 *
 * Saving sends the `updatedAt` this screen loaded as `expectedUpdatedAt`
 * (REQ-AUTH-005, ADR-0016): a concurrent edit is reported, never overwritten.
 */
export function PageEditorPage(): ReactElement {
  const t = useTranslate();
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const page = usePage(pageId);
  const pages = usePages(projectId);
  const project = useProject(projectId);
  const updatePage = useUpdatePage(pageId ?? '', projectId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Seed the form from the loaded page. TanStack Query returns a stable object
  // for an unchanged cache entry, so depending on the record itself re-seeds
  // exactly when the stored page changes — including after a save, which bumps
  // updatedAt — and never on an unrelated re-render that would discard typing.
  const loaded = page.data;
  useEffect(() => {
    if (loaded === undefined) return;
    setName(loaded.name);
    setSlug(loaded.slug);
    setParentId(loaded.parentId ?? '');
    setDescription(loaded.description ?? '');
  }, [loaded]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (name.trim() === '') {
      setError(t('page.edit.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('page.edit.missingSlug'));
      return;
    }
    if (loaded === undefined) return;

    try {
      await updatePage.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        // An omitted parentId means "no parent"; the API treats the absent key
        // and an empty string differently, so send only a real id.
        ...(parentId === '' ? {} : { parentId }),
        description,
        expectedUpdatedAt: loaded.updatedAt,
      });
      setNotice(t('page.edit.saved'));
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  if (page.isPending) {
    return <p>{t('page.edit.loading')}</p>;
  }
  if (page.error !== null || loaded === undefined) {
    return <Alert variant="error">{t('page.edit.loadError')}</Alert>;
  }

  // A page cannot be its own parent, and the API rejects a cross-project
  // parent (REQ-FDN-013), so only this project's other pages are offered.
  const parentChoices = (pages.data ?? []).filter((candidate) => candidate.id !== loaded.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.edit.title')}</CardTitle>
        <CardDescription>{t('page.edit.subtitle')}</CardDescription>
      </CardHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="page-name" label={t('page.edit.name')}>
          <Input
            id="page-name"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </Field>
        <Field htmlFor="page-slug" label={t('page.edit.slug')}>
          <Input
            id="page-slug"
            onChange={(e) => {
              setSlug(e.target.value);
            }}
            value={slug}
          />
        </Field>
        <Field htmlFor="page-parent" label={t('page.edit.parent')}>
          <select
            id="page-parent"
            onChange={(e) => {
              setParentId(e.target.value);
            }}
            value={parentId}
          >
            <option value="">{t('page.edit.parentNone')}</option>
            {parentChoices.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor="page-description" label={t('page.edit.description')}>
          <MarkdownEditor
            companyId={project.data?.companyId}
            onChange={setDescription}
            projectId={projectId}
            value={description}
          />
        </Field>
        {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        <Button disabled={updatePage.isPending} type="submit">
          {t('page.edit.save')}
        </Button>
      </form>
    </Card>
  );
}

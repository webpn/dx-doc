import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Skeleton,
  Textarea,
} from '@project/design-system';
import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { ApiClientError, type PublishVersionInput } from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { usePublicationPreview, usePublishVersion } from '../queries';

import { ChangelogList } from './changelog-list';

export interface PublishVersionDialogProps {
  companyId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The publication flow in one dialog (M1.17, REQ-VER-004, REQ-VER-005): the
 * pre-publication diff the editor reviews before confirming, the version
 * metadata they supply at publication, and the success/error states of the
 * command itself.
 *
 * Radix unmounts a closed dialog's content, so the form state resets on
 * every open without an effect.
 */
export function PublishVersionDialog(props: PublishVersionDialogProps): ReactElement {
  const { companyId, projectId, open, onOpenChange } = props;
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <PublishVersionForm
          companyId={companyId}
          onClose={() => {
            onOpenChange(false);
          }}
          projectId={projectId}
        />
      </DialogContent>
    </Dialog>
  );
}

function PublishVersionForm(props: {
  companyId: string;
  projectId: string;
  onClose: () => void;
}): ReactElement {
  const { companyId, projectId, onClose } = props;
  const t = useTranslate();
  const [title, setTitle] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [publishedNumber, setPublishedNumber] = useState<number | null>(null);

  const preview = usePublicationPreview(companyId, projectId, true);
  const publish = usePublishVersion(companyId, projectId);

  async function handleConfirm(): Promise<void> {
    setError(null);

    // Only non-empty metadata travels: an omitted field and an empty one are
    // the same to the server, and the wire type keeps the distinction honest.
    const input: PublishVersionInput = {};
    if (title !== '') input.title = title;
    if (releaseNotes !== '') input.releaseNotes = releaseNotes;

    try {
      const result = await publish.mutateAsync(input);
      setPublishedNumber(result.versionNumber);
    } catch (cause) {
      // PUBLICATION_INTEGRITY carries the blocking reason as data (REQ-FDN-010);
      // every other failure maps to its comprehensible message (REQ-NFR-010).
      if (
        cause instanceof ApiClientError &&
        cause.code === 'PUBLICATION_INTEGRITY' &&
        cause.reason !== undefined
      ) {
        setError(t('publish.error.integrity', { reason: cause.reason }));
      } else {
        setError(t(apiErrorMessageKey(cause)));
      }
    }
  }

  if (publishedNumber !== null) {
    return (
      <div className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{t('publish.dialogTitle')}</DialogTitle>
        </DialogHeader>
        <Alert variant="success">{t('publish.success', { number: publishedNumber })}</Alert>
        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            {t('publish.close')}
          </Button>
          <Link
            className="inline-flex h-10 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-ink)] hover:bg-[var(--color-primary-hover)]"
            onClick={onClose}
            to={`/projects/${projectId}/versions`}
          >
            {t('publish.successHistoryLink')}
          </Link>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleConfirm();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('publish.dialogTitle')}</DialogTitle>
        <DialogDescription>{t('publish.dialogDescription')}</DialogDescription>
      </DialogHeader>

      <section className="mt-4 grid gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          {t('publish.previewTitle')}
        </h3>
        {preview.isLoading ? (
          <div className="grid gap-2" role="status">
            <p className="text-sm text-[var(--color-muted)]">{t('publish.previewLoading')}</p>
            <Skeleton className="h-16" />
          </div>
        ) : null}
        {preview.isError ? <Alert variant="error">{t('publish.previewLoadError')}</Alert> : null}
        {preview.data?.changelog.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t('publish.previewEmpty')}</p>
        ) : null}
        {preview.data?.changelog.length ? <ChangelogList entries={preview.data.changelog} /> : null}
      </section>

      <div className="mt-4 grid gap-4">
        <Field htmlFor="publish-title" label={t('publish.titleLabel')}>
          <Input
            id="publish-title"
            maxLength={200}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            value={title}
          />
        </Field>
        <Field htmlFor="publish-release-notes" label={t('publish.releaseNotesLabel')}>
          <Textarea
            id="publish-release-notes"
            onChange={(event) => {
              setReleaseNotes(event.target.value);
            }}
            value={releaseNotes}
          />
        </Field>
      </div>

      {error !== null ? (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <DialogFooter className="mt-6">
        <Button onClick={onClose} type="button" variant="secondary">
          {t('publish.cancel')}
        </Button>
        <Button disabled={publish.isPending} type="submit">
          {publish.isPending ? t('publish.confirming') : t('publish.confirm')}
        </Button>
      </DialogFooter>
    </form>
  );
}

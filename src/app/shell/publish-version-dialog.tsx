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
import {
  useFlows,
  useFreePages,
  usePublicationPreview,
  usePublishVersion,
  useTrackings,
} from '../queries';

import { ChangelogList } from './changelog-list';

export interface PublishVersionDialogProps {
  companyId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The publication flow in one dialog (M1.17, REQ-VER-003, REQ-VER-004,
 * REQ-VER-005): the pre-publication diff the editor reviews before
 * confirming, the entities they can hold back from this publication only,
 * the version metadata they supply, and the success/error states of the
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
  const [holdBackOpen, setHoldBackOpen] = useState(false);
  const [excludedTrackingIds, setExcludedTrackingIds] = useState<string[]>([]);
  const [excludedPageIds, setExcludedPageIds] = useState<string[]>([]);
  const [excludedFlowIds, setExcludedFlowIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishedNumber, setPublishedNumber] = useState<number | null>(null);

  const preview = usePublicationPreview(companyId, projectId, true);
  const publish = usePublishVersion(companyId, projectId);
  const trackings = useTrackings(projectId);
  const pages = useFreePages(companyId, projectId);
  const flows = useFlows(projectId);

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  async function handleConfirm(): Promise<void> {
    setError(null);

    // Only non-empty metadata travels: an omitted field and an empty one are
    // the same to the server, and the wire type keeps the distinction honest.
    const input: PublishVersionInput = {};
    if (title !== '') input.title = title;
    if (releaseNotes !== '') input.releaseNotes = releaseNotes;
    // Selective publication (REQ-VER-003): a held-back entity travels in the
    // publish body; an omitted array is the server's "publish everything".
    if (excludedTrackingIds.length > 0) input.excludedTrackingIds = excludedTrackingIds;
    if (excludedPageIds.length > 0) input.excludedPageIds = excludedPageIds;
    if (excludedFlowIds.length > 0) input.excludedFlowIds = excludedFlowIds;

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

      <section className="mt-4">
        <button
          aria-expanded={holdBackOpen}
          className="text-sm font-semibold text-[var(--color-ink)] underline underline-offset-2"
          onClick={() => {
            setHoldBackOpen((current) => !current);
          }}
          type="button"
        >
          {t('publish.holdBack.summary')}
        </button>
        {holdBackOpen ? (
          <div className="mt-2 grid gap-3">
            <p className="text-sm text-[var(--color-muted)]">{t('publish.holdBack.hint')}</p>
            <HoldBackGroup
              idPrefix="publish-hold-back-tracking"
              isError={trackings.isError}
              isLoading={trackings.isLoading}
              items={(trackings.data ?? []).map((tracking) => ({
                id: tracking.id,
                name: tracking.name,
              }))}
              legend={t('publish.holdBack.trackings')}
              onToggle={(id) => {
                setExcludedTrackingIds((current) => toggle(current, id));
              }}
              selectedIds={excludedTrackingIds}
            />
            <HoldBackGroup
              idPrefix="publish-hold-back-page"
              isError={pages.isError}
              isLoading={pages.isLoading}
              items={(pages.data ?? [])
                .filter((page) => page.publishable)
                .map((page) => ({ id: page.id, name: page.title }))}
              legend={t('publish.holdBack.pages')}
              onToggle={(id) => {
                setExcludedPageIds((current) => toggle(current, id));
              }}
              selectedIds={excludedPageIds}
            />
            <HoldBackGroup
              idPrefix="publish-hold-back-flow"
              isError={flows.isError}
              isLoading={flows.isLoading}
              items={(flows.data ?? []).map((flow) => ({ id: flow.id, name: flow.name }))}
              legend={t('publish.holdBack.flows')}
              onToggle={(id) => {
                setExcludedFlowIds((current) => toggle(current, id));
              }}
              selectedIds={excludedFlowIds}
            />
          </div>
        ) : null}
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

/**
 * One checkbox group of the hold-back section (REQ-VER-003): a fieldset with
 * a legend names the group for assistive tech, and native checkboxes keep it
 * keyboard operable without extra wiring.
 */
function HoldBackGroup(props: {
  idPrefix: string;
  isError: boolean;
  isLoading: boolean;
  items: { id: string; name: string }[];
  legend: string;
  onToggle: (id: string) => void;
  selectedIds: string[];
}): ReactElement {
  const t = useTranslate();
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[var(--color-ink)]">{props.legend}</legend>
      {props.isLoading ? (
        <p className="text-sm text-[var(--color-muted)]" role="status">
          {t('publish.holdBack.loading')}
        </p>
      ) : null}
      {props.isError ? (
        <p className="text-sm text-[var(--color-muted)]">{t('publish.holdBack.loadError')}</p>
      ) : null}
      {!props.isLoading && !props.isError && props.items.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('publish.holdBack.empty')}</p>
      ) : null}
      {props.items.length > 0 ? (
        <ul className="mt-1 grid gap-1">
          {props.items.map((item) => {
            const inputId = `${props.idPrefix}-${item.id}`;
            return (
              <li className="flex items-center gap-2" key={item.id}>
                <input
                  checked={props.selectedIds.includes(item.id)}
                  id={inputId}
                  onChange={() => {
                    props.onToggle(item.id);
                  }}
                  type="checkbox"
                />
                <label htmlFor={inputId}>{item.name}</label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}

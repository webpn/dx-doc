import type { ReactElement } from 'react';

import type { ChangelogEntryRecord, ChangelogEntryType } from '../api';
import { useTranslate } from '../i18n';

const GROUP_ORDER: readonly ChangelogEntryType[] = ['added', 'modified', 'removed'];

/**
 * Renders a generated changelog (REQ-VER-006) grouped by change type — the
 * same records the publish flow previews and the history screens consult.
 * Presentational only: grouping order is fixed, entries render in API order.
 */
export function ChangelogList(props: { entries: readonly ChangelogEntryRecord[] }): ReactElement {
  const { entries } = props;
  const t = useTranslate();

  return (
    <div className="grid gap-4">
      {GROUP_ORDER.map((type) => {
        const group = entries.filter((entry) => entry.type === type);
        if (group.length === 0) return null;
        return (
          <section key={type}>
            <h4 className="text-sm font-semibold text-[var(--color-ink)]">
              {t(`changelog.group.${type}`)}
            </h4>
            <ul className="mt-1 grid gap-1">
              {group.map((entry) => (
                <li className="text-sm text-[var(--color-ink)]" key={`${type}-${entry.entityId}`}>
                  {entry.name}{' '}
                  <span className="text-[var(--color-muted)]">
                    ({t(`changelog.entityType.${entry.entityType}`)})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

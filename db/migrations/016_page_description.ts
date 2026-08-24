import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // A page's short behavioural description (REQ-DOM-001). Markdown, like every
  // other rich-text field (REQ-AUTH-001) — screenshots live inside it as
  // markdown image references to uploaded assets (REQ-AUTH-002), which is why
  // no separate page-to-asset join exists. `free_pages.content` is the same
  // shape and the precedent for it.
  //
  // Nullable with no default: a page that has never been described is
  // meaningfully different from one described as an empty string, and every
  // existing row predates the column.
  await db.schema.alterTable('pages').addColumn('description', 'text').execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

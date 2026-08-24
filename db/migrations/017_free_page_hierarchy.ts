import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // REQ-AUTH-003: "Free pages have their own hierarchy, independent of the
  // Page/Screen hierarchy." `free_pages` had no parent link at all, so the
  // requirement was unimplementable — a free page could only ever be flat.
  //
  // Modelled exactly on `pages.parent_id` (001_create_schema): a nullable
  // self-referencing FK. Nullable is what makes a root page expressible, and it
  // is the same adjacency-list shape the Page/Screen tree already uses, so no
  // new traversal pattern enters the codebase. Independence from the Page tree
  // is structural: this column references `free_pages.id`, never `pages.id`.
  await db.schema
    .alterTable('free_pages')
    .addColumn('parent_id', 'char(36)', (col) => col.references('free_pages.id'))
    .execute();

  // Mirrors idx_pages_parent_id (013_query_path_indexes): every hierarchy read
  // filters on the parent, so the tree query would otherwise scan the table.
  await sql`CREATE INDEX idx_free_pages_parent_id ON free_pages(parent_id)`.execute(db);
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

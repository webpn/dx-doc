import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. flows (REQ-NAV-003)
  await db.schema
    .createTable('flows')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('flows_project_slug_unique', ['project_id', 'slug'])
    .execute();

  // 2. triggers (REQ-NAV-004)
  await db.schema
    .createTable('triggers')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // 3. trigger_trackings join table (0..N trackings per trigger)
  await db.schema
    .createTable('trigger_trackings')
    .addColumn('trigger_id', 'char(36)', (col) => col.references('triggers.id').notNull())
    .addColumn('tracking_id', 'char(36)', (col) => col.references('trackings.id').notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('trigger_trackings_pk', ['trigger_id', 'tracking_id'])
    .execute();

  // 4. flow_nodes (Pages or Triggers participating in a flow)
  await db.schema
    .createTable('flow_nodes')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('flow_id', 'char(36)', (col) => col.references('flows.id').notNull())
    .addColumn('node_type', 'text', (col) => col.notNull()) // 'page' | 'trigger'
    .addColumn('page_id', 'char(36)', (col) => col.references('pages.id'))
    .addColumn('trigger_id', 'char(36)', (col) => col.references('triggers.id'))
    .addColumn('position_x', 'real')
    .addColumn('position_y', 'real')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addCheckConstraint('flow_nodes_type_check', sql`node_type IN ('page', 'trigger')`)
    .execute();

  // 5. flow_edges (directed edges between flow nodes, REQ-NAV-005)
  await db.schema
    .createTable('flow_edges')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('flow_id', 'char(36)', (col) => col.references('flows.id').notNull())
    .addColumn('from_node_id', 'char(36)', (col) => col.references('flow_nodes.id').notNull())
    .addColumn('to_node_id', 'char(36)', (col) => col.references('flow_nodes.id').notNull())
    .addColumn('label', 'text')
    .addColumn('condition_description', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

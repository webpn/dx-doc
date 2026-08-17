import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // company
  await db.schema
    .createTable('company')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // roles
  await db.schema
    .createTable('roles')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('roles_company_name_unique', ['company_id', 'name'])
    .addCheckConstraint(
      'roles_name_check',
      sql`name IN ('admin', 'project_manager', 'editor', 'viewer')`,
    )
    .execute();

  // users
  await db.schema
    .createTable('users')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('role_id', 'char(36)', (col) => col.references('roles.id'))
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('password_hash', 'text')
    .addColumn('name', 'text')
    .addColumn('instance_admin', 'boolean', (col) => col.notNull().defaultTo(sql`FALSE`))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('users_company_email_unique', ['company_id', 'email'])
    .execute();

  // projects
  await db.schema
    .createTable('projects')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('icon', 'text')
    .addColumn('platform', 'text', (col) => col.notNull())
    .addColumn('tag_manager', 'text')
    .addColumn('lifecycle_state', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('integration_settings', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('projects_company_slug_unique', ['company_id', 'slug'])
    .addUniqueConstraint('projects_company_custom_id_unique', ['company_id', 'custom_id'])
    .addCheckConstraint(
      'projects_platform_check',
      sql`platform IN ('web', 'ios', 'android', 'flutter', 'react')`,
    )
    .addCheckConstraint('projects_lifecycle_check', sql`lifecycle_state IN ('active', 'archived')`)
    .execute();

  // project_grouping_labels
  await db.schema
    .createTable('project_grouping_labels')
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('label', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('project_grouping_labels_pk', ['project_id', 'label'])
    .execute();

  // project_grants
  await db.schema
    .createTable('project_grants')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('user_id', 'char(36)', (col) => col.references('users.id').notNull())
    .addColumn('role_id', 'char(36)', (col) => col.references('roles.id').notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('project_grants_project_user_unique', ['project_id', 'user_id'])
    .execute();

  // pages
  await db.schema
    .createTable('pages')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('parent_id', 'char(36)', (col) => col.references('pages.id'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.notNull())
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('pages_project_slug_unique', ['project_id', 'slug'])
    .addUniqueConstraint('pages_project_custom_id_unique', ['project_id', 'custom_id'])
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

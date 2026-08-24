import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PageRecord } from '@project/application/ports/page-repository';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';
import { SqlitePageRepository } from './sqlite-page-repository';

function t(): string {
  return new Date().toISOString();
}

function page(overrides: Partial<PageRecord>): PageRecord {
  return {
    id: 'pg1',
    projectId: 'proj-1',
    parentId: null,
    name: 'Home',
    slug: 'home',
    description: null,
    customId: null,
    createdAt: t(),
    updatedAt: t(),
    ...overrides,
  };
}

describe('SqlitePageRepository (against the real schema)', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqlitePageRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-page-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    await connection.kysely
      .insertInto('company')
      .values({
        id: 'c1',
        name: 'Acme',
        slug: 'acme',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    await connection.kysely
      .insertInto('projects')
      .values({
        id: 'proj-1',
        company_id: 'c1',
        name: 'Web',
        slug: 'web',
        platform: 'web',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    repo = new SqlitePageRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and reads a page back', async () => {
    await repo.createPage(page({}));

    const stored = await repo.getPageById('pg1');
    expect(stored?.name).toBe('Home');
    expect(stored?.slug).toBe('home');
    expect(stored?.parentId).toBeNull();
  });

  it('finds by project + slug', async () => {
    await repo.createPage(page({}));

    expect((await repo.getPageByProjectAndSlug('proj-1', 'home'))?.id).toBe('pg1');
    expect(await repo.getPageByProjectAndSlug('proj-1', 'nope')).toBeNull();
  });

  it('round-trips a markdown description, screenshots included', async () => {
    // REQ-DOM-001's behavioural description, stored as markdown (REQ-AUTH-001)
    // with screenshots as image references (REQ-AUTH-002) rather than a
    // separate page-to-asset relation. Fenced blocks and pipes are the
    // characters most likely to be mangled by a naive column, so they are
    // exactly what this asserts survives.
    const description = [
      '## Behaviour',
      '',
      'Shown after login. ![Home screen](/assets/a1.png)',
      '',
      '```mermaid',
      'graph TD;',
      '  A-->B;',
      '```',
    ].join('\n');

    await repo.createPage(page({ description }));

    expect((await repo.getPageById('pg1'))?.description).toBe(description);
  });

  it('treats an undescribed page as null, not empty string', async () => {
    await repo.createPage(page({}));

    expect((await repo.getPageById('pg1'))?.description).toBeNull();
  });

  it('updates a description without touching the rest of the page', async () => {
    await repo.createPage(page({ description: 'first' }));
    const stored = await repo.getPageById('pg1');
    if (stored === null) throw new Error('page was not stored');

    await repo.updatePage({ ...stored, description: 'second', updatedAt: t() });

    const updated = await repo.getPageById('pg1');
    expect(updated?.description).toBe('second');
    expect(updated?.name).toBe('Home');
    expect(updated?.slug).toBe('home');
  });

  it('finds by custom_id scoped to the project', async () => {
    await repo.createPage(page({ customId: 'legacy:home' }));

    expect((await repo.getPageByCustomId('proj-1', 'legacy:home'))?.id).toBe('pg1');
    expect(await repo.getPageByCustomId('other-project', 'legacy:home')).toBeNull();
  });

  it('updates a page and its parent', async () => {
    await repo.createPage(page({}));
    await repo.createPage(page({ id: 'pg2', name: 'Child', slug: 'child' }));

    const stored = await repo.getPageById('pg1');
    if (stored === null) {
      throw new Error('expected page to exist');
    }
    stored.parentId = 'pg2';
    stored.name = 'Homepage';
    await repo.updatePage(stored);

    const reloaded = await repo.getPageById('pg1');
    expect(reloaded?.name).toBe('Homepage');
    expect(reloaded?.parentId).toBe('pg2');
  });

  describe('deletion (ADR-0025)', () => {
    it('deletes a page with nothing referencing it', async () => {
      await repo.createPage(page({}));

      await repo.deletePage('pg1');

      expect(await repo.getPageById('pg1')).toBeNull();
    });

    it('reports zero blockers for an unreferenced page', async () => {
      await repo.createPage(page({}));

      expect(await repo.getPageDeletionBlockers('pg1')).toEqual({
        childPages: 0,
        trackings: 0,
        flowNodes: 0,
      });
    });

    it('counts a child page as a blocker', async () => {
      await repo.createPage(page({}));
      await repo.createPage(page({ id: 'pg2', parentId: 'pg1', name: 'Child', slug: 'child' }));

      expect((await repo.getPageDeletionBlockers('pg1')).childPages).toBe(1);
    });

    it('counts an attached tracking as a blocker', async () => {
      await repo.createPage(page({}));
      await connection.kysely
        .insertInto('navigation_events')
        .values({
          id: 'nav-1',
          project_id: 'proj-1',
          name: 'page_view',
          created_at: t(),
          updated_at: t(),
        })
        .execute();
      await connection.kysely
        .insertInto('trackings')
        .values({
          id: 'trk-1',
          project_id: 'proj-1',
          page_id: 'pg1',
          navigation_event_id: 'nav-1',
          name: 'View',
          slug: 'view',
          created_at: t(),
          updated_at: t(),
        })
        .execute();

      expect((await repo.getPageDeletionBlockers('pg1')).trackings).toBe(1);
    });

    it('counts a flow node placed on the page as a blocker', async () => {
      await repo.createPage(page({}));
      await connection.kysely
        .insertInto('flows')
        .values({
          id: 'flow-1',
          project_id: 'proj-1',
          name: 'Checkout',
          slug: 'checkout',
          created_at: t(),
          updated_at: t(),
        })
        .execute();
      await connection.kysely
        .insertInto('flow_nodes')
        .values({
          id: 'node-1',
          flow_id: 'flow-1',
          node_type: 'page',
          page_id: 'pg1',
          created_at: t(),
        })
        .execute();

      expect((await repo.getPageDeletionBlockers('pg1')).flowNodes).toBe(1);
    });
  });
});

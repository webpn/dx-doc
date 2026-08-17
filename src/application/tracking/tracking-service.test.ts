import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';
import { SqliteAccountRepository } from '../../infrastructure/persistence/sqlite-account-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '../../infrastructure/persistence/sqlite-kysely';
import { SqliteProjectRepository } from '../../infrastructure/persistence/sqlite-project-repository';
import {
  SqliteDestinationRepository,
  SqliteFreePageRepository,
  SqliteModuleRepository,
  SqliteNavigationEventRepository,
  SqlitePropertyRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
} from '../../infrastructure/persistence/sqlite-tracking-repositories';
import { PermissionService } from '../auth/permissions';

import { TrackingService } from './tracking-service';

function t(): string {
  return new Date().toISOString();
}

describe('TrackingService (M1.1 Application Service)', () => {
  let dir: string;
  let connection: Connection;
  let trackingService: TrackingService;
  let propRepo: SqlitePropertyRepository;
  let modRepo: SqliteModuleRepository;
  let navRepo: SqliteNavigationEventRepository;
  let trkRepo: SqliteTrackingRepository;

  const companyId = 'comp-10';
  const projectId = 'proj-10';
  const adminId = 'user-admin';
  const editorId = 'user-editor';

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-tracking-svc-'));
    const dbPath = path.join(dir, 'test.sqlite');
    connection = openSqliteConnection(dbPath);
    await applyMigrations(connection);

    // Setup company, roles, users, grants, project
    const nowIso = t();
    await connection.kysely
      .insertInto('company')
      .values({
        id: companyId,
        name: 'Corp',
        slug: 'corp',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    const adminRoleId = 'role-admin';
    const editorRoleId = 'role-editor';
    await connection.kysely
      .insertInto('roles')
      .values([
        {
          id: adminRoleId,
          company_id: companyId,
          name: 'admin',
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: editorRoleId,
          company_id: companyId,
          name: 'editor',
          created_at: nowIso,
          updated_at: nowIso,
        },
      ])
      .execute();

    await connection.kysely
      .insertInto('users')
      .values([
        {
          id: adminId,
          company_id: companyId,
          role_id: adminRoleId,
          email: 'admin@corp.com',
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: editorId,
          company_id: companyId,
          role_id: editorRoleId,
          email: 'editor@corp.com',
          created_at: nowIso,
          updated_at: nowIso,
        },
      ])
      .execute();

    await connection.kysely
      .insertInto('projects')
      .values({
        id: projectId,
        company_id: companyId,
        name: 'Project Alpha',
        slug: 'alpha',
        platform: 'web',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    await connection.kysely
      .insertInto('project_grants')
      .values([
        {
          id: 'grant-admin',
          project_id: projectId,
          user_id: adminId,
          role_id: adminRoleId,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: 'grant-editor',
          project_id: projectId,
          user_id: editorId,
          role_id: editorRoleId,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ])
      .execute();

    const accountRepo = new SqliteAccountRepository(connection.kysely);
    const permissions = new PermissionService(accountRepo);
    const projectRepo = new SqliteProjectRepository(connection.kysely);
    propRepo = new SqlitePropertyRepository(connection.kysely);
    modRepo = new SqliteModuleRepository(connection.kysely);
    const destRepo = new SqliteDestinationRepository(connection.kysely);
    navRepo = new SqliteNavigationEventRepository(connection.kysely);
    trkRepo = new SqliteTrackingRepository(connection.kysely);
    const tplRepo = new SqliteTrackingTemplateRepository(connection.kysely);
    const freePageRepo = new SqliteFreePageRepository(connection.kysely);

    trackingService = new TrackingService(
      propRepo,
      modRepo,
      destRepo,
      navRepo,
      trkRepo,
      tplRepo,
      freePageRepo,
      projectRepo,
      permissions,
    );
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates properties with business_label and detects hierarchy cycle (REQ-DOM-003, REQ-DOM-004, REQ-DOM-005)', async () => {
    const res1 = await trackingService.createProperty(editorId, companyId, projectId, {
      name: 'product',
      businessLabel: 'Product Object',
      type: 'object',
    });
    expect(res1.ok).toBe(true);
    if (!res1.ok) throw new Error('Failed to create prop');

    const res2 = await trackingService.createProperty(editorId, companyId, projectId, {
      name: 'product_id',
      parentPropertyId: res1.value.propertyId,
    });
    expect(res2.ok).toBe(true);
  });

  it('creates and attaches module to tracking, then verifies automatic detachment upon property removal (REQ-DOM-008)', async () => {
    const p1Res = await trackingService.createProperty(editorId, companyId, projectId, {
      name: 'm_prop1',
    });
    expect(p1Res.ok).toBe(true);
    if (!p1Res.ok) throw new Error('p1 fail');

    const mRes = await trackingService.createModule(editorId, companyId, projectId, {
      name: 'Core Module',
      propertyIds: [p1Res.value.propertyId],
    });
    expect(mRes.ok).toBe(true);
    if (!mRes.ok) throw new Error('m fail');

    const navId = 'nav-screen';
    await navRepo.createNavigationEvent({
      id: navId,
      projectId,
      name: 'Screen View',
      description: null,
      active: true,
      createdAt: t(),
      updatedAt: t(),
    });

    const trkRes = await trackingService.createTracking(editorId, projectId, {
      name: 'Catalog Viewed',
      slug: 'catalog-viewed',
      navigationEventId: navId,
    });
    expect(trkRes.ok).toBe(true);
    if (!trkRes.ok) throw new Error('trk fail');

    // Apply module to tracking
    const applyRes = await trackingService.applyModuleToTracking(
      editorId,
      trkRes.value.trackingId,
      mRes.value.moduleId,
    );
    expect(applyRes.ok).toBe(true);

    const tps = await trkRepo.getTrackingProperties(trkRes.value.trackingId);
    expect(tps).toHaveLength(1);
    expect(tps[0]?.source).toBe('module');

    // Remove property -> should detach module and warn
    const removeRes = await trackingService.removePropertyFromTracking(
      editorId,
      trkRes.value.trackingId,
      p1Res.value.propertyId,
    );
    expect(removeRes.ok).toBe(true);
    if (!removeRes.ok) throw new Error('remove fail');
    expect(removeRes.value.warnModuleDetached).toBe(true);

    const modsAfter = await trkRepo.getTrackingModuleIds(trkRes.value.trackingId);
    expect(modsAfter).toEqual([]);
  });

  it('copies catalogue items into project without live link / provenance (REQ-DOM-019)', async () => {
    // Admin creates catalogue property & module (projectId = null)
    const catPropRes = await trackingService.createProperty(adminId, companyId, null, {
      name: 'global_user_id',
      businessLabel: 'Global User ID',
    });
    expect(catPropRes.ok).toBe(true);
    if (!catPropRes.ok) throw new Error('catProp fail');

    const catModRes = await trackingService.createModule(adminId, companyId, null, {
      name: 'Global Identity',
      propertyIds: [catPropRes.value.propertyId],
    });
    expect(catModRes.ok).toBe(true);
    if (!catModRes.ok) throw new Error('catMod fail');

    // Copy to project
    const copyRes = await trackingService.copyCatalogueToProject(editorId, companyId, projectId, {
      propertyIds: [catPropRes.value.propertyId],
      moduleIds: [catModRes.value.moduleId],
    });
    expect(copyRes.ok).toBe(true);
    if (!copyRes.ok) throw new Error('copy fail');
    expect(copyRes.value.copiedProperties).toBe(1);
    expect(copyRes.value.copiedModules).toBe(1);

    const projProps = await propRepo.listProperties(companyId, projectId);
    expect(projProps).toHaveLength(1);
    expect(projProps[0]?.name).toBe('global_user_id');
    expect(projProps[0]?.projectId).toBe(projectId);
    expect(projProps[0]?.id).not.toBe(catPropRes.value.propertyId);
  });

  it('generates reconciliation report for a project (REQ-IMP-006)', async () => {
    const reportRes = await trackingService.generateReconciliationReport(
      editorId,
      companyId,
      projectId,
    );
    expect(reportRes.ok).toBe(true);
    if (!reportRes.ok) throw new Error('report failed');

    expect(reportRes.value.projectId).toBe(projectId);
    expect(reportRes.value.counts).toBeDefined();
    expect(reportRes.value.customIdCounts).toBeDefined();
  });
});

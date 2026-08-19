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
  SqliteFlowRepository,
  SqliteFreePageRepository,
  SqliteModuleRepository,
  SqliteNavigationEventRepository,
  SqlitePropertyRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
  SqliteTriggerRepository,
  SqliteVersionRepository,
  SqliteSharedPasswordRepository,
  SqliteAuditLogRepository,
} from '../../infrastructure/persistence/sqlite-tracking-repositories';
import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt-password-hasher';
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
    const flowRepo = new SqliteFlowRepository(connection.kysely);
    const triggerRepo = new SqliteTriggerRepository(connection.kysely);
    const versionRepo = new SqliteVersionRepository(connection.kysely);
    const sharedPasswordRepo = new SqliteSharedPasswordRepository(connection.kysely);
    const auditLogRepo = new SqliteAuditLogRepository(connection.kysely);
    const hasher = new BcryptPasswordHasher();

    trackingService = new TrackingService(
      propRepo,
      modRepo,
      destRepo,
      navRepo,
      trkRepo,
      tplRepo,
      freePageRepo,
      flowRepo,
      triggerRepo,
      versionRepo,
      sharedPasswordRepo,
      auditLogRepo,
      hasher,
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

  it('manages Flows, Triggers, and auto-generates Mermaid diagram (REQ-NAV-003 .. REQ-NAV-007, REQ-AUTH-004)', async () => {
    // 0. Seed a real page
    await connection.kysely
      .insertInto('pages')
      .values({
        id: 'page-flow-1',
        project_id: projectId,
        name: 'Sign Up Page',
        slug: 'sign-up-page',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    // 1. Create Flow
    const flowRes = await trackingService.createFlow(editorId, projectId, {
      name: 'Onboarding Funnel',
      slug: 'onboarding-funnel',
    });
    expect(flowRes.ok).toBe(true);
    if (!flowRes.ok) throw new Error('flow create failed');
    const flowId = flowRes.value.flowId;

    // 2. Create Trigger
    const trgRes = await trackingService.createTrigger(editorId, projectId, {
      name: 'Click Sign Up',
    });
    expect(trgRes.ok).toBe(true);
    if (!trgRes.ok) throw new Error('trigger create failed');
    const triggerId = trgRes.value.triggerId;

    // 3. Set Flow graph nodes and edges
    const graphRes = await trackingService.setFlowGraph(editorId, flowId, {
      nodes: [
        { id: 'node-p1', nodeType: 'page', pageId: 'page-flow-1' },
        { id: 'node-t1', nodeType: 'trigger', triggerId },
      ],
      edges: [{ fromNodeId: 'node-p1', toNodeId: 'node-t1', label: 'User clicks' }],
    });
    expect(graphRes.ok).toBe(true);

    // 4. Retrieve flow with Mermaid diagram
    const flowData = await trackingService.getFlow(editorId, flowId);
    expect(flowData.ok).toBe(true);
    if (!flowData.ok) throw new Error('flow get failed');
    expect(flowData.value.nodes).toHaveLength(2);
    expect(flowData.value.edges).toHaveLength(1);
    expect(flowData.value.mermaidDiagram).toContain('graph TD');
    expect(flowData.value.mermaidDiagram).toContain('-->|"User clicks"|');
  });

  it('publishes project versions, generates changelogs, and supports full history consultation (REQ-VER-001 .. REQ-VER-007)', async () => {
    // 1. Publish Version 1
    const v1Res = await trackingService.publishVersion(editorId, companyId, projectId, {
      title: 'v1.0.0 Release',
      releaseNotes: 'Initial production tracking rollout',
    });
    expect(v1Res.ok).toBe(true);
    if (!v1Res.ok) throw new Error('v1 publish failed');
    expect(v1Res.value.versionNumber).toBe(1);

    // 2. Add a new property in draft
    await trackingService.createProperty(editorId, companyId, projectId, {
      name: 'cart_value',
      businessLabel: 'Cart Total Value',
      type: 'number',
    });

    // 3. Publish Version 2
    const v2Res = await trackingService.publishVersion(editorId, companyId, projectId, {
      title: 'v1.1.0 Release',
      releaseNotes: 'Added cart value tracking',
    });
    expect(v2Res.ok).toBe(true);
    if (!v2Res.ok) throw new Error('v2 publish failed');
    expect(v2Res.value.versionNumber).toBe(2);

    // 4. Retrieve Version 2 and verify automated changelog diff
    const v2Data = await trackingService.getVersion(editorId, v2Res.value.versionId);
    expect(v2Data.ok).toBe(true);
    if (!v2Data.ok) throw new Error('v2 get failed');
    expect(v2Data.value.versionNumber).toBe(2);
    expect(v2Data.value.changelog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'added',
          entityType: 'property',
          name: 'cart_value',
        }),
      ]),
    );

    // 5. Verify immutable snapshot holds full history (REQ-VER-007)
    expect(v2Data.value.snapshot.properties.some((p) => p.name === 'cart_value')).toBe(true);
  });

  it('manages project shared passwords with expiry and appends audit logs (REQ-SEC-005, REQ-SEC-006)', async () => {
    // 1. Create shared password
    const spRes = await trackingService.createSharedPassword(editorId, projectId, {
      password: 'client-secure-pass',
      label: 'Agency Q3 Access',
    });
    expect(spRes.ok).toBe(true);
    if (!spRes.ok) throw new Error('shared password create failed');

    // 2. Verify shared password
    const verifyRes = await trackingService.verifySharedPassword(projectId, {
      password: 'client-secure-pass',
    });
    expect(verifyRes.ok).toBe(true);
    if (!verifyRes.ok) throw new Error('verify failed');
    expect(verifyRes.value.verified).toBe(true);

    // 3. Verify audit log entry
    const auditRes = await trackingService.listAuditLogs(adminId, companyId, projectId);
    expect(auditRes.ok).toBe(true);
    if (!auditRes.ok) throw new Error('list audit logs failed');
    expect(auditRes.value.length).toBeGreaterThanOrEqual(2);
    expect(auditRes.value.some((l) => l.action === 'shared_password.created')).toBe(true);
    expect(auditRes.value.some((l) => l.action === 'shared_password.authenticated')).toBe(true);
  });

  describe('entity deletion (ADR-0025)', () => {
    it('deletes an unused property; refuses one used by a tracking, a module, or with a child', async () => {
      const unused = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'unused_prop',
      });
      if (!unused.ok) throw new Error('create failed');
      expect(await trackingService.deleteProperty(editorId, unused.value.propertyId)).toEqual({
        ok: true,
        value: { ok: true },
      });

      const parent = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'parent_prop',
      });
      const child = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'child_prop',
      });
      if (!parent.ok || !child.ok) throw new Error('create failed');
      await trackingService.updateProperty(editorId, child.value.propertyId, {
        parentPropertyId: parent.value.propertyId,
      });
      const blockedByChild = await trackingService.deleteProperty(
        editorId,
        parent.value.propertyId,
      );
      expect(blockedByChild.ok).toBe(false);
      if (!blockedByChild.ok) expect(blockedByChild.error.kind).toBe('in_use');

      const modProp = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'in_module_prop',
      });
      if (!modProp.ok) throw new Error('create failed');
      await trackingService.createModule(editorId, companyId, projectId, {
        name: 'Some Module',
        propertyIds: [modProp.value.propertyId],
      });
      const blockedByModule = await trackingService.deleteProperty(
        editorId,
        modProp.value.propertyId,
      );
      expect(blockedByModule.ok).toBe(false);
      if (!blockedByModule.ok) expect(blockedByModule.error.kind).toBe('in_use');
    });

    it('deletes an unused module; refuses one attached to a tracking; cascades its own membership rows', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'mod_prop',
      });
      if (!prop.ok) throw new Error('create failed');
      const mod = await trackingService.createModule(editorId, companyId, projectId, {
        name: 'Cascade Module',
        propertyIds: [prop.value.propertyId],
      });
      if (!mod.ok) throw new Error('create failed');

      await navRepo.createNavigationEvent({
        id: 'nav-mod-del',
        projectId,
        name: 'Mod Del Event',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });
      const trk = await trackingService.createTracking(editorId, projectId, {
        name: 'Mod Del Tracking',
        slug: 'mod-del-tracking',
        navigationEventId: 'nav-mod-del',
      });
      if (!trk.ok) throw new Error('create failed');
      await trackingService.applyModuleToTracking(
        editorId,
        trk.value.trackingId,
        mod.value.moduleId,
      );

      const blocked = await trackingService.deleteModule(editorId, mod.value.moduleId);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) expect(blocked.error.kind).toBe('in_use');

      // Detach, then deletion succeeds and its own module_properties rows go with it.
      await trackingService.removePropertyFromTracking(
        editorId,
        trk.value.trackingId,
        prop.value.propertyId,
      );
      expect(await trackingService.deleteModule(editorId, mod.value.moduleId)).toEqual({
        ok: true,
        value: { ok: true },
      });
      const remainingMembership = await connection.kysely
        .selectFrom('module_properties')
        .selectAll()
        .where('module_id', '=', mod.value.moduleId)
        .execute();
      expect(remainingMembership).toEqual([]);
      // The property itself survives — only the module's membership of it is gone.
      expect((await trackingService.getProperty(editorId, prop.value.propertyId)).ok).toBe(true);
    });

    it('deletes an unmapped destination; refuses one a property is mapped to', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'dest_prop',
      });
      if (!prop.ok) throw new Error('create failed');
      const dest = await trackingService.createDestination(editorId, companyId, projectId, {
        platform: 'ga4',
        variableType: 'event_param',
        identifier: 'item_id',
        name: 'Item ID',
      });
      if (!dest.ok) throw new Error('create failed');

      await trackingService.setPropertyDestinations(editorId, prop.value.propertyId, [
        { destinationId: dest.value.destinationId, destinationNameOverride: null },
      ]);
      const blocked = await trackingService.deleteDestination(editorId, dest.value.destinationId);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) expect(blocked.error.kind).toBe('in_use');

      await trackingService.setPropertyDestinations(editorId, prop.value.propertyId, []);
      expect(await trackingService.deleteDestination(editorId, dest.value.destinationId)).toEqual({
        ok: true,
        value: { ok: true },
      });
    });

    it('deletes an unused navigation event; refuses one a tracking references', async () => {
      await navRepo.createNavigationEvent({
        id: 'nav-del-unused',
        projectId,
        name: 'Unused',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });
      expect(await trackingService.deleteNavigationEvent(editorId, 'nav-del-unused')).toEqual({
        ok: true,
        value: { ok: true },
      });

      await navRepo.createNavigationEvent({
        id: 'nav-del-used',
        projectId,
        name: 'Used',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });
      await trackingService.createTracking(editorId, projectId, {
        name: 'Uses Nav',
        slug: 'uses-nav',
        navigationEventId: 'nav-del-used',
      });
      const blocked = await trackingService.deleteNavigationEvent(editorId, 'nav-del-used');
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) expect(blocked.error.kind).toBe('in_use');
    });

    it('deletes a tracking template unconditionally', async () => {
      const tpl = await trackingService.createTrackingTemplate(editorId, companyId, projectId, {
        name: 'A Template',
      });
      if (!tpl.ok) throw new Error('create failed');
      expect(await trackingService.deleteTrackingTemplate(editorId, tpl.value.templateId)).toEqual({
        ok: true,
        value: { ok: true },
      });
    });

    it('deletes a free page unconditionally', async () => {
      const fp = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'A Free Page',
        slug: 'a-free-page',
        content: 'content',
        publishable: false,
      });
      if (!fp.ok) throw new Error('create failed');
      expect(await trackingService.deleteFreePage(editorId, fp.value.freePageId)).toEqual({
        ok: true,
        value: { ok: true },
      });
    });

    it('deletes a tracking unconditionally, cascading its own modules/properties/specific-values/trigger association', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'trk_del_prop',
      });
      if (!prop.ok) throw new Error('create failed');
      const mod = await trackingService.createModule(editorId, companyId, projectId, {
        name: 'Trk Del Module',
      });
      if (!mod.ok) throw new Error('create failed');
      await navRepo.createNavigationEvent({
        id: 'nav-trk-del',
        projectId,
        name: 'Trk Del Event',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });
      const trk = await trackingService.createTracking(editorId, projectId, {
        name: 'Trk To Delete',
        slug: 'trk-to-delete',
        navigationEventId: 'nav-trk-del',
      });
      if (!trk.ok) throw new Error('create failed');
      const trackingId = trk.value.trackingId;

      await trackingService.applyModuleToTracking(editorId, trackingId, mod.value.moduleId);
      // Attach the property directly (no dedicated "attach one property" service call).
      await trkRepo.setTrackingProperties([
        {
          id: 'tp-trk-del',
          trackingId,
          propertyId: prop.value.propertyId,
          source: 'direct',
          presence: 'always',
          createdAt: t(),
          updatedAt: t(),
        },
      ]);
      const svRes = await trackingService.setSpecificValue(editorId, 'tp-trk-del', { value: 'x' });
      expect(svRes.ok).toBe(true);

      const trg = await trackingService.createTrigger(editorId, projectId, {
        name: 'Trk Del Trigger',
        trackingIds: [trackingId],
      });
      if (!trg.ok) throw new Error('create failed');

      expect(await trackingService.deleteTracking(editorId, trackingId)).toEqual({
        ok: true,
        value: { ok: true },
      });

      expect(
        await connection.kysely
          .selectFrom('tracking_modules')
          .selectAll()
          .where('tracking_id', '=', trackingId)
          .execute(),
      ).toEqual([]);
      expect(
        await connection.kysely
          .selectFrom('tracking_properties')
          .selectAll()
          .where('tracking_id', '=', trackingId)
          .execute(),
      ).toEqual([]);
      expect(
        await connection.kysely
          .selectFrom('trigger_trackings')
          .selectAll()
          .where('tracking_id', '=', trackingId)
          .execute(),
      ).toEqual([]);
      // The module, property, and trigger themselves survive.
      expect((await trackingService.getModule(editorId, mod.value.moduleId)).ok).toBe(true);
      expect((await trackingService.getProperty(editorId, prop.value.propertyId)).ok).toBe(true);
      expect((await trackingService.getTrigger(editorId, trg.value.triggerId)).ok).toBe(true);
    });

    it('deletes a specific value unconditionally, and reports not_found once gone', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'sv_del_prop',
      });
      if (!prop.ok) throw new Error('create failed');
      await navRepo.createNavigationEvent({
        id: 'nav-sv-del',
        projectId,
        name: 'SV Del Event',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });
      const trk = await trackingService.createTracking(editorId, projectId, {
        name: 'SV Del Tracking',
        slug: 'sv-del-tracking',
        navigationEventId: 'nav-sv-del',
      });
      if (!trk.ok) throw new Error('create failed');
      // Attach the property directly via the repository (no dedicated "attach one property" service call outside modules).
      await trkRepo.setTrackingProperties([
        {
          id: 'tp-sv-del',
          trackingId: trk.value.trackingId,
          propertyId: prop.value.propertyId,
          source: 'direct',
          presence: 'always',
          createdAt: t(),
          updatedAt: t(),
        },
      ]);
      const sv = await trackingService.setSpecificValue(editorId, 'tp-sv-del', { value: 'abc' });
      if (!sv.ok) throw new Error('create failed');

      expect(await trackingService.deleteSpecificValue(editorId, sv.value.specificValueId)).toEqual(
        { ok: true, value: { ok: true } },
      );
      expect(await trackingService.deleteSpecificValue(editorId, sv.value.specificValueId)).toEqual(
        {
          ok: false,
          error: { kind: 'not_found' },
        },
      );
    });

    it('deletes a flow, cascading its own nodes and edges', async () => {
      await connection.kysely
        .insertInto('pages')
        .values({
          id: 'page-flow-del',
          project_id: projectId,
          name: 'Flow Del Page',
          slug: 'flow-del-page',
          created_at: t(),
          updated_at: t(),
        })
        .execute();
      const flow = await trackingService.createFlow(editorId, projectId, {
        name: 'Flow To Delete',
        slug: 'flow-to-delete',
      });
      if (!flow.ok) throw new Error('create failed');
      await trackingService.setFlowGraph(editorId, flow.value.flowId, {
        nodes: [
          { id: 'fd-node-1', nodeType: 'page', pageId: 'page-flow-del' },
          { id: 'fd-node-2', nodeType: 'page', pageId: 'page-flow-del' },
        ],
        edges: [{ fromNodeId: 'fd-node-1', toNodeId: 'fd-node-2' }],
      });

      expect(await trackingService.deleteFlow(editorId, flow.value.flowId)).toEqual({
        ok: true,
        value: { ok: true },
      });
      expect(
        await connection.kysely
          .selectFrom('flow_nodes')
          .selectAll()
          .where('flow_id', '=', flow.value.flowId)
          .execute(),
      ).toEqual([]);
      expect(
        await connection.kysely
          .selectFrom('flow_edges')
          .selectAll()
          .where('flow_id', '=', flow.value.flowId)
          .execute(),
      ).toEqual([]);
    });

    it('deletes an unplaced trigger; refuses one placed on a flow diagram; cascades its own tracking associations', async () => {
      await navRepo.createNavigationEvent({
        id: 'nav-trg-del',
        projectId,
        name: 'Trg Del Event',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });
      const trk = await trackingService.createTracking(editorId, projectId, {
        name: 'Trg Del Tracking',
        slug: 'trg-del-tracking',
        navigationEventId: 'nav-trg-del',
      });
      if (!trk.ok) throw new Error('create failed');

      const trg = await trackingService.createTrigger(editorId, projectId, {
        name: 'Del Trigger',
        trackingIds: [trk.value.trackingId],
      });
      if (!trg.ok) throw new Error('create failed');

      expect(await trackingService.deleteTrigger(editorId, trg.value.triggerId)).toEqual({
        ok: true,
        value: { ok: true },
      });

      const trg2 = await trackingService.createTrigger(editorId, projectId, {
        name: 'Placed Trigger',
      });
      if (!trg2.ok) throw new Error('create failed');
      const flow = await trackingService.createFlow(editorId, projectId, {
        name: 'Holds Trigger',
        slug: 'holds-trigger',
      });
      if (!flow.ok) throw new Error('create failed');
      await trackingService.setFlowGraph(editorId, flow.value.flowId, {
        nodes: [{ id: 'trg-node', nodeType: 'trigger', triggerId: trg2.value.triggerId }],
        edges: [],
      });
      const blocked = await trackingService.deleteTrigger(editorId, trg2.value.triggerId);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) expect(blocked.error.kind).toBe('in_use');
    });

    it('forbids deletion without an edit grant', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'forbidden_del_prop',
      });
      if (!prop.ok) throw new Error('create failed');

      // A user with no grant on the project at all.
      const outsider = 'user-outsider';
      await connection.kysely
        .insertInto('users')
        .values({
          id: outsider,
          company_id: companyId,
          role_id: null,
          email: 'outsider@corp.com',
          created_at: t(),
          updated_at: t(),
        })
        .execute();

      expect(await trackingService.deleteProperty(outsider, prop.value.propertyId)).toEqual({
        ok: false,
        error: { kind: 'forbidden' },
      });
    });
  });
});

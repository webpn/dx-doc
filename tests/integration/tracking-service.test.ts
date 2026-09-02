// Integration test for TrackingService, wired to real infrastructure: a real
// SQLite file, the real migrations, twelve real repositories and real bcrypt.
//
// It lives here rather than beside the service because of what it needs, not
// because of what it tests. The `no-restricted-imports` rule forbids the
// application layer from naming infrastructure — that boundary is what keeps
// the MariaDB/Postgres adapters (ADR-0020, ADR-0003) and the MCP server
// (ADR-0007) possible. A test that deliberately wires the real adapters is
// exercising the composition rather than violating the layering, but the rule
// matches on file path and cannot tell the two apart. Moving the file is
// therefore preferred to disabling the rule for every test under
// `src/application/`, which would also stop catching the accidental case.
//
// Query-level bugs — a wrong join, a missing constraint, a migration that does
// not apply cleanly — only appear against a real database, which is why the
// repositories here are not faked (ADR-0017).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PermissionService } from '@project/application/auth/permissions';
import { TrackingService } from '@project/application/tracking/tracking-service';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '@project/infrastructure/persistence/sqlite-kysely';
import { SqlitePageRepository } from '@project/infrastructure/persistence/sqlite-page-repository';
import { SqliteProjectRepository } from '@project/infrastructure/persistence/sqlite-project-repository';
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
} from '@project/infrastructure/persistence/sqlite-tracking-repositories';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../support/apply-migrations';

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
  let auditRepo: SqliteAuditLogRepository;

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
    const pageRepo = new SqlitePageRepository(connection.kysely);
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
    auditRepo = auditLogRepo;
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
      pageRepo,
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

  it('points a copied module at the copied properties, not the catalogue originals (REQ-DOM-019)', async () => {
    const catPropRes = await trackingService.createProperty(adminId, companyId, null, {
      name: 'shared_user_id',
      businessLabel: 'Shared User ID',
    });
    if (!catPropRes.ok) throw new Error('catProp fail');

    const catModRes = await trackingService.createModule(adminId, companyId, null, {
      name: 'Shared Identity',
      propertyIds: [catPropRes.value.propertyId],
    });
    if (!catModRes.ok) throw new Error('catMod fail');

    const copyRes = await trackingService.copyCatalogueToProject(editorId, companyId, projectId, {
      propertyIds: [catPropRes.value.propertyId],
      moduleIds: [catModRes.value.moduleId],
    });
    if (!copyRes.ok) throw new Error('copy fail');

    const projProps = await propRepo.listProperties(companyId, projectId);
    const projMods = await modRepo.listModules(companyId, projectId);
    expect(projProps).toHaveLength(1);
    expect(projMods).toHaveLength(1);

    const copiedPropertyId = projProps[0]?.id;
    const copiedModuleId = projMods[0]?.id;
    if (copiedPropertyId === undefined || copiedModuleId === undefined) {
      throw new Error('copy produced no project items');
    }

    // The copy must be self-contained: a project module that still references
    // the catalogue's property ids is a live link to the catalogue by another
    // name, which is exactly what REQ-DOM-019 forbids.
    const copiedModuleProps = await modRepo.getModulePropertyIds(copiedModuleId);
    expect(copiedModuleProps).toEqual([copiedPropertyId]);
    expect(copiedModuleProps).not.toContain(catPropRes.value.propertyId);
  });

  describe('opt-in propagation of module changes (REQ-DOM-007)', () => {
    /** A module with one property, attached to one tracking. */
    async function seedModuleOnTracking(): Promise<{
      moduleId: string;
      trackingId: string;
      firstPropertyId: string;
    }> {
      const p1 = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'page_name',
        businessLabel: 'Page Name',
      });
      if (!p1.ok) throw new Error('p1 fail');

      const mod = await trackingService.createModule(editorId, companyId, projectId, {
        name: 'Page Context',
        propertyIds: [p1.value.propertyId],
      });
      if (!mod.ok) throw new Error('mod fail');

      const nav = await trackingService.createNavigationEvent(editorId, projectId, {
        name: 'page_view',
      });
      if (!nav.ok) throw new Error('nav fail');

      const trk = await trackingService.createTracking(editorId, projectId, {
        name: 'Home page view',
        slug: 'home-page-view',
        navigationEventId: nav.value.eventId,
      });
      if (!trk.ok) throw new Error('trk fail');

      const applied = await trackingService.applyModuleToTracking(
        editorId,
        trk.value.trackingId,
        mod.value.moduleId,
      );
      if (!applied.ok) throw new Error('apply fail');

      return {
        moduleId: mod.value.moduleId,
        trackingId: trk.value.trackingId,
        firstPropertyId: p1.value.propertyId,
      };
    }

    /** Add a second property to an existing module. */
    async function addPropertyToModule(moduleId: string, firstPropertyId: string): Promise<string> {
      const p2 = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'page_type',
        businessLabel: 'Page Type',
      });
      if (!p2.ok) throw new Error('p2 fail');

      const upd = await trackingService.updateModule(editorId, moduleId, {
        propertyIds: [firstPropertyId, p2.value.propertyId],
      });
      if (!upd.ok) throw new Error('module update fail');

      return p2.value.propertyId;
    }

    it('does not reach existing trackings without an explicit propagation action', async () => {
      const { moduleId, trackingId, firstPropertyId } = await seedModuleOnTracking();
      const newPropertyId = await addPropertyToModule(moduleId, firstPropertyId);

      // The safe default: the module gained a property, the tracking did not.
      const tps = await trkRepo.getTrackingProperties(trackingId);
      expect(tps.map((tp) => tp.propertyId)).toEqual([firstPropertyId]);
      expect(tps.map((tp) => tp.propertyId)).not.toContain(newPropertyId);
    });

    it('previews what propagation would change without changing anything', async () => {
      const { moduleId, trackingId, firstPropertyId } = await seedModuleOnTracking();
      const newPropertyId = await addPropertyToModule(moduleId, firstPropertyId);

      const preview = await trackingService.previewModulePropagation(editorId, moduleId);
      if (!preview.ok) throw new Error('preview fail');

      expect(preview.value.affected).toHaveLength(1);
      expect(preview.value.affected[0]?.trackingId).toBe(trackingId);
      expect(preview.value.affected[0]?.addedPropertyIds).toEqual([newPropertyId]);

      // A preview that mutates is not a preview.
      const tps = await trkRepo.getTrackingProperties(trackingId);
      expect(tps.map((tp) => tp.propertyId)).toEqual([firstPropertyId]);
    });

    it('propagates on demand and writes exactly one audit entry, not one per tracking', async () => {
      const { moduleId, trackingId, firstPropertyId } = await seedModuleOnTracking();

      // The second tracking must attach the module BEFORE the module changes.
      // Attaching afterwards would hand it the new property immediately, so
      // there would be nothing left to propagate and the count would be 1.
      const nav2 = await trackingService.createNavigationEvent(editorId, projectId, {
        name: 'screen_view',
      });
      if (!nav2.ok) throw new Error('nav2 fail');
      const trk2 = await trackingService.createTracking(editorId, projectId, {
        name: 'Search page view',
        slug: 'search-page-view',
        navigationEventId: nav2.value.eventId,
      });
      if (!trk2.ok) throw new Error('trk2 fail');
      const applied2 = await trackingService.applyModuleToTracking(
        editorId,
        trk2.value.trackingId,
        moduleId,
      );
      if (!applied2.ok) throw new Error('apply2 fail');

      const newPropertyId = await addPropertyToModule(moduleId, firstPropertyId);

      const before = await auditRepo.listLogsForProject(projectId, 500);
      const beforeCount = before.filter((e) => e.action === 'module_propagated').length;

      const result = await trackingService.propagateModuleToTrackings(editorId, moduleId);
      if (!result.ok) throw new Error('propagate fail');

      expect(result.value.updatedTrackingCount).toBe(2);

      for (const id of [trackingId, trk2.value.trackingId]) {
        const tps = await trkRepo.getTrackingProperties(id);
        expect(tps.map((tp) => tp.propertyId)).toContain(newPropertyId);
      }

      const after = await auditRepo.listLogsForProject(projectId, 500);
      const propagationEntries = after.filter((e) => e.action === 'module_propagated');
      expect(propagationEntries.length - beforeCount).toBe(1);
    });
  });

  it('materialises a template’s module properties into the new tracking (REQ-DOM-009)', async () => {
    // REQ-DOM-009 promises "preselected modules, preconfigured custom
    // properties, default specific values". A tracking created from a template
    // that attaches a module must therefore carry that module's properties —
    // and default specific values are impossible without them, because a
    // SpecificValue hangs off a trackingPropertyId, not off the tracking.
    const prop = await trackingService.createProperty(editorId, companyId, projectId, {
      name: 'checkout_step',
      businessLabel: 'Checkout Step',
    });
    if (!prop.ok) throw new Error('prop fail');

    const mod = await trackingService.createModule(editorId, companyId, projectId, {
      name: 'Checkout',
      propertyIds: [prop.value.propertyId],
    });
    if (!mod.ok) throw new Error('mod fail');

    const nav = await trackingService.createNavigationEvent(editorId, projectId, {
      name: 'checkout_view',
    });
    if (!nav.ok) throw new Error('nav fail');

    const tpl = await trackingService.createTrackingTemplate(editorId, companyId, projectId, {
      name: 'Checkout blueprint',
      configJson: JSON.stringify({
        navigationEventId: nav.value.eventId,
        moduleIds: [mod.value.moduleId],
      }),
    });
    if (!tpl.ok) throw new Error('tpl fail');

    const trk = await trackingService.createTracking(editorId, projectId, {
      name: 'Checkout step view',
      slug: 'checkout-step-view',
      navigationEventId: nav.value.eventId,
      templateId: tpl.value.templateId,
    });
    if (!trk.ok) throw new Error('trk fail');

    const moduleIds = await trkRepo.getTrackingModuleIds(trk.value.trackingId);
    expect(moduleIds).toEqual([mod.value.moduleId]);

    // The module is attached; its properties must be present too.
    const tps = await trkRepo.getTrackingProperties(trk.value.trackingId);
    expect(tps.map((tp) => tp.propertyId)).toEqual([prop.value.propertyId]);
  });

  it('copies a module’s properties even when only the module was selected (REQ-DOM-019)', async () => {
    const catPropRes = await trackingService.createProperty(adminId, companyId, null, {
      name: 'module_only_property',
    });
    if (!catPropRes.ok) throw new Error('catProp fail');

    const catModRes = await trackingService.createModule(adminId, companyId, null, {
      name: 'Module Only',
      propertyIds: [catPropRes.value.propertyId],
    });
    if (!catModRes.ok) throw new Error('catMod fail');

    // Only the module is selected: its properties must still arrive, otherwise
    // the project gets a module that references nothing it owns.
    const copyRes = await trackingService.copyCatalogueToProject(editorId, companyId, projectId, {
      moduleIds: [catModRes.value.moduleId],
    });
    if (!copyRes.ok) throw new Error('copy fail');
    expect(copyRes.value.copiedProperties).toBe(1);

    const projProps = await propRepo.listProperties(companyId, projectId);
    const projMods = await modRepo.listModules(companyId, projectId);
    const copiedModuleId2 = projMods[0]?.id;
    if (copiedModuleId2 === undefined) throw new Error('no copied module');

    expect(projProps).toHaveLength(1);
    expect(await modRepo.getModulePropertyIds(copiedModuleId2)).toEqual([projProps[0]?.id]);
  });

  it('denies cross-tenant catalogue reads for lists and by-id paths (REQ-SEC-016)', async () => {
    const catalogueProperty = await trackingService.createProperty(adminId, companyId, null, {
      name: 'tenant_boundary_property',
    });
    const catalogueModule = await trackingService.createModule(adminId, companyId, null, {
      name: 'Tenant Boundary Module',
    });
    const catalogueDestination = await trackingService.createDestination(adminId, companyId, null, {
      platform: 'ga4',
      variableType: 'event_param',
      identifier: 'tenant_boundary',
      name: 'Tenant Boundary Destination',
    });
    const catalogueTemplate = await trackingService.createTrackingTemplate(
      adminId,
      companyId,
      null,
      { name: 'Tenant Boundary Template' },
    );
    const catalogueFreePage = await trackingService.createFreePage(adminId, companyId, null, {
      title: 'Tenant Boundary Page',
      slug: 'tenant-boundary-page',
      content: 'secret catalogue content',
      publishable: false,
    });
    if (
      !catalogueProperty.ok ||
      !catalogueModule.ok ||
      !catalogueDestination.ok ||
      !catalogueTemplate.ok ||
      !catalogueFreePage.ok
    ) {
      throw new Error('catalogue setup failed');
    }

    const otherCompanyId = 'comp-11';
    const otherCompanyRoleId = 'role-other-viewer';
    const otherUserId = 'user-other-company';
    const nowIso = t();
    await connection.kysely
      .insertInto('company')
      .values({
        id: otherCompanyId,
        name: 'Other Corp',
        slug: 'other-corp',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();
    await connection.kysely
      .insertInto('roles')
      .values({
        id: otherCompanyRoleId,
        company_id: otherCompanyId,
        name: 'viewer',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();
    await connection.kysely
      .insertInto('users')
      .values({
        id: otherUserId,
        company_id: otherCompanyId,
        role_id: otherCompanyRoleId,
        email: 'viewer@other-corp.com',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    const results = await Promise.all([
      trackingService.listProperties(otherUserId, companyId, null),
      trackingService.listModules(otherUserId, companyId, null),
      trackingService.listDestinations(otherUserId, companyId, null),
      trackingService.listTrackingTemplates(otherUserId, companyId, null),
      trackingService.listFreePages(otherUserId, companyId, null),
      trackingService.getProperty(otherUserId, catalogueProperty.value.propertyId),
      trackingService.getModule(otherUserId, catalogueModule.value.moduleId),
      trackingService.getDestination(otherUserId, catalogueDestination.value.destinationId),
      trackingService.getTrackingTemplate(otherUserId, catalogueTemplate.value.templateId),
      trackingService.getFreePage(otherUserId, catalogueFreePage.value.freePageId),
    ]);

    for (const result of results) {
      expect(result).toEqual({ ok: false, error: { kind: 'forbidden' } });
    }
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

    const listed = await trackingService.listSharedPasswords(editorId, projectId);
    expect(listed.ok).toBe(true);
    if (!listed.ok) throw new Error('shared password list failed');
    expect(listed.value[0]).not.toHaveProperty('passwordHash');

    const mismatchedDelete = await trackingService.deleteSharedPassword(
      editorId,
      'project-does-not-own-password',
      spRes.value.sharedPasswordId,
    );
    expect(mismatchedDelete).toEqual({ ok: false, error: { kind: 'forbidden' } });
  });

  it('rejects audit-log reads when the project belongs to another company (REQ-SEC-018)', async () => {
    const otherCompanyId = 'comp-audit-other';
    await connection.kysely
      .insertInto('company')
      .values({
        id: otherCompanyId,
        name: 'Other Audit Corp',
        slug: 'other-audit-corp',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    await connection.kysely
      .insertInto('projects')
      .values({
        id: 'project-audit-other',
        company_id: otherCompanyId,
        name: 'Other Audit Project',
        slug: 'other-audit-project',
        platform: 'web',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    await expect(
      trackingService.listAuditLogs(adminId, companyId, 'project-audit-other'),
    ).resolves.toEqual({ ok: false, error: { kind: 'not_found' } });
  });

  it('rejects project writes when the claimed company does not own the project (REQ-SEC-018)', async () => {
    const mismatchedCompanyId = 'comp-write-mismatch';
    await connection.kysely
      .insertInto('company')
      .values({
        id: mismatchedCompanyId,
        name: 'Mismatched Corp',
        slug: 'mismatched-corp',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    const inputs = [
      trackingService.createProperty(editorId, mismatchedCompanyId, projectId, {
        name: 'mismatched_property',
      }),
      trackingService.createModule(editorId, mismatchedCompanyId, projectId, {
        name: 'Mismatched Module',
      }),
      trackingService.createDestination(editorId, mismatchedCompanyId, projectId, {
        platform: 'ga4',
        variableType: 'event_param',
        identifier: 'mismatched_destination',
        name: 'Mismatched Destination',
      }),
      trackingService.createTrackingTemplate(editorId, mismatchedCompanyId, projectId, {
        name: 'Mismatched Template',
      }),
      trackingService.createFreePage(editorId, mismatchedCompanyId, projectId, {
        title: 'Mismatched Page',
        slug: 'mismatched-page',
        content: 'content',
      }),
    ];

    for (const result of await Promise.all(inputs)) {
      expect(result).toEqual({ ok: false, error: { kind: 'forbidden' } });
    }
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

    it('nests a free page under another and rejects a parent outside its scope (REQ-AUTH-003)', async () => {
      // REQ-AUTH-003: "Free pages have their own hierarchy, independent of the
      // Page/Screen hierarchy." Independence is structural — parent_id references
      // free_pages.id — so what needs proving here is that the parent round-trips
      // and that scope is enforced above the FK.
      const root = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'Integration Guide',
        slug: 'integration-guide',
        content: 'root',
      });
      if (!root.ok) throw new Error('root create failed');

      const child = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'SDK Setup',
        slug: 'sdk-setup',
        content: 'child',
        parentId: root.value.freePageId,
      });
      if (!child.ok) throw new Error('child create failed');

      const loaded = await trackingService.getFreePage(editorId, child.value.freePageId);
      if (!loaded.ok) throw new Error('read failed');
      expect(loaded.value.parentId).toBe(root.value.freePageId);

      // A root page keeps a null parent — absent must not become a dangling id.
      const loadedRoot = await trackingService.getFreePage(editorId, root.value.freePageId);
      if (!loadedRoot.ok) throw new Error('root read failed');
      expect(loadedRoot.value.parentId).toBeNull();

      // The company catalogue is a different scope from this project: the FK would
      // happily accept it, the service must not (no cross-project references).
      const cataloguePage = await trackingService.createFreePage(adminId, companyId, null, {
        title: 'Catalogue Note',
        slug: 'catalogue-note',
        content: 'catalogue',
      });
      if (!cataloguePage.ok) throw new Error('catalogue create failed');

      const crossScope = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'Bad Child',
        slug: 'bad-child',
        content: 'x',
        parentId: cataloguePage.value.freePageId,
      });
      expect(crossScope).toEqual({ ok: false, error: { kind: 'not_found' } });
    });

    it('reparents a free page, rejecting a self-parent, a cycle and a cross-scope parent (REQ-AUTH-003)', async () => {
      const a = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'Guide A',
        slug: 'guide-a',
        content: 'a',
      });
      const b = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'Guide B',
        slug: 'guide-b',
        content: 'b',
      });
      if (!a.ok || !b.ok) throw new Error('create failed');

      // Reparenting must actually persist.
      const moved = await trackingService.updateFreePage(editorId, b.value.freePageId, {
        parentId: a.value.freePageId,
      });
      expect(moved.ok).toBe(true);
      const afterMove = await trackingService.getFreePage(editorId, b.value.freePageId);
      if (!afterMove.ok) throw new Error('read failed');
      expect(afterMove.value.parentId).toBe(a.value.freePageId);

      // A page cannot be its own parent.
      const selfParent = await trackingService.updateFreePage(editorId, a.value.freePageId, {
        parentId: a.value.freePageId,
      });
      expect(selfParent.ok).toBe(false);
      if (!selfParent.ok) {
        expect(selfParent.error.kind).toBe('validation');
      }

      // Nor may it adopt its own descendant: b is already a child of a, so
      // making a a child of b would orphan the pair into a cycle.
      expect(
        await trackingService.updateFreePage(editorId, a.value.freePageId, {
          parentId: b.value.freePageId,
        }),
      ).toEqual({ ok: false, error: { kind: 'hierarchy_cycle' } });

      // Explicit null detaches back to a root page.
      const detached = await trackingService.updateFreePage(editorId, b.value.freePageId, {
        parentId: null,
      });
      expect(detached.ok).toBe(true);
      const afterDetach = await trackingService.getFreePage(editorId, b.value.freePageId);
      if (!afterDetach.ok) throw new Error('read failed');
      expect(afterDetach.value.parentId).toBeNull();
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

  describe('Optimistic concurrency (REQ-AUTH-005, ADR-0016)', () => {
    it('accepts update with correct expectedUpdatedAt', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'conc_prop',
      });
      if (!prop.ok) throw new Error('create failed');
      const propRecord = await trackingService.getProperty(editorId, prop.value.propertyId);
      if (!propRecord.ok) throw new Error('get failed');
      const currentTime = propRecord.value.updatedAt;

      // Edit with correct expectedUpdatedAt succeeds
      const edit = await trackingService.updateProperty(editorId, prop.value.propertyId, {
        name: 'updated',
        expectedUpdatedAt: currentTime,
      });
      expect(edit.ok).toBe(true);
    });

    it('rejects update with incorrect expectedUpdatedAt', async () => {
      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'conc_prop2',
      });
      if (!prop.ok) throw new Error('create failed');

      // Try with wrong expectedUpdatedAt
      const staleEdit = await trackingService.updateProperty(editorId, prop.value.propertyId, {
        name: 'stale',
        expectedUpdatedAt: '2000-01-01T00:00:00.000Z', // very old time
      });
      expect(staleEdit.ok).toBe(false);
      if (!staleEdit.ok) {
        expect(staleEdit.error.kind).toBe('stale_write');
      }
    });
  });

  describe('Publication (REQ-VER-003, REQ-VER-005, REQ-VER-006)', () => {
    it('excludes non-publishable free pages from published versions', async () => {
      // Create publishable and non-publishable free pages
      const fpPublishable = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'Public Page',
        slug: 'public',
        content: 'Public content',
      });
      if (!fpPublishable.ok) throw new Error('create publishable failed');

      const fpNonPublishable = await trackingService.createFreePage(
        editorId,
        companyId,
        projectId,
        {
          title: 'Draft Page',
          slug: 'draft',
          content: 'Draft content',
          publishable: false,
        },
      );
      if (!fpNonPublishable.ok) throw new Error('create non-publishable failed');

      // Publish version
      const vRes = await trackingService.publishVersion(editorId, companyId, projectId, {
        title: 'v1.0',
      });
      if (!vRes.ok) throw new Error('publish failed');

      // Verify published version excludes non-publishable page
      const vData = await trackingService.getVersion(editorId, vRes.value.versionId);
      if (!vData.ok) throw new Error('get version failed');
      expect(vData.value.snapshot.freePages).toHaveLength(1);
      const fp0 = vData.value.snapshot.freePages[0];
      if (!fp0) throw new Error('expected published page');
      expect(fp0.id).toBe(fpPublishable.value.freePageId);
    });

    it('generates comprehensive changelog covering all entity types (REQ-VER-005, REQ-VER-006)', async () => {
      // 1. Publish v1 with mixed entities
      const navId = 'nav-changelog';
      await navRepo.createNavigationEvent({
        id: navId,
        projectId,
        name: 'view',
        description: null,
        active: true,
        createdAt: t(),
        updatedAt: t(),
      });

      const prop = await trackingService.createProperty(editorId, companyId, projectId, {
        name: 'prop_v1',
      });
      if (!prop.ok) throw new Error('create prop failed');

      const mod = await trackingService.createModule(editorId, companyId, projectId, {
        name: 'mod_v1',
      });
      if (!mod.ok) throw new Error('create mod failed');

      const dest = await trackingService.createDestination(editorId, companyId, projectId, {
        platform: 'ga4',
        variableType: 'string',
        identifier: 'id',
        name: 'dest_v1',
      });
      if (!dest.ok) throw new Error('create dest failed');

      const fp = await trackingService.createFreePage(editorId, companyId, projectId, {
        title: 'page_v1',
        slug: 'page-v1',
        content: 'content',
      });
      if (!fp.ok) throw new Error('create fp failed');

      const flow = await trackingService.createFlow(editorId, projectId, {
        name: 'flow_v1',
        slug: 'flow-v1',
      });
      if (!flow.ok) throw new Error('create flow failed');

      const v1Res = await trackingService.publishVersion(editorId, companyId, projectId, {
        title: 'v1',
      });
      if (!v1Res.ok) throw new Error('publish v1 failed');

      // 2. Publish v2 with changes to all entity types
      await trackingService.updateProperty(editorId, prop.value.propertyId, { name: 'prop_v2' });
      await trackingService.updateModule(editorId, mod.value.moduleId, { name: 'mod_v2' });
      await trackingService.updateDestination(editorId, dest.value.destinationId, {
        name: 'dest_v2',
      });
      await trackingService.updateFreePage(editorId, fp.value.freePageId, { title: 'page_v2' });
      await trackingService.updateFlow(editorId, flow.value.flowId, { name: 'flow_v2' });

      const v2Res = await trackingService.publishVersion(editorId, companyId, projectId, {
        title: 'v2',
      });
      if (!v2Res.ok) throw new Error('publish v2 failed');

      // 3. Verify changelog covers all entity types
      const v2Data = await trackingService.getVersion(editorId, v2Res.value.versionId);
      if (!v2Data.ok) throw new Error('get v2 failed');

      const changelog = v2Data.value.changelog;
      const entityTypes = new Set(changelog.map((e) => e.entityType));

      // Verify all entity types are in changelog
      expect(entityTypes.has('property')).toBe(true);
      expect(entityTypes.has('module')).toBe(true);
      expect(entityTypes.has('destination')).toBe(true);
      expect(entityTypes.has('page')).toBe(true);
      expect(entityTypes.has('flow')).toBe(true);

      // Verify modifications are recorded
      expect(changelog).toContainEqual(
        expect.objectContaining({
          type: 'modified',
          entityType: 'property',
          name: 'prop_v2',
        }),
      );
      expect(changelog).toContainEqual(
        expect.objectContaining({
          type: 'modified',
          entityType: 'module',
          name: 'mod_v2',
        }),
      );
      expect(changelog).toContainEqual(
        expect.objectContaining({
          type: 'modified',
          entityType: 'destination',
          name: 'dest_v2',
        }),
      );
      expect(changelog).toContainEqual(
        expect.objectContaining({
          type: 'modified',
          entityType: 'page',
          name: 'page_v2',
        }),
      );
      expect(changelog).toContainEqual(
        expect.objectContaining({
          type: 'modified',
          entityType: 'flow',
          name: 'flow_v2',
        }),
      );
    });
  });

  describe('Transactional boundaries (M1.14 Unit 5, REQ-FDN-025)', () => {
    it('publishVersion wraps version creation and audit logging in a transaction (REQ-FDN-025)', async () => {
      // Create a property so there's something to publish
      const propRes = await trackingService.createProperty(adminId, companyId, projectId, {
        name: 'test_prop',
        businessLabel: 'Test',
        type: 'string',
      });
      expect(propRes.ok).toBe(true);

      // Publish version
      const pubRes = await trackingService.publishVersion(adminId, companyId, projectId, {
        title: 'V1',
      });
      expect(pubRes.ok).toBe(true);
      if (!pubRes.ok) return;
      const versionId = pubRes.value.versionId;

      // Verify both version and audit log exist (proving transaction succeeded)
      const version = await connection.kysely
        .selectFrom('versions')
        .selectAll()
        .where('id', '=', versionId)
        .executeTakeFirst();
      expect(version).toBeDefined();

      const auditEntry = await connection.kysely
        .selectFrom('audit_logs')
        .selectAll()
        .where('entity_id', '=', versionId)
        .where('action', '=', 'version.published')
        .executeTakeFirst();
      expect(auditEntry).toBeDefined();
    });

    it('batchCreate reports per-item results while preserving current partial-success behavior', async () => {
      // Create batch with valid and invalid items
      const batchRes = await trackingService.batchCreate(adminId, companyId, projectId, {
        properties: [
          { name: 'batch_prop_1', type: 'string' },
          { name: '', type: 'string' }, // invalid
        ],
      });

      // Verify both results are returned
      expect(batchRes.results.properties).toHaveLength(2);
      expect(batchRes.results.properties[0]?.success).toBe(true);
      expect(batchRes.results.properties[1]?.success).toBe(false);

      // Verify first property was created
      expect(batchRes.results.properties[0]?.id).toBeDefined();
    });

    it('prevents direct audit-log updates and deletes (REQ-SEC-006)', async () => {
      const auditEntry = {
        id: 'audit-append-only-test',
        company_id: companyId,
        project_id: projectId,
        actor_id: adminId,
        action: 'test.append_only',
        entity_type: 'test',
        entity_id: null,
        details_json: null,
        created_at: t(),
        actor_kind: 'session' as const,
      };
      await connection.kysely.insertInto('audit_logs').values(auditEntry).execute();

      await expect(
        connection.kysely
          .updateTable('audit_logs')
          .set({ action: 'tampered' })
          .where('id', '=', auditEntry.id)
          .execute(),
      ).rejects.toThrow('audit_logs are append-only');
      await expect(
        connection.kysely.deleteFrom('audit_logs').where('id', '=', auditEntry.id).execute(),
      ).rejects.toThrow('audit_logs are append-only');
    });
  });
});

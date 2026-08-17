import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';
import {
  SqliteDestinationRepository,
  SqliteFreePageRepository,
  SqliteModuleRepository,
  SqliteNavigationEventRepository,
  SqlitePropertyRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
} from './sqlite-tracking-repositories';

function t(): string {
  return new Date().toISOString();
}

describe('SQLite Tracking Repositories (M1.1 Persistence)', () => {
  let dir: string;
  let connection: Connection;
  let propRepo: SqlitePropertyRepository;
  let modRepo: SqliteModuleRepository;
  let destRepo: SqliteDestinationRepository;
  let navRepo: SqliteNavigationEventRepository;
  let trkRepo: SqliteTrackingRepository;
  let tplRepo: SqliteTrackingTemplateRepository;
  let freePageRepo: SqliteFreePageRepository;

  const companyId = 'comp-100';
  const projectId = 'proj-100';

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-tracking-repos-'));
    const dbPath = path.join(dir, 'test.sqlite');
    connection = openSqliteConnection(dbPath);
    await applyMigrations(connection);

    // Seed company & project
    await connection.kysely
      .insertInto('company')
      .values({
        id: companyId,
        name: 'Acme Corp',
        slug: 'acme-corp',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    await connection.kysely
      .insertInto('projects')
      .values({
        id: projectId,
        company_id: companyId,
        name: 'Web App',
        slug: 'web-app',
        platform: 'web',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    propRepo = new SqlitePropertyRepository(connection.kysely);
    modRepo = new SqliteModuleRepository(connection.kysely);
    destRepo = new SqliteDestinationRepository(connection.kysely);
    navRepo = new SqliteNavigationEventRepository(connection.kysely);
    trkRepo = new SqliteTrackingRepository(connection.kysely);
    tplRepo = new SqliteTrackingTemplateRepository(connection.kysely);
    freePageRepo = new SqliteFreePageRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates, retrieves, and updates DataLayerProperty with full attribute set (REQ-DOM-003, REQ-DOM-004)', async () => {
    const propId = 'prop-1';
    await propRepo.createProperty({
      id: propId,
      companyId,
      projectId,
      name: 'page_type',
      businessLabel: 'Page Type',
      description: 'Categorization of page',
      dataSource: 'development',
      type: 'string',
      formatPattern: null,
      allowedValues: ['home', 'checkout'],
      exampleValues: ['home'],
      piiFlag: false,
      hashingPolicy: null,
      status: 'active',
      introducedInVersion: null,
      analysisNotes: 'Looker dimension',
      aepFieldGroup: 'webDetails',
      parentPropertyId: null,
      derivedFrom: null,
      customId: 'custom-p1',
      createdAt: t(),
      updatedAt: t(),
    });

    const retrieved = await propRepo.getPropertyById(propId);
    expect(retrieved).not.toBeNull();
    if (!retrieved) throw new Error('Expected retrieved to exist');
    expect(retrieved.name).toBe('page_type');
    expect(retrieved.businessLabel).toBe('Page Type');
    expect(retrieved.allowedValues).toEqual(['home', 'checkout']);

    const byCustomId = await propRepo.getPropertyByCustomId(companyId, projectId, 'custom-p1');
    expect(byCustomId?.id).toBe(propId);

    // Update
    await propRepo.updateProperty({
      ...retrieved,
      businessLabel: 'Updated Label',
      status: 'deprecated',
    });

    const updated = await propRepo.getPropertyById(propId);
    expect(updated?.businessLabel).toBe('Updated Label');
    expect(updated?.status).toBe('deprecated');
  });

  it('manages Modules and module properties (REQ-DOM-006)', async () => {
    const modId = 'mod-1';
    await modRepo.createModule({
      id: modId,
      companyId,
      projectId,
      name: 'E-commerce Core',
      description: 'Standard props',
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    await propRepo.createProperty({
      id: 'prop-e1',
      companyId,
      projectId,
      name: 'cart_id',
      businessLabel: null,
      description: null,
      dataSource: 'development',
      type: 'string',
      formatPattern: null,
      allowedValues: null,
      exampleValues: null,
      piiFlag: false,
      hashingPolicy: null,
      status: 'active',
      introducedInVersion: null,
      analysisNotes: null,
      aepFieldGroup: null,
      parentPropertyId: null,
      derivedFrom: null,
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    await modRepo.setModuleProperties(modId, ['prop-e1'], t());
    const propIds = await modRepo.getModulePropertyIds(modId);
    expect(propIds).toEqual(['prop-e1']);
  });

  it('manages Destinations and property destination overrides (REQ-DOM-015, REQ-DOM-016)', async () => {
    const propId = 'prop-dest-1';
    await propRepo.createProperty({
      id: propId,
      companyId,
      projectId,
      name: 'dest_test_prop',
      businessLabel: null,
      description: null,
      dataSource: 'development',
      type: 'string',
      formatPattern: null,
      allowedValues: null,
      exampleValues: null,
      piiFlag: false,
      hashingPolicy: null,
      status: 'active',
      introducedInVersion: null,
      analysisNotes: null,
      aepFieldGroup: null,
      parentPropertyId: null,
      derivedFrom: null,
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    const destId = 'dest-ga4';
    await destRepo.createDestination({
      id: destId,
      companyId,
      projectId,
      platform: 'GA4',
      variableType: 'custom_dimension',
      identifier: 'ep.page_type',
      name: 'Page Type Dimension',
      reconciliationIdentifier: null,
      notes: null,
      platformAttributes: { scope: 'event' },
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    await destRepo.setPropertyDestinations(
      propId,
      [
        {
          destinationId: destId,
          destinationNameOverride: 'ga4_override_name',
        },
      ],
      t(),
    );

    const mappings = await destRepo.getPropertyDestinations(propId);
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.destinationNameOverride).toBe('ga4_override_name');
  });

  it('persists Tracking, TrackingProperties, and SpecificValues (REQ-DOM-002, REQ-DOM-027, REQ-DOM-010)', async () => {
    const propId = 'prop-trk-1';
    await propRepo.createProperty({
      id: propId,
      companyId,
      projectId,
      name: 'trk_test_prop',
      businessLabel: null,
      description: null,
      dataSource: 'development',
      type: 'string',
      formatPattern: null,
      allowedValues: null,
      exampleValues: null,
      piiFlag: false,
      hashingPolicy: null,
      status: 'active',
      introducedInVersion: null,
      analysisNotes: null,
      aepFieldGroup: null,
      parentPropertyId: null,
      derivedFrom: null,
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    const navId = 'nav-1';
    await navRepo.createNavigationEvent({
      id: navId,
      projectId,
      name: 'Screen View',
      description: null,
      active: true,
      createdAt: t(),
      updatedAt: t(),
    });

    const trackingId = 'trk-1';
    await trkRepo.createTracking({
      id: trackingId,
      projectId,
      pageId: null,
      navigationEventId: navId,
      name: 'Home Loaded',
      slug: 'home-loaded',
      description: 'When homepage renders',
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    const tpId = 'tp-1';
    await trkRepo.setTrackingProperties([
      {
        id: tpId,
        trackingId,
        propertyId: propId,
        source: 'direct',
        presence: 'always',
        createdAt: t(),
        updatedAt: t(),
      },
    ]);

    const retrievedTps = await trkRepo.getTrackingProperties(trackingId);
    expect(retrievedTps).toHaveLength(1);
    expect(retrievedTps[0]?.presence).toBe('always');

    await trkRepo.setSpecificValues([
      {
        id: 'sv-1',
        trackingPropertyId: tpId,
        value: 'home_[country]',
        description: 'Country parameter in brackets',
        createdAt: t(),
        updatedAt: t(),
      },
    ]);

    const specificValues = await trkRepo.getSpecificValuesForTracking(trackingId);
    expect(specificValues).toHaveLength(1);
    expect(specificValues[0]?.value).toBe('home_[country]');
  });

  it('manages TrackingTemplates and FreePages (REQ-DOM-009, REQ-DOM-001)', async () => {
    const tplId = 'tpl-1';
    await tplRepo.createTemplate({
      id: tplId,
      companyId,
      projectId,
      name: 'Standard Screen View',
      description: 'Template for screens',
      navigationEventId: null,
      configJson: JSON.stringify({ sample: true }),
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    const tpl = await tplRepo.getTemplateById(tplId);
    expect(tpl?.name).toBe('Standard Screen View');

    const fpId = 'fp-1';
    await freePageRepo.createFreePage({
      id: fpId,
      companyId,
      projectId,
      title: 'Architecture Overview',
      slug: 'arch-overview',
      content: '# Architecture',
      publishable: true,
      customId: null,
      createdAt: t(),
      updatedAt: t(),
    });

    const fp = await freePageRepo.getFreePageById(fpId);
    expect(fp?.title).toBe('Architecture Overview');
    expect(fp?.publishable).toBe(true);
  });
});

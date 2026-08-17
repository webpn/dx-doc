import { describe, expect, it } from 'vitest';

import {
  applyModuleToTracking,
  detectPropertyHierarchyCycle,
  removePropertyFromTracking,
  type TrackingCompositionState,
} from './composition';

describe('Domain Tracking Composition Rules (REQ-DOM-008, REQ-DOM-004)', () => {
  const now = '2026-08-17T20:00:00.000Z';
  let nextId = 100;
  const idGen = (): string => `id-${String(nextId++)}`;

  it('removes a property and keeps module if other module properties remain (REQ-DOM-008)', () => {
    const state: TrackingCompositionState = {
      trackingId: 'trk-1',
      appliedModuleIds: ['mod-1'],
      trackingProperties: [
        {
          id: 'tp-1',
          trackingId: 'trk-1',
          propertyId: 'p-1',
          source: 'module',
          presence: 'always',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'tp-2',
          trackingId: 'trk-1',
          propertyId: 'p-2',
          source: 'module',
          presence: 'always',
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    const modulePropMap = new Map<string, string[]>([['mod-1', ['p-1', 'p-2']]]);

    const result = removePropertyFromTracking(state, 'p-1', modulePropMap);

    expect(result.updatedTrackingProperties).toHaveLength(1);
    expect(result.updatedTrackingProperties[0]?.propertyId).toBe('p-2');
    expect(result.updatedAppliedModuleIds).toEqual(['mod-1']);
    expect(result.detachedModuleIds).toEqual([]);
    expect(result.warnModuleDetached).toBe(false);
  });

  it('detaches module automatically and warns when last module property is removed (REQ-DOM-008)', () => {
    const state: TrackingCompositionState = {
      trackingId: 'trk-1',
      appliedModuleIds: ['mod-1'],
      trackingProperties: [
        {
          id: 'tp-1',
          trackingId: 'trk-1',
          propertyId: 'p-1',
          source: 'module',
          presence: 'always',
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    const modulePropMap = new Map<string, string[]>([['mod-1', ['p-1', 'p-2']]]);

    const result = removePropertyFromTracking(state, 'p-1', modulePropMap);

    expect(result.updatedTrackingProperties).toHaveLength(0);
    expect(result.updatedAppliedModuleIds).toEqual([]);
    expect(result.detachedModuleIds).toEqual(['mod-1']);
    expect(result.warnModuleDetached).toBe(true);
  });

  it('restores module properties on re-apply without duplicating existing direct properties', () => {
    const state: TrackingCompositionState = {
      trackingId: 'trk-1',
      appliedModuleIds: [],
      trackingProperties: [
        {
          id: 'tp-1',
          trackingId: 'trk-1',
          propertyId: 'p-1',
          source: 'direct',
          presence: 'sometimes',
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    const nextState = applyModuleToTracking(state, 'mod-1', ['p-1', 'p-2'], idGen, now);

    expect(nextState.appliedModuleIds).toEqual(['mod-1']);
    expect(nextState.trackingProperties).toHaveLength(2);
    // p-1 should remain as direct / sometimes
    const p1 = nextState.trackingProperties.find((tp) => tp.propertyId === 'p-1');
    const p2 = nextState.trackingProperties.find((tp) => tp.propertyId === 'p-2');
    expect(p1?.source).toBe('direct');
    expect(p1?.presence).toBe('sometimes');
    expect(p2?.source).toBe('module');
    expect(p2?.presence).toBe('always');
  });

  it('detects hierarchy cycles in parent_property (REQ-DOM-004)', () => {
    const allProps = new Map<string, { id: string; parentPropertyId: string | null }>([
      ['p-1', { id: 'p-1', parentPropertyId: null }],
      ['p-2', { id: 'p-2', parentPropertyId: 'p-1' }],
      ['p-3', { id: 'p-3', parentPropertyId: 'p-2' }],
    ]);

    // Self cycle
    expect(detectPropertyHierarchyCycle('p-1', 'p-1', allProps)).toBe(true);
    // Setting p-1 parent to p-3 creates cycle p-1 -> p-3 -> p-2 -> p-1
    expect(detectPropertyHierarchyCycle('p-1', 'p-3', allProps)).toBe(true);
    // Setting p-3 parent to null or p-1 is fine
    expect(detectPropertyHierarchyCycle('p-3', 'p-1', allProps)).toBe(false);
    expect(detectPropertyHierarchyCycle('p-3', null, allProps)).toBe(false);
  });
});

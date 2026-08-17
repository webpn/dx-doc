import type { TrackingProperty } from './entities';

export interface TrackingCompositionState {
  trackingId: string;
  appliedModuleIds: string[];
  trackingProperties: TrackingProperty[];
}

export interface RemovePropertyResult {
  updatedTrackingProperties: TrackingProperty[];
  updatedAppliedModuleIds: string[];
  detachedModuleIds: string[];
  warnModuleDetached: boolean;
}

/**
 * Pure domain composition logic:
 * REQ-DOM-008: Any property may be removed from a tracking individually, whether it arrived via a module
 * or directly. If all properties of a module are removed, the module association is removed automatically
 * with a warning.
 */
export function removePropertyFromTracking(
  state: TrackingCompositionState,
  propertyIdToRemove: string,
  modulePropertyMap: Map<string, string[]>, // moduleId -> propertyIds in module
): RemovePropertyResult {
  const nextTrackingProps = state.trackingProperties.filter(
    (tp) => tp.propertyId !== propertyIdToRemove,
  );

  const remainingPropIds = new Set(nextTrackingProps.map((tp) => tp.propertyId));

  const detachedModuleIds: string[] = [];
  const nextModuleIds: string[] = [];

  for (const modId of state.appliedModuleIds) {
    const modProps = modulePropertyMap.get(modId) ?? [];
    // If the module has properties defined, check if at least one remains in the tracking
    const hasRemaining = modProps.some((pId) => remainingPropIds.has(pId));
    if (modProps.length > 0 && !hasRemaining) {
      detachedModuleIds.push(modId);
    } else {
      nextModuleIds.push(modId);
    }
  }

  return {
    updatedTrackingProperties: nextTrackingProps,
    updatedAppliedModuleIds: nextModuleIds,
    detachedModuleIds,
    warnModuleDetached: detachedModuleIds.length > 0,
  };
}

/**
 * REQ-DOM-008: Re-adding a module restores its full property set without duplicating
 * properties added individually.
 */
export function applyModuleToTracking(
  state: TrackingCompositionState,
  moduleId: string,
  modulePropertyIds: string[],
  newIdGenerator: () => string,
  nowIso: string,
): TrackingCompositionState {
  const existingPropMap = new Map(state.trackingProperties.map((tp) => [tp.propertyId, tp]));

  const nextTrackingProps = [...state.trackingProperties];

  for (const propId of modulePropertyIds) {
    if (!existingPropMap.has(propId)) {
      nextTrackingProps.push({
        id: newIdGenerator(),
        trackingId: state.trackingId,
        propertyId: propId,
        source: 'module',
        presence: 'always',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  const nextModuleIds = state.appliedModuleIds.includes(moduleId)
    ? state.appliedModuleIds
    : [...state.appliedModuleIds, moduleId];

  return {
    trackingId: state.trackingId,
    appliedModuleIds: nextModuleIds,
    trackingProperties: nextTrackingProps,
  };
}

/**
 * REQ-DOM-004: Validate object parent property hierarchy to prevent cycles.
 */
export function detectPropertyHierarchyCycle(
  propertyId: string,
  newParentId: string | null,
  allProperties: Map<string, { id: string; parentPropertyId: string | null }>,
): boolean {
  if (!newParentId) return false;
  if (propertyId === newParentId) return true;

  let currentId: string | null = newParentId;
  const visited = new Set<string>([propertyId]);

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    const parent = allProperties.get(currentId);
    currentId = parent?.parentPropertyId ?? null;
  }

  return false;
}

/**
 * REQ-DOM-028: Validate that referenced entities belong to the same project (no cross-project references).
 */
export function assertSameProject(
  entityProjectId: string | null,
  targetProjectId: string | null,
): boolean {
  if (entityProjectId === null || targetProjectId === null) {
    // Catalogue items (null projectId) can be copied, but active entities within a project must match
    return true;
  }
  return entityProjectId === targetProjectId;
}

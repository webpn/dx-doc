import type {
  ChangelogEntry,
  DataLayerProperty,
  Destination,
  Flow,
  FreePage,
  Module,
  ProjectVersionSnapshot,
  Tracking,
} from '@project/domain/entities';

/**
 * The draft entity sets a publication would include, after exclusion and
 * publishability filtering has been applied by the caller. Properties,
 * modules and destinations are never excludable (REQ-VER-003), so they
 * always arrive whole.
 */
export interface PublicationCandidates {
  properties: DataLayerProperty[];
  modules: Module[];
  destinations: Destination[];
  freePages: FreePage[];
  trackings: Tracking[];
  flows: Flow[];
}

/**
 * Compute the changelog between the last published snapshot and the entity
 * sets a new publication would contain (REQ-VER-005, REQ-VER-006).
 *
 * Comparison is entity-granular by `updatedAt` inequality — the same rule the
 * publication itself has always applied, so a preview computed here matches
 * the changelog the subsequent publish produces entry for entry. A `previous`
 * of `null` means the project has no version yet: every entity reads as
 * added, which is what publishing version 1 records.
 *
 * Pure function: no repository, clock or id-generator dependency, so the
 * publication preview and the publish path cannot drift apart.
 */
export function computeChangelog(
  previous: ProjectVersionSnapshot | null,
  candidates: PublicationCandidates,
): ChangelogEntry[] {
  const changelog: ChangelogEntry[] = [];

  if (previous === null) {
    // First version: everything currently included is new.
    for (const p of candidates.properties) {
      changelog.push({ type: 'added', entityType: 'property', entityId: p.id, name: p.name });
    }
    for (const m of candidates.modules) {
      changelog.push({ type: 'added', entityType: 'module', entityId: m.id, name: m.name });
    }
    for (const d of candidates.destinations) {
      changelog.push({ type: 'added', entityType: 'destination', entityId: d.id, name: d.name });
    }
    for (const fp of candidates.freePages) {
      changelog.push({ type: 'added', entityType: 'page', entityId: fp.id, name: fp.title });
    }
    for (const t of candidates.trackings) {
      changelog.push({ type: 'added', entityType: 'tracking', entityId: t.id, name: t.name });
    }
    for (const f of candidates.flows) {
      changelog.push({ type: 'added', entityType: 'flow', entityId: f.id, name: f.name });
    }
    return changelog;
  }

  // Properties
  const prevPropMap = new Map(previous.properties.map((p) => [p.id, p]));
  for (const p of candidates.properties) {
    const old = prevPropMap.get(p.id);
    if (!old) {
      changelog.push({ type: 'added', entityType: 'property', entityId: p.id, name: p.name });
    } else if (old.updatedAt !== p.updatedAt) {
      changelog.push({ type: 'modified', entityType: 'property', entityId: p.id, name: p.name });
    }
  }
  for (const old of previous.properties) {
    if (!candidates.properties.some((p) => p.id === old.id)) {
      changelog.push({ type: 'removed', entityType: 'property', entityId: old.id, name: old.name });
    }
  }

  // Trackings
  const prevTrkMap = new Map(previous.trackings.map((t) => [t.id, t]));
  for (const t of candidates.trackings) {
    const old = prevTrkMap.get(t.id);
    if (!old) {
      changelog.push({ type: 'added', entityType: 'tracking', entityId: t.id, name: t.name });
    } else if (old.updatedAt !== t.updatedAt) {
      changelog.push({ type: 'modified', entityType: 'tracking', entityId: t.id, name: t.name });
    }
  }
  for (const old of previous.trackings) {
    if (!candidates.trackings.some((t) => t.id === old.id)) {
      changelog.push({ type: 'removed', entityType: 'tracking', entityId: old.id, name: old.name });
    }
  }

  // Modules
  const prevModMap = new Map(previous.modules.map((m) => [m.id, m]));
  for (const m of candidates.modules) {
    const old = prevModMap.get(m.id);
    if (!old) {
      changelog.push({ type: 'added', entityType: 'module', entityId: m.id, name: m.name });
    } else if (old.updatedAt !== m.updatedAt) {
      changelog.push({ type: 'modified', entityType: 'module', entityId: m.id, name: m.name });
    }
  }
  for (const old of previous.modules) {
    if (!candidates.modules.some((m) => m.id === old.id)) {
      changelog.push({ type: 'removed', entityType: 'module', entityId: old.id, name: old.name });
    }
  }

  // Destinations
  const prevDestMap = new Map(previous.destinations.map((d) => [d.id, d]));
  for (const d of candidates.destinations) {
    const old = prevDestMap.get(d.id);
    if (!old) {
      changelog.push({ type: 'added', entityType: 'destination', entityId: d.id, name: d.name });
    } else if (old.updatedAt !== d.updatedAt) {
      changelog.push({ type: 'modified', entityType: 'destination', entityId: d.id, name: d.name });
    }
  }
  for (const old of previous.destinations) {
    if (!candidates.destinations.some((d) => d.id === old.id)) {
      changelog.push({
        type: 'removed',
        entityType: 'destination',
        entityId: old.id,
        name: old.name,
      });
    }
  }

  // Pages (free pages — the publishable page set of a snapshot, REQ-VER-003)
  const prevFpMap = new Map(previous.freePages.map((fp) => [fp.id, fp]));
  for (const fp of candidates.freePages) {
    const old = prevFpMap.get(fp.id);
    if (!old) {
      changelog.push({ type: 'added', entityType: 'page', entityId: fp.id, name: fp.title });
    } else if (old.updatedAt !== fp.updatedAt) {
      changelog.push({ type: 'modified', entityType: 'page', entityId: fp.id, name: fp.title });
    }
  }
  for (const old of previous.freePages) {
    if (!candidates.freePages.some((fp) => fp.id === old.id)) {
      changelog.push({ type: 'removed', entityType: 'page', entityId: old.id, name: old.title });
    }
  }

  // Flows
  const prevFlowMap = new Map(previous.flows.map((f) => [f.id, f]));
  for (const f of candidates.flows) {
    const old = prevFlowMap.get(f.id);
    if (!old) {
      changelog.push({ type: 'added', entityType: 'flow', entityId: f.id, name: f.name });
    } else if (old.updatedAt !== f.updatedAt) {
      changelog.push({ type: 'modified', entityType: 'flow', entityId: f.id, name: f.name });
    }
  }
  for (const old of previous.flows) {
    if (!candidates.flows.some((f) => f.id === old.id)) {
      changelog.push({ type: 'removed', entityType: 'flow', entityId: old.id, name: old.name });
    }
  }

  return changelog;
}

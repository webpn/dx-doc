import { apiRequest } from './client';

/**
 * Wire types for versions and publication (REQ-VER-001 .. REQ-VER-007).
 * Declared here rather than imported from `src/domain`: the client is a
 * consumer of the HTTP contract, and the app layer never reaches into domain
 * code (AGENTS.md).
 */

export const CHANGELOG_ENTRY_TYPES = ['added', 'modified', 'removed'] as const;
export type ChangelogEntryType = (typeof CHANGELOG_ENTRY_TYPES)[number];

export const CHANGELOG_ENTITY_TYPES = [
  'property',
  'module',
  'destination',
  'page',
  'tracking',
  'flow',
] as const;
export type ChangelogEntityType = (typeof CHANGELOG_ENTITY_TYPES)[number];

/** One generated changelog line (REQ-VER-006): what changed, at entity grain. */
export interface ChangelogEntryRecord {
  type: ChangelogEntryType;
  entityType: ChangelogEntityType;
  entityId: string;
  name: string;
  details?: string;
}

/**
 * A published version as the API returns it. The response also carries the
 * full immutable snapshot, which the history screens deliberately do not
 * consume — REQ-VER-007 consultation here covers metadata and the changelog
 * records, not a time-travel rendering of historical content.
 */
export interface VersionRecord {
  id: string;
  projectId: string;
  versionNumber: number;
  title: string | null;
  releaseNotes: string | null;
  changelog: ChangelogEntryRecord[];
  createdBy: string;
  createdAt: string;
}

/** Version metadata fields the editor supplies at publication (REQ-VER-004). */
export interface PublishVersionInput {
  title?: string;
  releaseNotes?: string;
  /**
   * Selective publication (REQ-VER-003): trackings, pages and flows can be
   * held back from this publication only. Properties and modules cannot be
   * excluded; the server refuses a publication whose remaining entities
   * still reference an excluded one.
   */
  excludedTrackingIds?: string[];
  excludedPageIds?: string[];
  excludedFlowIds?: string[];
}

export interface PublishVersionResult {
  versionId: string;
  versionNumber: number;
}

/**
 * The diff between the draft and the last publication, as the pre-publication
 * preview returns it (REQ-VER-005). The preview endpoint takes no exclusion
 * parameters, so the diff is always the whole-draft view: the editor's
 * exclusions apply when the publish command itself runs, and the server
 * re-checks referential integrity there (REQ-VER-003).
 */
export interface PublicationPreviewRecord {
  changelog: ChangelogEntryRecord[];
}

/** The project-level indicator (REQ-VER-002). */
export interface UnpublishedChangesRecord {
  hasUnpublishedChanges: boolean;
  changedEntityCount: number;
}

export const versionsApi = {
  list: (projectId: string): Promise<VersionRecord[]> =>
    apiRequest<VersionRecord[]>(`/api/projects/${projectId}/versions`),

  get: (versionId: string): Promise<VersionRecord> =>
    apiRequest<VersionRecord>(`/api/versions/${versionId}`),

  previewDiff: (companyId: string, projectId: string): Promise<PublicationPreviewRecord> =>
    apiRequest<PublicationPreviewRecord>(
      `/api/companies/${companyId}/projects/${projectId}/versions/preview-diff`,
    ),

  unpublishedChanges: (companyId: string, projectId: string): Promise<UnpublishedChangesRecord> =>
    apiRequest<UnpublishedChangesRecord>(
      `/api/companies/${companyId}/projects/${projectId}/versions/unpublished-changes`,
    ),

  publish: (
    companyId: string,
    projectId: string,
    input: PublishVersionInput,
  ): Promise<PublishVersionResult> =>
    apiRequest<PublishVersionResult>(`/api/companies/${companyId}/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

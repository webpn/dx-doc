import { apiRequest } from './client';
import type { Flow } from './flows';
import type { FreePage } from './free-pages';
import type { DataLayerProperty, Destination, Module, Tracking } from './trackings';

/**
 * Wire types for the read-only published view (REQ-VIEW-001, M1.17).
 *
 * The reader surface is the only entry point a shared-password holder can
 * reach: verification swaps the typed password for a project-scoped reader
 * session (an httpOnly cookie), and every content fetch carries that cookie.
 * Declared here rather than imported from `src/domain` — the client is a
 * consumer of the HTTP contract (AGENTS.md).
 */

/**
 * Response of `POST /api/projects/:projectId/shared-passwords/verify`.
 * A wrong password is NOT an error: the server answers 200 with
 * `verified: false` (the same response a non-existent password gets, so an
 * attacker cannot distinguish the two).
 */
export interface SharedPasswordVerifyResult {
  verified: boolean;
  sharedPasswordId: string | null;
}

/**
 * The immutable published snapshot as the reader endpoint returns it
 * (REQ-VIEW-001, REQ-SEC-012). `freePages` has already been filtered
 * server-side to publishable pages only — the client never receives a
 * non-publishable page, and it never renders a draft.
 *
 * The tracking/flow/property surfaces are typed for contract completeness
 * (the snapshot carries them) but deliberately not rendered by the reader in
 * R1: their read-side models are editor-oriented, and the documented free-pages
 * surface is the minimum REQ-VIEW-001 must show. */
export interface PublishedReaderSnapshot {
  versionNumber: number;
  title: string | null;
  releaseNotes: string | null;
  createdAt: string;
  properties: DataLayerProperty[];
  modules: Module[];
  destinations: Destination[];
  freePages: FreePage[];
  trackings: Tracking[];
  flows: Flow[];
}

/**
 * What `GET /api/projects/:projectId/reader` returns: the latest published
 * version's metadata and its snapshot. 401 without a reader session, 404 when
 * the project has never published.
 */
export interface PublishedReaderContent {
  versionId: string;
  projectId: string;
  versionNumber: number;
  title: string | null;
  releaseNotes: string | null;
  createdAt: string;
  snapshot: PublishedReaderSnapshot;
}

export const readerApi = {
  /**
   * Turn a typed shared password into a project-scoped reader session. The
   * session travels in an httpOnly `dxdoc_session` cookie; the response
   * contains no token. A wrong password resolves to `verified: false` at 200
   * rather than an error (REQ-SEC-005).
   */
  verifySharedPassword(projectId: string, password: string): Promise<SharedPasswordVerifyResult> {
    return apiRequest<SharedPasswordVerifyResult>(
      `/api/projects/${projectId}/shared-passwords/verify`,
      { method: 'POST', body: JSON.stringify({ password }) },
    );
  },

  /** The latest published version of the project, readable (`REQ-VIEW-001`). */
  getPublished(projectId: string): Promise<PublishedReaderContent> {
    return apiRequest<PublishedReaderContent>(`/api/projects/${projectId}/reader`);
  },
};

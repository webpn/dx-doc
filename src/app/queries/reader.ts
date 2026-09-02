import { useMutation, useQuery } from '@tanstack/react-query';

import { readerApi } from '../api';

import { queryKeys } from './keys';

/**
 * Exchange a typed shared password for a reader session (REQ-VIEW-001,
 * REQ-SEC-005). The session lives in an httpOnly cookie set by the verify
 * endpoint; the mutation itself carries no state into the client, so the
 * caller decides where a `verified: false` answer leads.
 */
export function useVerifySharedPassword(projectId: string | undefined) {
  return useMutation({
    mutationFn: (password: string) => readerApi.verifySharedPassword(projectId ?? '', password),
  });
}

/**
 * The latest published documentation for the shared-password reader.
 *
 * A 401 means the reader session is missing or expired — a state to surface
 * with a path back to the password entry, not a transient failure, so it is
 * never retried. A 404 means the project has never published. Both are
 * distinguished from generic load failures by the caller (ADR-0012).
 */
export function usePublishedReaderContent(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reader(projectId ?? ''),
    queryFn: () => readerApi.getPublished(projectId ?? ''),
    enabled: projectId !== undefined,
    retry: false,
  });
}

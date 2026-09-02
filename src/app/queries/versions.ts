import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { versionsApi, type PublishVersionInput, type PublishVersionResult } from '../api';

import { queryKeys } from './keys';

/** Version history for a project, newest first (REQ-VER-006, REQ-VER-007). */
export function useVersions(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.versions(projectId ?? ''),
    queryFn: () => versionsApi.list(projectId ?? ''),
    enabled: projectId !== undefined,
  });
}

/** One published version with its generated changelog (REQ-VER-007). */
export function useVersion(versionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.version(versionId ?? ''),
    queryFn: () => versionsApi.get(versionId ?? ''),
    enabled: versionId !== undefined,
  });
}

/**
 * Project-level unpublished-changes indicator (REQ-VER-002). The server
 * derives it from the same diff the publish would record — the client never
 * assembles it from per-entity lists.
 */
export function useUnpublishedChanges(
  companyId: string | undefined,
  projectId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.unpublishedChanges(projectId ?? ''),
    queryFn: () => versionsApi.unpublishedChanges(companyId ?? '', projectId ?? ''),
    enabled: companyId !== undefined && projectId !== undefined,
  });
}

/**
 * Pre-publication diff (REQ-VER-005, US-EDT-17). `enabled` is the opt-in:
 * nothing is fetched until the publish dialog asks, mirroring the module
 * propagation preview.
 */
export function usePublicationPreview(
  companyId: string | undefined,
  projectId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.publicationPreview(projectId ?? ''),
    queryFn: () => versionsApi.previewDiff(companyId ?? '', projectId ?? ''),
    enabled: enabled && companyId !== undefined && projectId !== undefined,
  });
}

/**
 * Publish the current draft (REQ-VER-003, REQ-VER-004). A publication
 * supersedes the preview and the indicator, so the whole versions subtree
 * for the project is invalidated, alongside the project query itself.
 */
export function usePublishVersion(
  companyId: string,
  projectId: string,
): ReturnType<typeof useMutation<PublishVersionResult, Error, PublishVersionInput>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishVersionInput) => versionsApi.publish(companyId, projectId, input),
    onSuccess: () => {
      // The `versions` prefix covers the list, the preview diff and the
      // unpublished-changes indicator in one invalidation. The reader key
      // shares the project-scoped prefix because a publication is exactly
      // what changes what a shared-password reader sees (REQ-VIEW-001).
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reader(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    },
  });
}

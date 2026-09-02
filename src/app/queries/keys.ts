/**
 * Query-key convention (ADR-0012, ADR-0010). Every key that reads
 * project- or company-scoped data takes the scope id explicitly — a cache
 * entry must never be reachable from outside the scope it was fetched for.
 * Do not build ad hoc keys inline; add a helper here instead.
 */
export const queryKeys = {
  companies: () => ['companies'] as const,
  company: (companyId: string) => ['companies', companyId] as const,
  projects: (companyId: string) => ['companies', companyId, 'projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  grants: (projectId: string) => ['projects', projectId, 'grants'] as const,
  pages: (projectId: string) => ['projects', projectId, 'pages'] as const,
  page: (pageId: string) => ['pages', pageId] as const,
  freePages: (companyId: string, projectId: string | null) =>
    ['companies', companyId, 'free-pages', projectId] as const,
  freePage: (freePageId: string) => ['free-pages', freePageId] as const,
  flows: (projectId: string) => ['projects', projectId, 'flows'] as const,
  flow: (flowId: string) => ['flows', flowId] as const,
  triggers: (projectId: string) => ['projects', projectId, 'triggers'] as const,
  trigger: (triggerId: string) => ['triggers', triggerId] as const,
  trackings: (projectId: string) => ['projects', projectId, 'trackings'] as const,
  tracking: (trackingId: string) => ['trackings', trackingId] as const,
  navigationEvents: (projectId: string) => ['projects', projectId, 'navigation-events'] as const,
  modules: (companyId: string, projectId?: string) =>
    ['companies', companyId, 'modules', projectId ?? null] as const,
  properties: (companyId: string, projectId?: string) =>
    ['companies', companyId, 'properties', projectId ?? null] as const,
  property: (propertyId: string) => ['properties', propertyId] as const,
  module: (moduleId: string) => ['modules', moduleId] as const,
  modulePropagation: (moduleId: string) => ['modules', moduleId, 'propagation'] as const,
  destinations: (companyId: string) => ['companies', companyId, 'destinations'] as const,
  destination: (destinationId: string) => ['destinations', destinationId] as const,
  trackingTemplates: (companyId: string, projectId?: string) =>
    ['companies', companyId, 'tracking-templates', projectId ?? null] as const,
  trackingTemplate: (templateId: string) => ['tracking-templates', templateId] as const,
  /**
   * Version history for a project (M1.17). The nested publication keys share
   * this prefix so one publish-mutation invalidation refreshes the list, the
   * indicator and the preview together.
   */
  versions: (projectId: string) => ['projects', projectId, 'versions'] as const,
  version: (versionId: string) => ['versions', versionId] as const,
  publicationPreview: (projectId: string) =>
    ['projects', projectId, 'versions', 'preview-diff'] as const,
  unpublishedChanges: (projectId: string) =>
    ['projects', projectId, 'versions', 'unpublished-changes'] as const,
  stepUps: () => ['instance-admin', 'step-ups'] as const,
  /**
   * Latest published content for the shared-password reader (REQ-VIEW-001).
   * Shares the project-scoped prefix so a publication invalidation refreshes
   * both the authenticated consultation and the reader surface.
   */
  reader: (projectId: string) => ['projects', projectId, 'reader'] as const,
};

/**
 * Query-key convention (ADR-0012, ADR-0010). Every key that reads
 * project- or company-scoped data takes the scope id explicitly — a cache
 * entry must never be reachable from outside the scope it was fetched for.
 * Do not build ad hoc keys inline; add a helper here instead.
 */
export const queryKeys = {
  company: (companyId: string) => ['companies', companyId] as const,
  projects: (companyId: string) => ['companies', companyId, 'projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  grants: (projectId: string) => ['projects', projectId, 'grants'] as const,
  pages: (projectId: string) => ['projects', projectId, 'pages'] as const,
  page: (pageId: string) => ['pages', pageId] as const,
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
};

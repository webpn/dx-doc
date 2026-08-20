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
};

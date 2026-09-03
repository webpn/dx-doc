import type { Result } from '@project/shared/result';

/** Counts of project-scoped rows a catalogue copy materialised. */
export interface CatalogueCopyCounts {
  copiedProperties: number;
  copiedModules: number;
}

/**
 * Copies a company's catalogue (company-scoped properties and modules) into a
 * project as independent project-scoped rows (REQ-DOM-019, Critical Business
 * Rule 3: copy at project creation, no live link, changes do not propagate).
 *
 * The capability is invoked by `ProjectService.create` after its
 * `company.manage_projects` gate, so it deliberately carries no permission
 * check of its own: a direct caller must already hold that company-scope
 * permission. The implementation is idempotent — re-running the copy after the
 * automatic creation-time copy adds nothing.
 *
 * The error type is `never` by design: the copy performs no check that can
 * fail once it is reached, so an unexpected failure is an infrastructure error
 * and throws at the repository boundary, like every other application-layer
 * write.
 */
export interface CatalogueCopier {
  copyCatalogueIntoProject(
    companyId: string,
    projectId: string,
  ): Promise<Result<CatalogueCopyCounts, never>>;
}

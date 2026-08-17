/**
 * Uniform validation error shape (REQ-FDN-010).
 *
 * Every entry point — HTTP, MCP, and direct application-service calls —
 * surfaces a failed validation as a list of these issues, so a machine can
 * branch on `field` + `code` rather than parsing prose.
 */
export interface ValidationIssue {
  /** Path to the offending field, e.g. `project.name` or `platform`. */
  field: string;
  /** Stable machine-readable code (zod error code, or a rule's custom code). */
  code: string;
  /** Human-readable explanation. */
  message: string;
}

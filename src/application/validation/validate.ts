import { err, ok, type Result } from '@project/shared';
import type { ZodType } from 'zod';

import type { ValidationIssue } from './issues';

/**
 * Validate `data` against a schema, returning the typed value or a uniform
 * list of `ValidationIssue`s (REQ-FDN-010). This is the single validation
 * entry point shared by the application services and every transport — a rule
 * defined here is a rule the HTTP API, the MCP server and direct calls all
 * enforce identically.
 */
export function validate<T>(schema: ZodType<T>, data: unknown): Result<T, ValidationIssue[]> {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return ok(parsed.data);
  }
  const issues: ValidationIssue[] = parsed.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'value',
    code: issue.code === 'custom' ? 'invalid' : issue.code,
    message: issue.message,
  }));
  return err(issues);
}

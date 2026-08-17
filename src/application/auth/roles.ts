/**
 * The four company-scoped roles (REQ-SEC-002). Exactly four — a capability that
 * is genuinely not a role is a discrete flag (REQ-SEC-014), never a fifth role.
 *
 * Values match the `roles.name` CHECK constraint in schema v1.
 */
export const COMPANY_ROLE_NAMES = ['admin', 'project_manager', 'editor', 'viewer'] as const;

export type CompanyRoleName = (typeof COMPANY_ROLE_NAMES)[number];

export function isCompanyRoleName(value: string): value is CompanyRoleName {
  return (COMPANY_ROLE_NAMES as readonly string[]).includes(value);
}

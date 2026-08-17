// Application layer — public API surface
// Use cases, ports, and CQRS-lite commands/queries. No React, no browser, no
// network, no infrastructure imports. See ARCHITECTURE.md §Application.

export type { ObjectStorage } from './ports/storage';
export type { IndexableDocument, SearchIndex, SearchResult } from './ports/search';

export { COMPANY_ROLE_NAMES, isCompanyRoleName } from './auth/roles';
export type { CompanyRoleName } from './auth/roles';

export { generateSessionToken, hashSessionToken } from './auth/tokens';
export { SessionService } from './auth/session-service';
export type { NewSession } from './auth/session-service';
export { AuthService } from './auth/auth-service';
export type { ChangePasswordError, LoginResult } from './auth/auth-service';

export { COMPANY_ACTION_ROLES, PermissionService, PROJECT_ACTION_ROLES } from './auth/permissions';
export type { CompanyAction, InstanceAction, ProjectAction } from './auth/permissions';

export { LifecycleService } from './auth/lifecycle-service';
export type { LifecycleError } from './auth/lifecycle-service';

export { BootstrapService, BootstrapConfigError } from './auth/bootstrap-service';
export type { BootstrapResult, BootstrapVariables } from './auth/bootstrap-service';

export { CompanyService } from './company/company-service';
export type { CompanyError } from './company/company-service';

export type { PasswordHasher } from './ports/password-hasher';

export type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  ProjectGrant,
  UserAccount,
} from './ports/account-repository';

export type { SessionRecord, SessionRepository } from './ports/session-repository';

export type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from './ports/reset-token-repository';

export type { CompanyRecord, CompanyRepository } from './ports/company-repository';

export type { EmailMessage, EmailSender } from './ports/email-sender';

export { validate } from './validation/validate';
export {
  companyCreateSchema,
  pageCreateSchema,
  pageUpdateSchema,
  PLATFORMS,
  projectCreateSchema,
  projectUpdateSchema,
} from './validation/schemas';
export type {
  CompanyCreateInput,
  PageCreateInput,
  PageUpdateInput,
  Platform,
  ProjectCreateInput,
  ProjectUpdateInput,
} from './validation/schemas';
export type { ValidationIssue } from './validation/issues';

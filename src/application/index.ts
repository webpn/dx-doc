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
export type { LoginResult } from './auth/auth-service';

export type { PasswordHasher } from './ports/password-hasher';

export type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  ProjectGrant,
  UserAccount,
} from './ports/account-repository';

export type { SessionRecord, SessionRepository } from './ports/session-repository';

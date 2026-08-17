// Infrastructure layer — public API surface
// Adapters and concrete implementations behind the ports owned by the domain.
// See ARCHITECTURE.md §Infrastructure for layer rules.

export {
  openSqliteConnection,
  closeSqliteConnection,
  type Connection,
  type Db,
} from './persistence/sqlite-kysely';

export {
  INSTANCE_VARIABLES,
  InstanceConfigError,
  loadInstanceConfig,
} from './config/instance-config';
export type { InstanceConfig, InstanceVariableDef } from './config/instance-config';

export { InMemoryObjectStorage } from './storage/in-memory-storage';
export { createS3ObjectStorage, S3ObjectStorage } from './storage/s3-storage';

export { InMemorySearchIndex } from './search/in-memory-search';
export { PagefindSearchIndex, PagefindQueryUnsupportedError } from './search/pagefind-search';

export { BcryptPasswordHasher } from './security/bcrypt-password-hasher';

export { SqliteAccountRepository } from './persistence/sqlite-account-repository';
export { SqliteSessionRepository } from './persistence/sqlite-session-repository';
export { SqlitePasswordResetTokenRepository } from './persistence/sqlite-reset-token-repository';
export { SqliteCompanyRepository } from './persistence/sqlite-company-repository';
export { SqliteProjectRepository } from './persistence/sqlite-project-repository';
export { SqlitePageRepository } from './persistence/sqlite-page-repository';
export {
  SqlitePropertyRepository,
  SqliteModuleRepository,
  SqliteDestinationRepository,
  SqliteNavigationEventRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
  SqliteFreePageRepository,
  SqliteFlowRepository,
  SqliteTriggerRepository,
  SqliteVersionRepository,
} from './persistence/sqlite-tracking-repositories';

export { SmtpEmailSender, createSmtpEmailSender } from './email/smtp-email-sender';
export { NoopEmailSender } from './email/noop-email-sender';

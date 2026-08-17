// Infrastructure layer — public API surface
// Adapters and concrete implementations behind the ports owned by the domain.
// See ARCHITECTURE.md §Infrastructure for layer rules.

export { openSqliteConnection } from './persistence/sqlite';
export type { SqliteDb } from './persistence/sqlite';

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

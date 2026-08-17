// Infrastructure layer — public API surface
// Adapters and concrete implementations behind the ports owned by the domain.
// See ARCHITECTURE.md §Infrastructure for layer rules.

export { openSqliteConnection } from './persistence/sqlite';
export type { SqliteDb } from './persistence/sqlite';

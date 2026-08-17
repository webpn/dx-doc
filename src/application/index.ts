// Application layer — public API surface
// Use cases, ports, and CQRS-lite commands/queries. No React, no browser, no
// network, no infrastructure imports. See ARCHITECTURE.md §Application.

export type { ObjectStorage } from './ports/storage';
export type { IndexableDocument, SearchIndex, SearchResult } from './ports/search';

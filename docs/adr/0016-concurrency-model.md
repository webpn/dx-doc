# ADR-0016: Concurrency Model — Optimistic Locking

## Status

Accepted

## Date

2026-08-11

> **Implementation status (2026-08-20):** Partially implemented. `expectedUpdatedAt` is **optional** in practice — when omitted, writes proceed with last-write-wins semantics. The check is read-compare-write rather than an atomic guarded `UPDATE ... WHERE updated_at = ?`, so it can still lose a concurrent write. Bulk writes are **not** transactional: `batchCreate` processes items independently and returns per-item results.

## Context

Multiple editors may work on the same project simultaneously. The spec defines the concurrency behavior: "If a record the user is viewing is modified by someone else, a notice appears. A save is rejected if the record was modified after the moment the user opened it, with a clear conflict message."

## Decision

**Optimistic concurrency with stale-write rejection.** No pessimistic locking.

**Implementation:**

- Every mutable entity carries a version token (e.g., an `updated_at` timestamp or a monotonic version number).
- When a client fetches an entity, it receives the current version token.
- When the client saves, it sends the version token it received. The server compares it against the current version.
- If the versions match, the save succeeds and the version token is updated.
- If the versions differ, the save is rejected with a `409 Conflict` response. The client can then fetch the latest version and re-apply changes.

**User experience:**

- When another user modifies a record the current user is viewing, a notice appears (polling or WebSocket for live notification).
- On save conflict, a clear message explains that the record was modified by someone else and the user should review the latest version.

## Alternatives Considered

### Pessimistic locking

Rejected: locks must be acquired and released. If a user opens a page and walks away, the lock must time out. Timeout tuning is difficult; too short frustrates users, too long blocks others. At ≤10 concurrent editors, optimistic concurrency is simpler and sufficient.

### Last-write-wins (no concurrency control)

Rejected: silent data loss. Two editors editing the same tracking's description would overwrite each other's changes with no warning.

### CRDT / operational transformation

Rejected: massively over-engineered for this use case. The document is not collaboratively edited in real time; it's a form-based structured editor. Conflict is the exception, not the norm.

## Consequences

- The version token is returned in API responses and required in update requests.
- The API client layer can handle 409 responses generically, surfacing the conflict to the UI.
- Live notification of external changes requires a mechanism (polling at minimum; WebSocket or Server-Sent Events as an enhancement).
- Bulk operations write atomically: all selected trackings succeed or the entire operation fails. Partial application on conflict is not allowed.

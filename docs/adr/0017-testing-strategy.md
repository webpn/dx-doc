# ADR-0017: Testing Strategy

## Status
Proposed

## Date
2026-08-11

## Context
The Platform needs a testing strategy that covers domain logic, application use cases, infrastructure adapters, API endpoints, and UI components. Tests must be reliable, fast enough to run in CI on every PR, and provide meaningful coverage of behavior — not implementation details.

## Proposal

### Testing Layers

| Layer | Tool | Focus | Environment |
|---|---|---|---|
| Domain (unit) | Vitest | Business rules, invariants, value objects, Result types | Pure TypeScript, no I/O |
| Application (unit/integration) | Vitest | Use cases with mocked ports | Mocked infrastructure |
| Infrastructure (integration) | Vitest | Repository implementations, search adapter, storage adapter | Test database (SQLite; MariaDB and PostgreSQL from R2 — see dialect matrix below), test S3 (MinIO), real search adapter (Pagefind needs no external service) |
| API (integration) | Vitest + supertest | Endpoint behavior, validation, auth | Test database, mocked external services |
| UI (component) | Vitest + React Testing Library | Component behavior: interactions, states, accessibility | JSDOM |
| E2E | Playwright | Critical user journeys: create project, edit tracking, publish, view | Full stack (test database, test S3, etc.) |

### Principles
- Test behavior, not implementation. A test titled "calls the repository" is about implementation. A test titled "returns the tracking with the added property" is about behavior.
- Domain tests have the highest volume; E2E tests have the lowest.
- Infrastructure tests run against real services (a real database, test S3 bucket, a real search index). No mocking at the infrastructure level — it defeats the purpose.

### Database dialect matrix

Since [ADR-0020](0020-database-portability.md) the Platform supports multiple database adapters, so "a real database" means more than one from R2 onward.

| When | Dialects | Rationale |
|---|---|---|
| Every pull request | SQLite | Fast, no service container, catches everything that is not dialect-specific |
| Nightly, and before every release | SQLite + MariaDB + PostgreSQL | The only thing that actually verifies portability |

The full repository and migration suite runs unchanged against each dialect — no dialect-specific test variants, and no test skipped on a dialect. A test that cannot pass on all supported dialects is evidence that the schema left the portable subset (REQ-FDN-020), and the schema is what gets fixed.

Through R0 and R1 there is exactly one adapter, so this matrix costs nothing until the MariaDB and PostgreSQL adapters land in R2.
- Every bug fix includes a regression test.
- Coverage targets are not a goal. Meaningful coverage is.

### Test Organization
- Unit/component tests: co-located with source files or in `__tests__/` alongside.
- Integration tests: `tests/integration/`.
- E2E tests: `e2e/`.

### CI Requirements
- All tests must pass before merge.
- Test database is ephemeral (created at start of CI run, destroyed at end).
- Search tests run the default adapter for real: Pagefind needs no account and no network, so search coverage is never skipped in CI ([ADR-0009](0009-search-abstraction.md)). A hosted adapter (R3) would reintroduce a credential-gated suite, and that is a cost to weigh when it is added.

## Alternatives Considered

### Jest instead of Vitest
Rejected: Vitest is faster (native ESM, Vite integration), has a compatible API, and is the emerging standard in the Vite/React ecosystem. The project already uses Vite for the build (or it's a strong candidate).

### Only E2E tests (no unit tests)
Rejected: slow, flaky, and poor at pinpointing the source of failures. E2E tests are for critical journeys; unit tests are for business rules.

### Mocking everything (including the database in integration tests)
Rejected: infrastructure tests that mock the database test the mock, not the adapter. Real services (test database) catch schema mismatches, query errors, and transaction behavior.

## Related Decisions
- ADR-0006: Layered Architecture — testing aligns with layers.
- ADR-0011: UI Library Selection — component testing tooling may depend on the library.
- ADR-0012: Data-Fetching Strategy — server-state testing patterns.

## Last Responsible Moment
Start of R1 (before significant application code is written). The test infrastructure (Vitest config, Playwright config, test database setup) must be in place during R0.
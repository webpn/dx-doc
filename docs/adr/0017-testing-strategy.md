# ADR-0017: Testing Strategy

## Status

Accepted (2026-08-12)

## Date

2026-08-11 (decided 2026-08-12)

> **Implementation status (2026-08-20):** Partially implemented. Integration tests use Fastify's `app.inject` rather than `supertest` (not a dependency). The `tests/integration/`, `tests/support/builders/` and `seed/demo/` directories described below do not exist; tests live alongside the code they cover. Coverage measurement is not configured (`npm run test:coverage` is a placeholder).

## Context

The Platform needs a testing strategy that covers domain logic, application use cases, infrastructure adapters, API endpoints, and UI components. Tests must be reliable, fast enough to run in CI on every PR, and provide meaningful coverage of behavior — not implementation details.

The tool question was settled once [ADR-0022](0022-application-framework.md) chose Vite, which is what this ADR's original reasoning had assumed.

## Decision

### Testing Layers

| Layer                          | Tool                           | Focus                                                                | Environment                                                                                                                                                  |
| ------------------------------ | ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain (unit)                  | Vitest                         | Business rules, invariants, value objects, Result types              | Pure TypeScript, no I/O                                                                                                                                      |
| Application (unit/integration) | Vitest                         | Use cases with mocked ports                                          | Mocked infrastructure                                                                                                                                        |
| Infrastructure (integration)   | Vitest                         | Repository implementations, search adapter, storage adapter          | Test database (SQLite; MariaDB and PostgreSQL from R2 — see dialect matrix below), test S3 (MinIO), real search adapter (Pagefind needs no external service) |
| API (integration)              | Vitest + supertest             | Endpoint behavior, validation, auth                                  | Test database, mocked external services                                                                                                                      |
| UI (component)                 | Vitest + React Testing Library | Component behavior: interactions, states, accessibility              | JSDOM                                                                                                                                                        |
| E2E                            | Playwright                     | Critical user journeys: create project, edit tracking, publish, view | Full stack (test database, test S3, etc.)                                                                                                                    |

### Principles

- Test behavior, not implementation. A test titled "calls the repository" is about implementation. A test titled "returns the tracking with the added property" is about behavior.
- Domain tests have the highest volume; E2E tests have the lowest.
- Infrastructure tests run against real services (a real database, test S3 bucket, a real search index). No mocking at the infrastructure level — it defeats the purpose.

### Database dialect matrix

Since [ADR-0020](0020-database-portability.md) the Platform supports multiple database adapters, so "a real database" means more than one from R2 onward.

| When                              | Dialects                      | Rationale                                                                   |
| --------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| Every pull request                | SQLite                        | Fast, no service container, catches everything that is not dialect-specific |
| Nightly, and before every release | SQLite + MariaDB + PostgreSQL | The only thing that actually verifies portability                           |

The full repository and migration suite runs unchanged against each dialect — no dialect-specific test variants, and no test skipped on a dialect. A test that cannot pass on all supported dialects is evidence that the schema left the portable subset (REQ-FDN-020), and the schema is what gets fixed.

Through R0 and R1 there is exactly one adapter, so this matrix costs nothing until the MariaDB and PostgreSQL adapters land in R2.

- Every bug fix includes a regression test.
- Coverage targets are not a goal. Meaningful coverage is.

### Test Organization

- Unit/component tests: co-located with source files or in `__tests__/` alongside.
- Integration tests: `tests/integration/`.
- E2E tests: `e2e/`.
- Test data builders: `tests/support/builders/`.
- Demo dataset: `seed/demo/`.

### Test data

Both mechanisms below are tool-agnostic; they were settled before the runner was. Neither is a migration: [ADR-0015](0015-schema-migration-strategy.md) keeps structure and data apart, so that a third party upgrading their instance never receives our fixtures.

**1. Builders, for unit, integration and API tests.** Programmatic factories producing a valid entity with sensible defaults and a fluent override for the one field the test actually cares about — `aProject().withGroupingLabel('pilot').build()`. Each test creates the data it needs and nothing more, and cleans up by transaction rollback where the adapter allows it.

The reason to prefer this over a shared dataset is legibility: the precondition of a test is visible inside the test. A test that reads _"given a user with no grant on the project"_ and asserts a 403 says what it means, and stays true regardless of what any shared fixture happens to contain this month.

**2. One demo dataset, for E2E and for local development.** A single versioned, human-readable dataset covering a company, two projects with grouping labels, users at all four roles plus an instance-administration flag holder, a page hierarchy, trackings with applied modules, properties with specific values including placeholders, destinations, one published version and one dirty draft. Loaded by `npm run db:seed:demo` against an empty database.

It earns its keep three times over: E2E journeys start from a realistic state instead of building one through the UI; anyone who clones the repository sees a working product in a minute rather than an empty instance ([M0.6](../product/milestones.md#m06--public-repository-readiness) exit); and it exercises the write path on every run.

**The demo dataset is loaded through the public API, not by direct SQL.** From [M1.2](../product/milestones.md#m12--import-grade-api) the API is complete enough to express it, which makes the seed a second consumer of the same surface the import agent drives ([ADR-0021](0021-agent-driven-migration.md)), and puts `custom_id` idempotency ([REQ-IMP-003](../product/requirements/REQ-IMP.md#req-imp-003--idempotent-upsert-keyed-on-custom_id)) under test on every seed run rather than only in the import suite — re-running the seed must change nothing. Before M1.2 a minimal seed writing through the repository ports is acceptable, and is replaced once the API can carry it.

**Two rules that keep the split from eroding:**

- Unit, integration and API tests never read the demo dataset. If a test needs a company with two projects, it builds one.
- The seed command refuses to run against a non-empty database, and is not reachable in a production configuration. A demo company appearing in an operator's instance is a defect, not a convenience.

### CI Requirements

- All tests must pass before merge.
- Test database is ephemeral (created at start of CI run, destroyed at end).
- Search tests run the default adapter for real: Pagefind needs no account and no network, so search coverage is never skipped in CI ([ADR-0009](0009-search-abstraction.md)). A hosted adapter (R3) would reintroduce a credential-gated suite, and that is a cost to weigh when it is added.

## Alternatives Considered

### Jest instead of Vitest

Rejected. Vitest shares Vite's config and transform pipeline ([ADR-0022](0022-application-framework.md)), so the test runner and the build agree on module resolution, path aliases and TypeScript handling without a second toolchain to keep in sync. It is also ESM-native, which matters because the project is `"type": "module"` and Jest's ESM support remains the awkward path. The API is compatible enough that the choice is reversible if it ever needs to be.

> This rationale was briefly false. Between the two decisions taken on 2026-08-12, the framework was Next.js, under which the Vite argument disappeared and `next/jest` became the first-party path. [ADR-0022](0022-application-framework.md) settled on Vite, restoring it. Recorded because a reader finding the earlier reasoning elsewhere should know which way it went.

### Only E2E tests (no unit tests)

Rejected: slow, flaky, and poor at pinpointing the source of failures. E2E tests are for critical journeys; unit tests are for business rules.

### Mocking everything (including the database in integration tests)

Rejected: infrastructure tests that mock the database test the mock, not the adapter. Real services (test database) catch schema mismatches, query errors, and transaction behavior.

## Related Decisions

- [ADR-0006](0006-layered-architecture.md): Layered Architecture — testing aligns with layers.
- [ADR-0022](0022-application-framework.md): Vite, React Router and Fastify — the stack Vitest and Playwright are configured against.
- [ADR-0011](0011-ui-library-selection.md): shadcn/ui — component tests render owned source, not a vendored library.
- [ADR-0012](0012-data-fetching-strategy.md): TanStack Query — component tests wrap in a `QueryClientProvider` with retries disabled and a fresh client per test, so cache state never leaks between tests.
- [ADR-0015](0015-schema-migration-strategy.md): migrations create structure and never insert data, which is why seeding is specified here.
- D6 and D11 in [decisions](../decisions/README.md).

## Last Responsible Moment

Start of R1 (before significant application code is written) — met. The test infrastructure (Vitest config, Playwright config, test database setup) must be in place during R0.

# Decisions

This directory tracks strategic decisions that do not yet rise to the level of a formal ADR but should be recorded for traceability.

Current outstanding decisions:

| ID | Decision | Status | See |
|---|---|---|---|
| D1 | UI/Design-system library | Pending | [ADR-0011](../adr/0011-ui-library-selection.md) |
| D2 | Data-fetching library | Pending | [ADR-0012](../adr/0012-data-fetching-strategy.md) |
| D3 | Client-side state management | Pending | [ADR-0013](../adr/0013-state-management.md) |
| D4 | Configuration split (env vs DB) | Proposed | [ADR-0014](../adr/0014-configuration-split.md) |
| D5 | Schema migration strategy | Proposed | [ADR-0015](../adr/0015-schema-migration-strategy.md) |
| D6 | Testing tooling (Vitest vs Jest, etc.) | Proposed | [ADR-0017](../adr/0017-testing-strategy.md) |
| D7 | Database portability — SQLite first, MariaDB/PostgreSQL in R2 | Accepted | [ADR-0020](../adr/0020-database-portability.md), supersedes [ADR-0003](../adr/0003-mariadb-single-database.md) |
| D8 | Agent-driven migration instead of a bespoke importer | Accepted | [ADR-0021](../adr/0021-agent-driven-migration.md) |
| D9 | Search default — Pagefind in-process, hosted adapter optional | Accepted | [ADR-0009](../adr/0009-search-abstraction.md) (amended); closes O12, opens O14 |
| D10 | Account lifecycle — env-var first-run bootstrap; instance admin as a capability flag with step-up re-auth | Accepted | [REQ-SEC-013](../product/requirements/REQ-SEC.md), [REQ-SEC-014](../product/requirements/REQ-SEC.md), [REQ-SEC-015](../product/requirements/REQ-SEC.md) |

For all open decisions from the functional specification, see the [spec §21](../product/functional-specification.md) and the [open decisions log](../product/functional-specification.md#21-open-decisions-log).
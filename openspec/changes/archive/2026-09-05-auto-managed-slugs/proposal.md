# Proposal: auto-managed-slugs

## Intent

Project/page slugs are server-generated from the name and regenerate on rename with no redirect; old embedded paths may break (accepted). Records and responses are UUID-only. Company slug unchanged (user-supplied, globally unique).

## Scope

### In Scope

- Create/rename: `slugify(name)` + suffix loop over live slugs only; rename regenerates, old slug abandoned
- Remove `slug` from project/page inputs, records, repository shapes, API responses (literal UUID-only)
- Live slugs internal-only, never serialized; company unchanged; same rule henceforth

### Out of Scope

- Slug-history table, history migration, 308-redirect logic, slug→live→history read path (all dropped)
- Company Zod alignment, slug-addressed routes (deferred)

## Decided (fixed at proposal review)

1. **Rename — DECIDED: "regenerate without redirect".** Old paths may break (accepted).
2. **API responses — DECIDED: "remove entirely".** Records = app types + repository shapes; DB columns stay internal-only.

## Capabilities

### New Capabilities

- `slug-management`: generated slugs, regenerate-on-rename without redirect, UUID-only shapes, company exception

### Modified Capabilities

- None (specs dir empty)

## Approach

Supersedes prior revision: history, redirect map, and history methods removed.
Collision: check live slugs only; hit → suffix, retry. Races → DB unique constraints as backstop.
Read path: all routes already UUID-addressed; no slug resolution at runtime.
Ports (DECIDED NOW): `get…By…Slug` internal-only for the generation collision check; no new history methods, no slug-bearing returns.

## Affected Areas

| Area                           | Impact   | Description                                                                        |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------- |
| schemas, project/page services | Modified | Drop `slug` from inputs/shapes; generate on create, regenerate on rename           |
| repository ports, persistence  | Modified | Internal-only slug lookups for collision check; slug-free types; no migration      |
| routes, tests, docs            | Modified | UUID-only bodies/responses; fixtures drop `slug`; `REQ-FDN-003`/`ADR-0004` wording |

## Risks

| Risk                                        | Likelihood | Mitigation                                                                 |
| ------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Collision-on-regenerate races on live slugs | Med        | Suffix loop; constraints as backstop                                       |
| Response-shape churn for consumers          | High       | UUIDs already canonical on all routes; same-PR updates                     |
| Test churn (fixtures/inputs)                | Med        | Broad but shallow; update in same PR                                       |
| Docs drift (`REQ-FDN-003`, `ADR-0004`)      | Low        | Reword to "system-generated" in same PR                                    |
| 800-line single-PR budget                   | Low        | Simplification eases it: no migration, no redirect logic, no history layer |

## Rollback Plan

Single-PR revert: restore `slug` input/record/response shapes. No migration to roll back.

## Dependencies

- GitHub issue: orchestrator to link per `rules.proposal`
- Base branch: `r1` (verified)

## Success Criteria

- [ ] Create without `slug` works; rename regenerates the slug with no redirect
- [ ] No `slug` in any project/page shape or response; company behavior unchanged
- [ ] `typecheck`, `lint`, `format:check`, `npm test` pass

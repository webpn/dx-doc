# Slug Management Specification

## Purpose

Project and page slugs are system-generated from the name, never user-supplied.
Project/page shapes are UUID-only; the company slug is the sole exception.

## Requirements

### Requirement: Server-generated slug on create

The system MUST derive the slug from the entity name in lowercase-hyphen form
(max 120 chars) and MUST ensure uniqueness within the parent scope (project
scoped to company, page scoped to project). On collision the system MUST append
a numeric suffix and retry against live slugs only. DB unique constraints SHALL
remain the race backstop. No new repository methods; `get…By…Slug` stays
internal-only for the collision check.

#### Scenario: Create generates slug from name

- GIVEN a company with no project named "Checkout Funnel"
- WHEN a project is created with that name and no slug
- THEN the stored slug is derived from the name

#### Scenario: Collision appends suffix

- GIVEN a live project slug `checkout-funnel` in the company
- WHEN another project named "Checkout Funnel" is created in the same company
- THEN its slug is a suffixed, distinct variant

#### Scenario: Uniqueness is parent-scoped

- GIVEN a project slug exists in company A
- WHEN the same name is created in company B
- THEN no suffix is applied

#### Scenario: Empty normalization still yields a valid slug

- GIVEN a name with no slug-safe characters
- WHEN the entity is created
- THEN a valid non-empty slug is still stored

### Requirement: Slug regenerates on rename

When an update changes the entity name, the system MUST regenerate the slug
with the creation rule and abandon the old slug. No history, no redirect; old
embedded paths MAY break (accepted).

#### Scenario: Rename regenerates slug

- GIVEN a project with slug `old-name`
- WHEN its name is updated to "New Name"
- THEN its slug is regenerated from the new name

#### Scenario: Update without rename keeps slug

- GIVEN a project with slug `old-name`
- WHEN an update leaves the name unchanged
- THEN the slug is unchanged

### Requirement: Slug rejected in project/page inputs

Project/page create and update bodies MUST NOT accept `slug`. A body containing
it MUST be rejected with a validation error in the shared validation layer so
every entry point (API, MCP) enforces it.

#### Scenario: Create with slug is rejected

- GIVEN a create body containing `slug`
- WHEN submitted
- THEN the system rejects it with a validation error

#### Scenario: Update with slug is rejected

- GIVEN an update body containing `slug`
- WHEN submitted
- THEN the system rejects it with a validation error

### Requirement: UUID-only project/page shapes

Project/page records, repository shapes, and API request/response bodies MUST
NOT contain `slug`. Routes stay UUID-addressed. DB slug columns are
internal-only and MUST never be serialized.

#### Scenario: API responses carry no slug

- GIVEN an existing project or page
- WHEN read via the API
- THEN the response has the UUID and no `slug`

### Requirement: Company slug exception

Company creation keeps the user-supplied, globally unique slug; its behavior,
constraint, and serialized shape are unchanged.

#### Scenario: Company keeps user-supplied slug

- GIVEN a company body with name and slug
- WHEN submitted
- THEN the company is created with the supplied slug

#### Scenario: Duplicate company slug is rejected

- GIVEN an existing company slug
- WHEN another company uses the same slug
- THEN the system rejects it

### Requirement: Documentation updates in the same PR

The same PR MUST reword REQ-FDN-003 and ADR-0004 from user-supplied to
system-generated slugs for project/page.

#### Scenario: Docs state system-generated

- GIVEN the merged PR
- WHEN REQ-FDN-003 and ADR-0004 are read
- THEN both describe system-generated slugs

### Requirement: Acceptance gates

The change MUST pass `typecheck`, `lint`, `format:check`, and `npm test`.

#### Scenario: Gates are green

- GIVEN the finished change
- WHEN the four gates run
- THEN all pass

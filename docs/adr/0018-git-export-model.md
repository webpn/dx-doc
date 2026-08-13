# ADR-0018: Git Export Model

## Status

Accepted

## Date

2026-08-11

## Context

R2 requires a Git export channel: the project's documentation (development view) is exported as Markdown files to a configurable Git repository, with one commit per publication. This serves as both a distribution channel for developers and a partial backup.

## Decision

**One-way, one-commit-per-publication Git export.**

**How it works:**

- A project is configured with a Git remote URL, branch name, and access token.
- On publication, the export generator:
  1. Clones or pulls the target repository.
  2. Generates Markdown files for all published entities (pages, trackings, properties, free pages — development view only).
  3. Creates a single commit with the commit author set to the editor who published.
  4. Pushes to the remote.
- The commit message includes the version number and optional release notes.
- **No round-trip:** changes made in Git are never imported back into the Platform. This avoids a second source of truth.
- The export is a full snapshot of the published state, not a diff. It replaces all files on each publication.

## Alternatives Considered

### Per-change commits (one commit per entity change)

Rejected: a publication with 50 changed trackings would produce 50 commits. The publication is the meaningful unit of change for consumers.

### Bidirectional sync (import from Git)

Rejected by the spec: "No round-trip import — to avoid a second source of truth." The Platform is the authoritative editor. Git is a distribution channel.

### Store the Git history within the Platform

Rejected: the Platform's versioning model (ADR-0005) already stores full snapshots. The Git export is a separate distribution format, not a duplicate versioning system.

## Consequences

- Manual edits in the Git export are lost on the next publication. This is by design and must be documented clearly for consumers.
- The Git remote must be accessible from the Platform's server. Token-based authentication is the primary mechanism.
- Large projects (thousands of Markdown files) may produce significant commits. This is acceptable.
- The export runs synchronously during publication (blocking the publication until the push succeeds). If Git is unavailable, publication fails — editors can retry. A future enhancement may make the export asynchronous.

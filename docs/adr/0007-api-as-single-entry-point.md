# ADR-0007: REST API as Single Entry Point

## Status
Accepted

## Date
2026-08-11

## Context
The Platform has multiple consumers: the React web UI, the MCP server (for AI agents), export generators (static site, Confluence, PDF, Excel, git), and eventually a public API for third-party consumers. If each consumer interacts with the backend through a different path, validation, authorization, and business rules will diverge.

## Decision
**The REST API is the single entry point for all operations.** Every consumer — including the web UI and the MCP server — goes through the same REST API endpoints.

**How it works:**
- The REST API layer contains all validation, authentication, and authorization logic.
- The web UI calls the REST API from the browser.
- The MCP server calls the REST API internally (not through HTTP — through direct function calls to the same application services, but going through the same validation pipeline).
- Export generators call the REST API (internally during publication, or as scheduled jobs).
- The documented public API (R3) is the same set of endpoints, with documentation and stable versioning.

## Alternatives Considered

### Separate internal API and public API
Rejected: maintaining two APIs that do the same thing with different contracts is wasteful. The spec is clear that the public API should not be a separate implementation.

### GraphQL
Rejected: adds complexity (schema definition, resolver patterns, N+1 mitigation) without proportional benefit. The Platform's data access patterns are well-understood (list entities in a project, get entity detail, search). REST with good endpoint design suffices.

### MCP server as a direct backend entry point (bypassing the API)
Rejected: would create two validation paths. The spec requires that all validation rules are shared by every entry point. The MCP server must call the same validation logic as the REST API.

## Consequences
- A single validation pipeline. Rules enforced through the UI are equally enforced through MCP and the public API.
- The API is versioned from the start (though public documentation arrives in R3).
- The web UI is "just another client." This constraint pays off when adding the MCP server (R3) and the public API (R3) — both are consumers of an already-existing API, not new development.
- API design must consider all consumers from R0, not just the web UI. This is slightly more work upfront but avoids redesign later.
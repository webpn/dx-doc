# ADR-0006: Layered Architecture with Ports and Adapters

## Status
Accepted

## Date
2026-08-11

## Context
The Platform is a complex, long-lived application with multiple consumers (web UI, MCP server, export generators), multiple external dependencies (database, search, storage, authentication providers, analytics APIs), and a requirement to be deployable by third parties with potentially different infrastructure choices.

A well-defined architecture with clear boundaries is needed to:
- Keep business logic independent of UI and infrastructure.
- Allow infrastructure implementations to be swapped (e.g., a self-hostable search adapter later).
- Enable domain logic to be tested without infrastructure.
- Provide predictable structure for AI coding agents.

## Decision
A **layered architecture** inspired by Clean Architecture and Ports & Adapters, adapted pragmatically for TypeScript/React:

```
UI (React) → Application (use cases, ports) → Domain (entities, rules)
                     ↑
              Infrastructure (adapters)
```

**Key rules:**
1. Domain has no dependencies on UI or Infrastructure. Pure TypeScript.
2. Application depends on Domain and defines port interfaces that Infrastructure implements.
3. Infrastructure implements ports. Infrastructure code is never imported by Domain or Application.
4. UI depends on Application and Design System. UI never imports Infrastructure directly.
5. The REST API layer wires everything together — it depends on Application and Infrastructure.

**What we do NOT do:**
- Create interfaces for every class (interfaces are for architectural boundaries).
- Create use-case classes for simple CRUD (use cases are for operations with business rules).
- Create DTOs that are identical to domain types (mapping is for different semantics).
- Separate commands and queries into different buses unless complexity warrants it.

## Alternatives Considered

### Monolithic "Rails-style" MVC
Rejected: couples business logic to the framework. Makes it hard to add the MCP server as a second consumer, hard to swap infrastructure, and hard for AI agents to understand what lives where.

### Full DDD with aggregates, repositories, domain events
Rejected: over-engineered for this domain. The Platform's entities are mostly CRUD with some business rules around property composition, module propagation, and versioning. Full DDD adds ceremony without proportional value.

### Microservices
Rejected: the Platform is a single application with modest scale requirements (≤50 concurrent viewers). Microservices would add operational complexity (service discovery, inter-service communication, distributed transactions) with no benefit at this scale.

## Consequences
- Every new developer (and AI agent) knows exactly where to put code: domain rules in `src/domain/`, use cases in `src/application/`, API calls in `src/infrastructure/api-client/`.
- Testing domain logic requires no infrastructure setup — just pure TypeScript tests.
- Swapping an infrastructure implementation (e.g., the search adapter, as ADR-0009 in fact did) requires changing only the adapter in `src/infrastructure/`.
- The UI can be developed against mock application services before the API is ready.
- The layering adds some boilerplate (port interfaces, dependency wiring). This is accepted as the cost of long-term maintainability.
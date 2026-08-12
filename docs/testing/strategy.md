# Testing Strategy

See [ADR-0017: Testing Strategy](../adr/0017-testing-strategy.md) for the formal decision and rationale.

## Test Layers

| Layer | Tool | Focus | Directory |
|---|---|---|---|
| Domain (unit) | Vitest | Business rules, invariants, value objects | Co-located with source |
| Application (unit/integration) | Vitest | Use cases with mocked ports | Co-located |
| Infrastructure (integration) | Vitest | Repositories, search, storage | `tests/integration/` |
| API (integration) | Vitest + supertest | Endpoints, validation, auth | `tests/integration/api/` |
| UI (component) | Vitest + React Testing Library | Component behavior | Co-located |
| E2E | Playwright | Critical user journeys | `e2e/` |

## Running Tests

```bash
# All unit and integration tests
npm test

# Watch mode (development)
npm run test:watch

# E2E tests
npm run test:e2e

# With coverage report
npm run test:coverage
```

## Test Patterns

### Domain Test Example

```typescript
describe('Tracking', () => {
  it('detaches module when all its properties are individually removed', () => {
    const tracking = createTracking({ name: 'Test' });
    const module = createModule({ name: 'Standard Actions', properties: ['action_name', 'action_type'] });

    tracking.addModule(module);
    tracking.removeProperty('action_name');
    tracking.removeProperty('action_type');

    expect(tracking.modules).toHaveLength(0);
  });
});
```

### Component Test Example

```typescript
describe('TrackingDetail', () => {
  it('shows conflict warning when record was modified externally', async () => {
    render(<TrackingDetail trackingId="123" />);

    // Simulate external modification notification
    act(() => { /* trigger conflict state */ });

    expect(screen.getByRole('alert')).toHaveTextContent('modified by another user');
  });
});
```

### API Integration Test Example

```typescript
describe('POST /projects/:id/trackings', () => {
  it('rejects when required properties are missing', async () => {
    const response = await request(app)
      .post('/projects/proj-1/trackings')
      .send({ name: 'Test' }) // missing pageId
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## Test Database

Integration tests that touch the database use an ephemeral database:
- CI: SQLite (no service container). MariaDB and PostgreSQL join the nightly matrix from R2 — see [ADR-0017](../adr/0017-testing-strategy.md).
- Local: a separate test database (`dxdoc_test`) — run migrations before tests

Tests are responsible for their own data setup and cleanup. Use transactions where possible for isolation.

## E2E Tests

Critical user journeys covered by Playwright:

1. **Create and publish a project:**
   - Admin creates a company → creates a project → editor adds a page → adds a tracking → publishes version 1 → viewer sees the published documentation.

2. **Import:**
   - Run an import script against the API → verify pages, trackings, and properties are present, and that a second run creates no duplicates.

3. **Edit conflict:**
   - Two editors open the same tracking → one saves → the other tries to save → sees conflict message.

4. **Publication and changelog:**
   - Editor makes several changes → publishes → verifies the changelog lists all changes.

5. **Shared password access:**
   - Anonymous user accesses a project with a shared password → sees the documentation → cannot access non-publishable pages.

## CI

All tests run on every PR and push to `main`. See `.github/workflows/ci.yml`.

## Coverage

Coverage is measured but no arbitrary threshold is enforced. Focus coverage on:
- Domain logic (high value, easy to test)
- Application use cases (orchestration and policies)
- API validation (catches regressions)

Do not optimize for coverage percentage. A test that adds no confidence is worse than no test.
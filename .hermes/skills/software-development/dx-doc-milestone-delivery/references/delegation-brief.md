# Delegation Brief

Fill every field. Send one unit per delegation. The worker is small: concrete paths beat descriptions, and anything you leave implicit will be invented.

---

**REPO:** `~/websites/dx-doc`, branch `r1`. Read `AGENTS.md` first — its rules bind you.

**UNIT:** Add audit log entries for all entity create/update/delete operations in TrackingService

**PART OF:** M1.14 — Write integrity, audit and publication correctness, delivering REQ-SEC-006 (audit coverage for entity lifecycle)

**FILES YOU WILL CHANGE:**

- `src/application/tracking/tracking-service.ts` — add `appendLog` calls to all create/update/delete methods
- `src/application/tracking/tracking-service.test.ts` — add tests proving each event class is logged

**FILES TO READ FIRST:**

- `src/application/tracking/tracking-service.ts` — the full service (2216 lines) to see all create/update/delete methods
- `src/application/tracking/tracking-service.test.ts` — existing test patterns for audit log
- `src/application/ports/tracking-repositories.ts` — AuditLogRepository interface
- `src/domain/entities.ts` — AuditLogEntry interface (line 227)
- `src/application/auth/permissions.ts` — PermissionService for action names

**CONTEXT YOU WILL NOT DISCOVER BY SEARCHING:**

1. **TrackingService constructor arity (15 positional args in order):** properties, modules, destinations, navEvents, trackings, templates, freePages, flows, triggers, versions, sharedPasswords, auditLogs, passwordHasher, projects, permissions. This exact order must be used when instantiating in tests.

2. **AuditLogEntry shape:** `{ id, companyId, projectId: string | null, actorId, action, entityType, entityId: string | null, details?: Record<string, unknown> | null, createdAt, actorKind?: 'session' | 'service_token' }` — `actorKind` defaults to 'session'.

3. **Action naming convention:** Use `<entity>.<action>` format: `property.created`, `property.updated`, `property.deleted`, `module.created`, `module.updated`, `module.deleted`, `destination.created`, `destination.updated`, `destination.deleted`, `navigation_event.created`, `navigation_event.updated`, `navigation_event.deleted`, `tracking_template.created`, `tracking_template.updated`, `tracking_template.deleted`, `free_page.created`, `free_page.updated`, `free_page.deleted`, `tracking.created`, `tracking.updated`, `tracking.deleted`, `tracking_property.presence_updated`, `specific_value.created`, `specific_value.deleted`, `module_applied_to_tracking`, `module_removed_from_tracking`, `flow.created`, `flow.updated`, `flow.deleted`, `trigger.created`, `trigger.updated`, `trigger.deleted`, `version.published`.

4. **Company ID resolution:** For project-scoped entities, get companyId from the entity's `companyId` field. For catalogue entities (projectId === null), the companyId is already on the entity. Never trust the URL's companyId — always read from the stored record (REQ-SEC-018).

5. **`this.now()` and `this.newId()`** are available on the service for timestamps and IDs.

6. **Permission actions** are strings like `'project.edit'`, `'company.manage_catalogue'` — these are already checked before the create/update/delete, so audit log calls go after successful persistence.

7. **Test pattern:** Look at existing tests in `tracking-service.test.ts` — they use `createTestComposition()` which returns a fully wired TrackingService with in-memory repositories. Add audit assertions after each create/update/delete call.

**RULES:**

- Match the patterns in the files you read. Do not introduce a new abstraction.
- Domain and application code must not import React or `@project/infrastructure`.
- Routes are transport only: HTTP in, application-service call, HTTP out. No business rule and no validation rule in a route file.
- Validation rules go in `src/application/validation/schemas.ts` and are invoked through `validate()`.
- Migrations are forward-only, `down()` rejects, no data inserted, and every new table ships its indexes.
- Do not edit anything under `docs/`, `README.md`, or any `*.md` file.
- Do not run `npm ci`, `npm install`, or any docker command.

**COMMANDS TO RUN, in this order, all four must pass:**

```
npm run typecheck && npm run lint && npm run format:check && npm test
```

Fix what you break. Do not finish with any check red. Do not lower the test count.

**ACCEPTANCE FOR THIS UNIT:** Every entity create/update/delete method in TrackingService appends an audit log entry; tests prove each event class (property, module, destination, navigation_event, tracking_template, free_page, tracking, tracking_property.presence, specific_value, module_applied_to_tracking, flow, trigger, version) is logged with correct action, entityType, entityId, companyId, projectId, actorId.

**REPORT BACK:**

1. Files changed, with a one-line reason each.
2. The exact commands you ran and their results.
3. Anything you could not do, and why.
4. Anything you changed that was not in the file list above.

Do not commit. Do not explain the plan — implement it.

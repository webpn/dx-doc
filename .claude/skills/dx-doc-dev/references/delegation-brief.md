# Delegation Brief

Fill every field before dispatching. One unit per `Agent` call — the subagent starts with no memory of
this conversation, so anything left implicit gets invented rather than looked up. Use it as the `prompt`:

```
Agent({
  prompt: <this filled-in brief>,
  model: "haiku",        // pattern-following (SKILL.md §6) — omit, or use "sonnet"/"opus", for judgment-required
  subagent_type: "general-purpose",
})
```

---

**REPO:** this working directory, branch `<branch>`. Read `AGENTS.md` first — its rules bind you.

**UNIT:** `<one-sentence scope>`

**PART OF:** `<milestone/REQ this delivers>`

**FILES YOU WILL CHANGE:**

- `<path>` — `<what changes and why>`

**FILES TO READ FIRST:**

- `<path>` — `<why it matters>`

**CONTEXT YOU WILL NOT DISCOVER BY SEARCHING:**

The facts a grep won't surface: exact function/constructor signatures, exact type shapes, naming
conventions, a security rule (cite the `REQ-*`), a helper already available on the class, an ordering
constraint, the test-composition helper to use. Illustrative example of the level of detail expected —
replace with what actually applies to this unit, don't ship these verbatim:

1. **Constructor arity, in order:** `properties, modules, destinations, ..., permissions` — instantiate
   test doubles in exactly this order.
2. **Company ID resolution:** for project-scoped entities, read `companyId` from the stored record,
   never from the request/URL (REQ-SEC-018).
3. **Test pattern:** existing tests use `createTestComposition()` — a fully wired service backed by
   in-memory repositories.

**RULES:**

- Match the patterns in the files you read. Do not introduce a new abstraction.
- Domain and application code must not import React or infrastructure (SKILL.md §1).
- Routes are transport only: HTTP in, application-service call, HTTP out (SKILL.md §1).
- Do not edit anything under `docs/`, `README.md`, or any `*.md` file, unless the unit itself is
  documentation.
- Do not run `npm ci`, `npm install`, or any docker command.
- Do not commit.

**COMMANDS TO RUN, in this order, all must pass:**

```bash
npm run lockfile:check && npm run typecheck && npm run lint && npm run format:check && npm test
```

Fix what you break. Do not finish with any check red. Do not lower the test count.

**ACCEPTANCE FOR THIS UNIT:** `<concrete, checkable condition>`

**REPORT BACK:**

1. Files changed, with a one-line reason each.
2. The exact commands run and their results.
3. Anything you could not do, and why.
4. Anything changed that was not in the file list above.

Do not explain the plan — implement it.

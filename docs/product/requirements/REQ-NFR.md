# REQ-NFR — Non-Functional Requirements

Performance, availability, client support, internationalisation and observability. Source: [functional specification](../functional-specification.md) §15.

Entry format and status legend: [requirements index](README.md).

> These are **verified continuously, not delivered once**. Each has a milestone at which it first becomes measurable; from that point it is a standing acceptance condition for every later milestone, not a task that completes.

| ID          | Requirement                                  | Target | First measurable | Status      |
| ----------- | -------------------------------------------- | ------ | ---------------- | ----------- |
| REQ-NFR-001 | Open a tracking page                         | < 2 s  | M1.5             | Not Started |
| REQ-NFR-002 | Full-text search                             | < 4 s  | M1.7             | Not Started |
| REQ-NFR-003 | Generate a diff between versions             | < 6 s  | M1.8             | Not Started |
| REQ-NFR-004 | Load a very large project                    | < 3 s  | M1.6             | Not Started |
| REQ-NFR-005 | Architecture must not require redundancy     | —      | R1               | Not Started |
| REQ-NFR-006 | Backup is the operator's responsibility      | —      | M2.6             | Not Started |
| REQ-NFR-007 | Desktop only; no responsive layout           | —      | M1.5             | Not Started |
| REQ-NFR-008 | Browser support `browserslist >5%`           | —      | M0.1             | Not Started |
| REQ-NFR-009 | No offline mode                              | —      | —                | Accepted    |
| REQ-NFR-010 | English by default, with translation support | —      | M1.5             | Not Started |
| REQ-NFR-011 | Content is single-language                   | —      | M1.1             | Not Started |
| REQ-NFR-012 | Localised date and number formats            | —      | M1.5             | Not Started |
| REQ-NFR-013 | WCAG AA as a design principle, not a gate    | —      | — (review only)  | Accepted    |
| REQ-NFR-014 | Observability sufficient for troubleshooting | —      | M1.9             | Not Started |

---

### REQ-NFR-001 … REQ-NFR-004 — Performance targets

**Must** · R1 · spec §15.1 · **Not Started**

| Operation                        | Target | Measured at |
| -------------------------------- | ------ | ----------- |
| Open a tracking page             | < 2 s  | M1.5        |
| Full-text search                 | < 4 s  | M1.7        |
| Generate a diff between versions | < 6 s  | M1.8        |
| Load a very large project        | < 3 s  | M1.6        |

**Acceptance**

- Targets are measured against **pilot-scale data** — thousands of trackings and ~200 properties in one project — not against a seeded fixture. The pilot import ([M1.4](../milestones.md)) is what makes this possible, and is a second reason to run it early.
- A regression past a target fails CI or is recorded as an accepted exception with a reason.

> REQ-NFR-004 is measured at M1.6, not earlier: the data arrives at M1.4, but the page hierarchy and sidebar that constitute "loading a project" for a user do not exist until M1.6. Measuring it against an API response before then would be measuring something else and calling it this.

### REQ-NFR-005 — Architecture must not require redundancy

**Must** · R1 · spec §15.2 · **Not Started**

The Platform must be operable to roughly 99% availability by a single instance with no redundancy — no clustering requirement, no leader election, no assumption of more than one running process. The Platform is not business-critical, and this ceiling is deliberate.

**The SLA itself is not a property of the software.** Availability is a property of a deployment, so the SLA of any given instance is its operator's commitment, not the Platform's — the same division REQ-NFR-006 already applies to backup. The corporate pilot's 99% target is recorded in [deployment.md](../../architecture/deployment.md).

**Acceptance**

- Nothing in the architecture requires a second instance to function correctly — scheduled work, index rebuilds (REQ-FDN-007) and migrations (REQ-FDN-009) are all safe on a single process.
- Raising the expectation above this ceiling means revisiting the deployment model, and is a decision rather than a configuration change.

### REQ-NFR-006 — Backup is the operator's responsibility

**Must** · R1 · spec §15.2 · **Not Started**

The Platform provides no backup mechanism. Whoever operates the database owns backup. The git export (REQ-VIEW-005) constitutes a partial, human-readable off-site copy from R2 — the only thing resembling a backup the product itself offers.

**Acceptance**

- The README states this plainly, alongside the mandatory pre-upgrade backup step (REQ-FDN-009).
- No documentation implies the Platform backs anything up.
- The reference deployment stack demonstrates a file-level snapshot of the SQLite database (REQ-FDN-012).

> **Sharper through R1 than the specification anticipated.** With SQLite as the only adapter ([ADR-0020](../../adr/0020-database-portability.md)), no backup mechanism, and no git export until R2, the pilot's entire imported content lives in a single file for roughly six weeks — after an import that cost real editorial effort to verify. The mitigation is cheap and belongs in R0: show the snapshot in the reference stack and say plainly in the README that it is the operator's job.

### REQ-NFR-007 — Desktop only; no responsive layout

**Must** · R1 · spec §15.3 · **Not Started**

Desktop is essential; 99% of client usage. Mobile and responsive layouts are not a requirement and are out of scope.

### REQ-NFR-008 — Browser support `browserslist >5%`

**Must** · R0 · spec §15.3 · **Not Started**

Set in build configuration at M0.1 so it constrains the toolchain from the start rather than being discovered later.

### REQ-NFR-009 — No offline mode

**Won't** · spec §15.3 · **Accepted**

PDF export (REQ-VIEW-006) covers disconnected consultation.

### REQ-NFR-010 — English by default, with translation support

**Must** · R1 · spec §15.4 · **Not Started**

Interface language is English by default (`APP_DEFAULT_LOCALE`, used before any company context exists), with translation support. Each company sets which locales it supports and its default among them ([ADR-0014](../../adr/0014-configuration-split.md)); the user profile then picks a language from the company's supported set.

**Acceptance**

- No user-facing string is hard-coded outside the translation mechanism, including error messages surfaced from the API.
- A user's profile locale is restricted to their company's supported-locales list; narrowing that list does not silently reassign users already set to a locale being removed.

### REQ-NFR-011 — Content is single-language

**Must** · R1 · spec §15.4 · **Not Started**

The documentation itself is not multilingual. The data model carries no per-language content variants, and this is a deliberate exclusion rather than an omission: adding it later is a model change, so it should be reopened explicitly if ever needed.

### REQ-NFR-012 — Localised date and number formats

**Must** · R1 · spec §15.4 · **Not Started**

Formats derive from the user profile locale, independently of content language.

### REQ-NFR-013 — WCAG AA as a design principle, not a gate

**Should** · R1 · spec §15.4 · [ADR-0011](../../adr/0011-ui-library-selection.md) · **Accepted** · Issue: — · PR: —

**Reversed on 2026-08-12.** This entry previously read _"No WCAG compliance required"_ and was a `Won't`. The interface is now built to WCAG AA: semantic HTML, keyboard operability for every interactive element, focus management, accessible names, AA contrast carried by the design tokens, and `prefers-reduced-motion`. The rules are in [ENGINEERING_GUIDE.md](../../../ENGINEERING_GUIDE.md#accessibility) and the [ADR-0011](../../adr/0011-ui-library-selection.md) choice is what makes them cheap — Radix supplies the keyboard and ARIA behaviour, and keeping the copied components close to upstream is what keeps it.

**What this deliberately is not.** There is no automated accessibility check in CI, no audit, and no conformance claim. Nothing in the build fails when the principle is broken, so it holds exactly as long as review holds it. That is the accepted position, recorded plainly so a later _"are we WCAG AA?"_ gets the honest answer — **built to it, not verified against it** — instead of an inherited assumption.

Revisit if a public-sector deployer or a customer requiring a conformance statement appears. The work would then be axe-core in the component and E2E suites, manual criteria including screen-reader passes, and a published statement. None of it is in any current milestone, and the estimate is not free.

### REQ-NFR-014 — Observability sufficient for troubleshooting

**Should** · R1 · spec §15.5 · **Not Started**

Basic parameters through an error-tracking service (REQ-FDN-014). **No product analytics is collected on the Platform itself** — a documentation tool for analytics that instruments its own users would be an awkward position to defend, and it is not needed.

# REQ-NFR — Non-Functional Requirements

Performance, availability, client support, internationalisation and observability. Source: [functional specification](../functional-specification.md) §15.

Entry format and status legend: [requirements index](README.md).

> These are **verified continuously, not delivered once**. Each has a milestone at which it first becomes measurable; from that point it is a standing acceptance condition for every later milestone, not a task that completes.

| ID | Requirement | Target | First measurable | Status |
|---|---|---|---|---|
| REQ-NFR-001 | Open a tracking page | < 2 s | M1.3 | Not Started |
| REQ-NFR-002 | Full-text search | < 4 s | M1.5 | Not Started |
| REQ-NFR-003 | Generate a diff between versions | < 6 s | M1.6 | Not Started |
| REQ-NFR-004 | Load a very large project | < 3 s | M1.2 | Not Started |
| REQ-NFR-005 | Availability | SLA 99% | R1 | Not Started |
| REQ-NFR-006 | Backup is the operator's responsibility | — | M2.6 | Not Started |
| REQ-NFR-007 | Desktop only; no responsive layout | — | M1.3 | Not Started |
| REQ-NFR-008 | Browser support `browserslist >5%` | — | M0.1 | Not Started |
| REQ-NFR-009 | No offline mode | — | — | Accepted |
| REQ-NFR-010 | English by default, with translation support | — | M1.3 | Not Started |
| REQ-NFR-011 | Content is single-language | — | M1.1 | Not Started |
| REQ-NFR-012 | Localised date and number formats | — | M1.3 | Not Started |
| REQ-NFR-013 | No WCAG compliance required | — | — | Accepted |
| REQ-NFR-014 | Observability sufficient for troubleshooting | — | M1.7 | Not Started |

---

### REQ-NFR-001 … REQ-NFR-004 — Performance targets

**Must** · R1 · spec §15.1 · **Not Started**

| Operation | Target | Measured at |
|---|---|---|
| Open a tracking page | < 2 s | M1.3 |
| Full-text search | < 4 s | M1.5 |
| Generate a diff between versions | < 6 s | M1.6 |
| Load a very large project | < 3 s | M1.2 |

**Acceptance**
- Targets are measured against **pilot-scale data** — thousands of trackings and ~200 properties in one project — not against a seeded fixture. The pilot import (M1.2) is what makes this possible, and is a second reason to run it early.
- A regression past a target fails CI or is recorded as an accepted exception with a reason.

### REQ-NFR-005 — Availability, SLA 99%

**Must** · R1 · spec §15.2 · **Not Started**

The Platform is not business-critical. 99% is deliberate: it permits a maintenance approach that does not require redundancy, and it should not be quietly raised without revisiting the deployment model.

### REQ-NFR-006 — Backup is the operator's responsibility

**Must** · R1 · spec §15.2 · **Not Started**

The Platform provides no backup mechanism. Whoever operates the database owns backup. The git export (REQ-VIEW-005) constitutes a partial, human-readable off-site copy from R2 — the only thing resembling a backup the product itself offers.

**Acceptance**
- The README states this plainly, alongside the mandatory pre-upgrade backup step (REQ-FDN-009).
- No documentation implies the Platform backs anything up.

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

Interface language is English by default (`APP_DEFAULT_LOCALE`), with translation support; the language is set in the user profile.

**Acceptance**
- No user-facing string is hard-coded outside the translation mechanism, including error messages surfaced from the API.

### REQ-NFR-011 — Content is single-language

**Must** · R1 · spec §15.4 · **Not Started**

The documentation itself is not multilingual. The data model carries no per-language content variants, and this is a deliberate exclusion rather than an omission: adding it later is a model change, so it should be reopened explicitly if ever needed.

### REQ-NFR-012 — Localised date and number formats

**Must** · R1 · spec §15.4 · **Not Started**

Formats derive from the user profile locale, independently of content language.

### REQ-NFR-013 — No WCAG compliance required

**Won't** · spec §15.4 · **Accepted**

No WCAG or public-sector accessibility compliance is required. Recorded explicitly so it is a known position rather than an unexamined gap — relevant to reconsider if the open-source distribution reaches public-sector deployers.

### REQ-NFR-014 — Observability sufficient for troubleshooting

**Should** · R1 · spec §15.5 · **Not Started**

Basic parameters through an error-tracking service (REQ-FDN-014). **No product analytics is collected on the Platform itself** — a documentation tool for analytics that instruments its own users would be an awkward position to defend, and it is not needed.

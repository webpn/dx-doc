# REQ-DQ — Data Quality and Deferred Modules

Modules defined in principle and deliberately excluded from current release scope. Source: [functional specification](../functional-specification.md) §14, §19.10.

Entry format and status legend: [requirements index](README.md). Nothing here has acceptance criteria yet — for R4 they follow from closing O4 and O5; for R5 and R6 the requirements themselves are placeholders, and assigning IDs to undefined scope would be false precision.

| ID         | Requirement                                      | MoSCoW               | Rel.    | Milestone | Status      |
| ---------- | ------------------------------------------------ | -------------------- | ------- | --------- | ----------- |
| REQ-DQ-001 | Analytics platform integrations                  | Could                | R4      | M4.1      | Not Started |
| REQ-DQ-002 | Data-quality signals                             | Could                | R4      | M4.2      | Not Started |
| REQ-DQ-003 | Conformance reports, no persisted state          | Could                | R4      | M4.2      | Not Started |
| REQ-DQ-004 | Semantic layer exports (OWL / RDF / SKOS)        | Won't (this release) | Backlog | —         | Not Started |
| REQ-DQ-005 | Business metrics, dimensions, certified segments | Won't (this release) | Backlog | —         | Not Started |
| REQ-DQ-006 | Business glossary                                | Won't (this release) | Backlog | —         | Not Started |
| REQ-DQ-007 | Tracking implementation status                   | Won't (this release) | Backlog | —         | Not Started |
| REQ-DQ-008 | Insights repository                              | Won't (this release) | Backlog | —         | Not Started |

---

### REQ-DQ-001 — Analytics platform integrations

**Could** · R4 · [M4.1](../milestones.md#m41--analytics-platform-integrations) · spec §14.1 · **Not Started** · Issue: — · PR: —

Read access to Adobe Analytics / CJA, GA4 and PostHog through service accounts injected as environment variables (`ADOBE_*`, `GA4_*`, `POSTHOG_*`).

**Nothing is imported from these platforms into the documentation.** The integration exists solely to produce data-quality signals.

**Blocked by:** open decision O5 — the verification module's scope. **Start the access-provisioning request during R2** (risk R8): provisioning routinely takes longer than the development.

### REQ-DQ-002 — Data-quality signals

**Could** · R4 · [M4.2](../milestones.md#m42--signals-and-conformance-reports) · spec §14.1 · **Not Started** · Issue: — · PR: —

Top N values over the last 30 days; daily trend of occurrences; percentage of null or non-conformant values. Segmented by environment (dev/qa/prod) and by platform. Daily cache with on-demand refresh when changes concern the development environment.

Not required: proactive alerting; signals from session-replay or feedback tools.

### REQ-DQ-003 — Conformance reports, no persisted state

**Could** · R4 · [M4.2](../milestones.md#m42--signals-and-conformance-reports) · spec §14.1, §14.4 · **Not Started** · Issue: — · PR: —

An a posteriori conformance report per tracking, comparing documented expectations against observed data.

**The outcome is a report, not a state.** Someone runs a check, reads the result, and acts outside the Platform. Implementation status is deferred to R6 (REQ-DQ-007), deliberately, so that R4 does not have to introduce a lifecycle model. Until then the documentation describes intent rather than reality — a known, accepted limitation.

**Blocked by:** open decision O4. Conformance checking is mechanical for `is` and `is set` conditions (REQ-DOM-012) and only approximate against placeholder-bearing values (REQ-DOM-010). Either accept the partial coverage, or revisit specification §6.8 **before R4 begins** — not during.

### REQ-DQ-004 — Semantic layer exports (OWL / RDF / SKOS)

**Won't (this release)** · Backlog · — · spec §14.2 · **Not Started** · Issue: — · PR: —

Export in OWL, RDF and ISO 25964 formats for the corporate semantic layer.

**Waits on:** open decision O1 — ontology classes, IRI scheme, export formats, and the actual consumer in the data warehouse. Scope is undefined until O1 closes, which must happen **before the end of R2**. Not blocked — deferred until then.

Three precautions already ship so that R5 does not force a data-model migration: immutable identifiers (REQ-FDN-004), `business_label` (REQ-DOM-005), and company-defined custom fields (REQ-DOM-014). They defer the cost; they do not remove it.

### REQ-DQ-005 — Business metrics, dimensions, certified segments

**Won't (this release)** · Backlog · — · spec §14.2 · **Not Started** · Issue: — · PR: —

Documentation of business metrics and dimensions, not only technical properties. Certified segments and metrics capture _how analyses should be performed_, serving both AI interpretation and analysts. Gains substance together with the container entities (REQ-DOM-025).

**Waits on:** open decision O1 (semantic layer ontology and IRIs). Not blocked — deferred.

### REQ-DQ-006 — Business glossary

**Won't (this release)** · Backlog · — · spec §14.2 · **Not Started** · Issue: — · PR: —

A glossary distinguishing technical property names from business-readable labels, built on `business_label` (REQ-DOM-005).

**Waits on:** open decision O2 — how technical name and business label relate, and what else the glossary needs. Not blocked — deferred.

### REQ-DQ-007 — Tracking implementation status

**Won't (this release)** · Backlog · — · spec §14.4 · **Not Started** · Issue: — · PR: —

A lifecycle state on each tracking: documented → in development → released → verified → deprecated. Gives conformance results (REQ-DQ-003) somewhere to persist, and gives a product manager a view of what is implemented rather than merely specified.

### REQ-DQ-008 — Insights repository

**Won't (this release)** · Backlog · — · spec §14.5 · **Not Started** · Issue: — · PR: —

Analysed data → analysis methodology → insights obtained → follow-up analyses → actions taken. Builds on the semantic layer and doubles as a product-discovery instrument.

Treated as a **separate product on the same foundation**: it has its own data model and its own users. It is not scoped here, and the [vision](../vision.md) records it as a candidate direction rather than a commitment.

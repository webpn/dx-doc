# User Stories

What each persona is trying to get done, in their words, and which requirements make it possible. Stories exist to drive development and to test the product vision: a release is only finished when the people it was for can complete their job end to end.

**Related:** [personas](personas.md) · [vision](vision.md) · [requirements index](requirements/README.md) · [milestones](milestones.md) · [scope](scope.md)

## How to read this

A story is a job, not a feature. Requirements say what the system must do; a story says who is trying to do what, and why — which is what makes it possible to ask _"can this persona actually finish?"_ at a release gate, rather than only _"is every requirement implemented?"_.

Stories are **grouped by release, then by the milestone that delivers them, then by persona**, so this document reads in delivery order and can be picked up milestone by milestone. The [index by persona](#index-by-persona) gives the other axis: everything one persona is waiting for, in one list.

```markdown
#### US-XXX-NN — Short title · _Persona_

**As a** persona **I want** capability **so that** outcome.

Requirements that satisfy it

**Done when** — the observable end state, from the persona's side.
```

- **IDs are permanent**, like requirement IDs. A story that moves release or milestone keeps its ID.
- **Stories do not replace requirements.** Where a story is satisfied, its requirements are authoritative on detail and acceptance. The story is the reason they exist.
- **A story spanning two milestones is placed at the one where it first becomes usable**, with the continuation named.
- **A `Gap` story carries no requirement** — a job a persona plainly needs to do, for which nothing in the requirement set is responsible. There are none at present. When one appears it is a signal to write the requirement, not to quietly drop the story.
- **Enabling requirements have no story, by design.** Layer boundaries ([REQ-FDN-001](requirements/REQ-FDN.md#req-fdn-001--layered-architecture-with-enforced-boundaries)), immutable identifiers ([REQ-FDN-004](requirements/REQ-FDN.md#req-fdn-004--immutable-internal-identifiers)), shared validation ([REQ-FDN-010](requirements/REQ-FDN.md#req-fdn-010--server-side-validation-shared-by-ui-api-and-mcp)), portable SQL ([REQ-FDN-020](requirements/REQ-FDN.md#req-fdn-020--schema-constrained-to-a-portable-sql-subset)), the API as single entry point ([REQ-API-001](requirements/REQ-API.md#req-api-001--internal-rest-api-as-the-single-entry-point)), server-side permission enforcement ([REQ-SEC-011](requirements/REQ-SEC.md#req-sec-011--permission-matrix-enforced-server-side)) and the [non-functional set](requirements/REQ-NFR.md) are constraints on how every story is built. A constraint with no story is healthy; a _feature_ with no story is a question.

## Personas and their prefixes

| Prefix     | Persona                                                                                                                                                                                                                                  | Stories |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **US-EDT** | Tracking specialist / analytics engineer — the editor who owns the documentation                                                                                                                                                         | 27      |
| **US-ANL** | Digital analyst                                                                                                                                                                                                                          | 8       |
| **US-DEV** | Web / app developer                                                                                                                                                                                                                      | 8       |
| **US-BUS** | Business user / product manager                                                                                                                                                                                                          | 6       |
| **US-DSG** | Designer                                                                                                                                                                                                                                 | 3       |
| **US-ADM** | Administration — the **company admin** inside one company, the **system administrator** across the deployment, and the Project Manager where access management is concerned. The prefix predates the split; each story names its persona | 10      |
| **US-AGT** | AI agent over MCP, and the editor accountable for what it writes                                                                                                                                                                         | 7       |
| **US-OPS** | System administrator / operator — runs an instance, corporate or otherwise                                                                                                                                                               | 7       |

## Epics

Epics cut across releases; the delivery grouping below cuts across epics. Both views are useful, so the epic is named on each story rather than used as the structure.

| Epic                                         | The job                                                                   | Releases     |
| -------------------------------------------- | ------------------------------------------------------------------------- | ------------ |
| **E1 — Author the plan**                     | Get what is in an editor's head into the Platform, accurately and quickly | R1 → R2      |
| **E2 — Find and understand**                 | Answer a question about the data without asking a person                  | R1 → R4      |
| **E3 — Publish and communicate change**      | Turn a stream of edits into a release other people can act on             | R1 → R2      |
| **E4 — Hand off to development**             | Give a developer exactly what to implement, and nothing else              | R1 → R3      |
| **E5 — Navigate the journey**                | Move through the plan by structure and by journey, not by search alone    | R1 → R2      |
| **E6 — Import content from other platforms** | Move the products being imported across without a bespoke importer                       | R1           |
| **E7 — Govern access**                       | Let the right people in, keep the record of what they did                 | R0 → R2      |
| **E8 — Operate and deploy**                  | Run the Platform, anywhere, without asking its authors                    | R0 → R2      |
| **E9 — Trust the data**                      | Know whether what is documented is what is actually collected             | R4 → Backlog |

---

# R0 — Foundations

_Weeks 1–2. No user-visible value; determines the cost of everything after it. Every story here belongs to an operator or an administrator — no documentation user can do anything yet._

## M0.2 — Persistence foundation

#### US-ADM-01 — Host several companies on one instance · _System administrator_ · E7

**As a** system administrator **I want** one deployment to serve several companies in isolation **so that** the white-label promise holds without running an instance per tenant.

[REQ-FDN-002](requirements/REQ-FDN.md#req-fdn-002--multi-company-tenancy-on-a-single-instance), [REQ-SEC-014](requirements/REQ-SEC.md#req-sec-014--instance-administration-capability)

**Done when** — two companies with identically named projects and properties are demonstrably isolated, enforced in the persistence layer rather than per service. Creating a company is mine to do and nobody else's — no company admin can create one, see that another exists, or reach anything inside it.

#### US-OPS-03 — Upgrade without losing data · _Operator_ · E8

**As a** system administrator **I want** a defined upgrade path with a mandatory backup step **so that** taking a new release is routine.

[REQ-FDN-009](requirements/REQ-FDN.md#req-fdn-009--versioned-idempotent-forward-only-migrations)

**Done when** — migrations are forward-only and idempotent, applied by an explicit `db:migrate` step that refuses to run against a database ahead of the migration set (ADR-0015, amended 2026-08-17 to dbmate via `npm run db:migrate`). **Unblocked** — O7 closed on 2026-08-12 by [ADR-0015](../adr/0015-schema-migration-strategy.md), which also settles that no migration ever inserts data, so an upgrade never delivers someone else's fixtures.

## M0.3 — Ports and adapters

#### US-OPS-06 — Configure an instance without touching code · _Operator_ · E8

**As a** system administrator **I want** infrastructure and credentials in environment variables, validated at boot, with company-level settings (including each company's own SSO connection and login methods) in the database **so that** a misconfiguration fails immediately and by name rather than at 3am.

[REQ-FDN-013](requirements/REQ-FDN.md#req-fdn-013--two-level-configuration-environment-and-company)

**Done when** — start-up stops on a missing required variable and names it, no infrastructure secret is stored in the database, company-level secrets that are stored are encrypted at rest, and the documented variable reference matches the loader — verified by a test that fails when they diverge. Unblocked: O6 and O10 are closed, see [ADR-0014](../adr/0014-configuration-split.md).

#### US-OPS-05 — Run without a hosted search dependency · _Operator_ · E8

**As a** system administrator whose organisation cannot send content to a SaaS **I want** search to work with no external service **so that** "deployable by any organisation" is true rather than aspirational.

[REQ-FDN-007](requirements/REQ-FDN.md#req-fdn-007--search-behind-a-port-pagefind-is-the-default-adapter), [REQ-FDN-008](requirements/REQ-FDN.md#req-fdn-008--search-scoping-enforced-server-side)

**Done when** — a stock instance makes no network call to any search service, and a client requesting another project's index artefact receives a 403.

> **This story used to be an R3 `Could` waiting on a decision that could not arrive in time** — O12 asked for it "before public release", scheduled six weeks _after_ the repository went public. Making Pagefind the default ([ADR-0009](../adr/0009-search-abstraction.md)) moved the story to R0 and closed O12.
>
> It was paid for twice, and both costs land on [US-ANL-01](#us-anl-01--find-which-tracking-sets-a-value--analyst--e2): **typo tolerance, given up deliberately** until a capable adapter is adopted, and **draft-index freshness**, now settled as a 30-second target rather than an open question (O14, closed 2026-08-12).

## M0.4 — Authentication and authorisation

#### US-ADM-02 — Give a user access to only their projects · _Company admin_ · E7

**As a** company admin **I want** to assign a role within **my company** and explicit per-project grants **so that** a user sees the three products they work on and nothing else.

[REQ-SEC-002](requirements/REQ-SEC.md#req-sec-002--four-company-scoped-roles), [REQ-SEC-003](requirements/REQ-SEC.md#req-sec-003--per-project-access-grants), [REQ-SEC-011](requirements/REQ-SEC.md#req-sec-011--permission-matrix-enforced-server-side)

**Done when** — the negative case is tested at every entry point, not only the HTTP API, and holding Project Manager alone confers no editing rights.

**Everything here is inside one company.** I administer my company's projects, integrations, catalogue, branding and audit log. I cannot create a company, cannot see that another company exists, and cannot reach any entity inside one — tested as the negative case, because this is the tenancy boundary expressed in the permission model. Creating companies is [US-ADM-01](#us-adm-01--host-several-companies-on-one-instance--system-administrator--e7), a different person's job.

#### US-ADM-03 — Bring the first administrator into a fresh instance · _Admin_ · E7

**As a** system administrator standing up a new instance **I want** to provision the first administrator from configuration **so that** a machine can come up fully administrable without a human at a browser at the right moment.

[REQ-SEC-013](requirements/REQ-SEC.md#req-sec-013--account-lifecycle-and-first-run-bootstrap), [REQ-SEC-014](requirements/REQ-SEC.md#req-sec-014--instance-administration-capability)

**Done when** — `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` create one administrator, holding the instance-administration capability, the first time the instance starts against a database with no users. Setting them against a populated database does **nothing** — no second administrator, no password reset — and that is tested, because it is the entire security property of the mechanism. Starting empty with the variables unset fails and names them: an instance nobody can log into is a configuration error, not a valid state.

> Chosen over a setup wizard or a one-time token in the log, both of which avoid putting a password in the environment but need someone at a browser at the right moment. This one provisions unattended, which is what automating a deployment actually requires — at the cost of an initial password in the environment, which is why it must be changed at first login.

#### US-ADM-04 — Invite a user, and let them recover a lost password · _Admin / PM / Editor_ · E7

**As an** administrator, project manager or editor **I want** to invite a user, and let them reset a forgotten password **so that** onboarding does not require hand-writing database rows.

[REQ-SEC-013](requirements/REQ-SEC.md#req-sec-013--account-lifecycle-and-first-run-bootstrap)

**Done when** — an invitation issued by an Admin, Project Manager or Editor creates a user with **no role and no grants** — access is assigned separately and deliberately, exactly as a first SSO login does. A reset token is single-use, expires, and reveals nothing about whether the address exists. A departed user can be deactivated: sessions and API tokens stop immediately, and their audit entries stay attributed and readable.

#### US-ADM-10 — Administer the deployment without seeing anyone's documentation · _Operator / Admin_ · E7

**As a** system administrator **I want** an instance-wide console listing companies and who administers them, that does not show me their tracking documentation **so that** running the deployment does not require access to its tenants' content.

[REQ-SEC-014](requirements/REQ-SEC.md#req-sec-014--instance-administration-capability) (R0, the capability) → [REQ-SEC-015](requirements/REQ-SEC.md#req-sec-015--instance-administration-portal) (R2, the portal)

**Done when** — the `instance_admin` flag gates the surface and carries **exactly two powers the Admin role does not have**: creating companies, and granting or revoking the flag itself. It confers **no** content access — reaching documentation still needs a role and a grant in that company, audited like anyone else's. Entering the surface requires re-authenticating, so a hijacked ordinary session cannot walk into it. Flag holders always retain a working local password even where company SSO is enforced, because the instance has to stay recoverable when an identity provider is down or pointed at the wrong tenant. The R2 portal is the screen; R0 is the rule.

> This is the [company admin / system administrator distinction](personas.md) made enforceable: **operating the deployment and administering a tenant are different jobs.** Admin used to be both — it created companies _and_ had the run of their content. Splitting them costs one boolean and makes "who can read our documentation?" answerable without qualification.
>
> Both hats on one head is normal in a small deployment, and it is deliberately two grants rather than one — so it stays visible in the audit log and can be taken away separately.

## M0.6 — Public repository readiness

#### US-OPS-01 — Stand up an instance without asking anyone · _Operator_ · E8

**As a** system administrator evaluating the Platform **I want** to reach a running instance from the README alone **so that** adopting it does not begin with a support conversation.

[REQ-FDN-011](requirements/REQ-FDN.md#req-fdn-011--public-mit-repository-with-readme), [REQ-FDN-012](requirements/REQ-FDN.md#req-fdn-012--reference-deployment-stack-and-ci)

**Done when** — a clean machine gets there in one command, with no database container and no search container to run; no internal hostname, tenant name or credential appears anywhere in the repository or its history.

#### US-OPS-02 — Know what to back up and when · _Operator_ · E8

**As a** system administrator **I want** to be told plainly that backup is mine, and shown how **so that** the imported content does not sit in one unbacked file for six weeks by accident.

[REQ-NFR-006](requirements/REQ-NFR.md#req-nfr-006--backup-is-the-operators-responsibility), [REQ-FDN-012](requirements/REQ-FDN.md#req-fdn-012--reference-deployment-stack-and-ci) → R2: [REQ-VIEW-005](requirements/REQ-VIEW.md#req-view-005--git-export-one-commit-per-publication)

**Done when** — the reference stack demonstrates a file-level SQLite snapshot and the README says the Platform backs up nothing. R2's git export then provides the first partial off-site copy the product itself offers.

> This story is the whole of risk R10. It is cheap in R0 and unrecoverable if the file is lost in week 6.

#### US-OPS-07 — Know what content leaves the instance · _Operator_ · E8

**As a** system administrator in a regulated organisation **I want** a plain statement of which content is transmitted to third-party services **so that** I can get the deployment approved.

[REQ-FDN-021](requirements/REQ-FDN.md#req-fdn-021--third-party-data-flow-statement)

**Done when** — the README enumerates every external service a running instance may contact, what is sent and what is never sent, and a test asserts the stock configuration contacts no search service at all.

> Was a gap; is now a requirement, and a short one to satisfy. With the search default self-contained ([US-OPS-05](#us-ops-05--run-without-a-hosted-search-dependency--operator--e8)), the honest answer for a stock instance is "object storage, and nothing else" — which is only worth having if it is written down.

> **R0 gate.** An operator can stand up an instance, configure it, know what to back up and what leaves it, and log into it — and an administrator can bring other people in. The two account-lifecycle gaps that previously made M0.4's and M0.6's exit criteria undemonstrable are now [REQ-SEC-013](requirements/REQ-SEC.md#req-sec-013--account-lifecycle-and-first-run-bootstrap) and [REQ-SEC-014](requirements/REQ-SEC.md#req-sec-014--instance-administration-capability).

---

# R1 — MVP

_Weeks 3–8. The release that retires the previous documentation for the first imported product._

## M1.1 — Tracking data model

#### US-EDT-01 — Start a project from the company catalogue · _Editor_ · E1

**As a** tracking specialist **I want** a new project to start with the company's standard properties, modules and templates already in it **so that** I am not retyping the same twenty properties for the thirty-first product.

[REQ-DOM-019](requirements/REQ-DOM.md#req-dom-019--company-catalogue-copy-on-project-creation), [REQ-FDN-003](requirements/REQ-FDN.md#req-fdn-003--projects-with-flat-grouping-labels), [REQ-SEC-010](requirements/REQ-SEC.md#req-sec-010--company-catalogue-is-managed-by-the-admin-role)

**Done when** — creating a project offers the catalogue's items and copies the selected ones in. Nothing I do afterwards reaches back into the catalogue, and the copy keeps no reference to its source — where a later feature needs to relate the two ([US-EDT-23](#us-edt-23--adopt-a-catalogue-change-i-actually-want--editor--e1)), it matches on name.

#### US-EDT-03 — Create a tracking from a template · _Editor_ · E1

**As a** tracking specialist **I want** to create a tracking from a template **so that** every tracking of the same kind starts with the same modules, properties and description sections without me remembering the convention.

[REQ-DOM-009](requirements/REQ-DOM.md#req-dom-009--tracking-template-editor-configurable), [REQ-DOM-002](requirements/REQ-DOM.md#req-dom-002--tracking-entity-with-navigation-event-and-attachment)

**Done when** — I can create and edit a template myself with no software release, and a template edit leaves trackings already created from it untouched.

#### US-EDT-04 — Add properties in bulk with a module · _Editor_ · E1

**As a** tracking specialist **I want** to attach a module and get its whole property set at once **so that** a common bundle is one decision rather than fifteen.

[REQ-DOM-006](requirements/REQ-DOM.md#req-dom-006--module-entity-project-scoped-inheritable), [REQ-DOM-008](requirements/REQ-DOM.md#req-dom-008--property-removal-with-automatic-module-detachment)

**Done when** — I can still remove any single property afterwards, and removing the last one detaches the module with a warning rather than leaving a module that does nothing.

#### US-EDT-05 — Change a module without disturbing existing trackings · _Editor_ · E1

**As a** tracking specialist **I want** a module change to affect existing trackings only when I say so **so that** correcting a module does not silently rewrite two years of documentation.

[REQ-DOM-007](requirements/REQ-DOM.md#req-dom-007--opt-in-propagation-of-module-changes)

**Done when** — the default is no propagation, propagation shows what it will change before it changes it, and the whole propagation is one audit entry.

#### US-EDT-06 — Document a nested data layer · _Editor_ · E1

**As a** tracking specialist **I want** to document `product.characteristics.colour` as a child of an object property **so that** the documentation matches the shape of a real data layer and of the XDM schema it feeds.

[REQ-DOM-004](requirements/REQ-DOM.md#req-dom-004--object-property-type-with-parent-child-hierarchy)

**Done when** — children behave like any other property in search and destinations, and the full path is shown wherever the leaf name alone would be ambiguous.

#### US-EDT-07 — State when a property is present · _Editor_ · E1

**As a** tracking specialist **I want** to say that a property is always, sometimes or never sent **for this tracking** **so that** a developer knows what is mandatory and an analyst knows what to expect.

[REQ-DOM-027](requirements/REQ-DOM.md#req-dom-027--trackingproperty-entity-carrying-the-presence-enum)

**Done when** — presence lives on the TrackingProperty record **and nowhere else**: the same property is `always` in one tracking and `sometimes` in another, and no schema, payload or export presents it as an attribute of the property itself.

#### US-EDT-08 — Record the value a property must take · _Editor_ · E1

**As a** tracking specialist **I want** to write the concrete value a property takes in this tracking, including the variable part **so that** the documentation says `article_detail_[slug]` rather than "the page name".

[REQ-DOM-010](requirements/REQ-DOM.md#req-dom-010--specific-values-with-plain-placeholder-strings)

**Done when** — placeholders survive export and re-import verbatim, and specific values are searchable.

#### US-EDT-09 — Map a property onto each analytics platform · _Editor_ · E1

**As a** tracking specialist **I want** to record that one property is `eVar12` in Adobe and a differently-named custom dimension in GA4 **so that** an analyst can move between the documentation and the analytics tool without a translation table in their head.

[REQ-DOM-015](requirements/REQ-DOM.md#req-dom-015--unified-destination-entity-nn-with-properties), [REQ-DOM-016](requirements/REQ-DOM.md#req-dom-016--per-destination-name-override)

**Done when** — one property feeds several destinations, one destination is fed by several properties, and the name override lives on the mapping rather than on either end.

#### US-EDT-10 — Document audiences and surveys · _Editor_ · E1

**As a** tracking specialist **I want** CDP audiences and feedback surveys documented alongside the trackings they are built on **so that** the import's follow-up work (and later products) can record them.

[REQ-DOM-017](requirements/REQ-DOM.md#req-dom-017--cdp-audience-entity), [REQ-DOM-018](requirements/REQ-DOM.md#req-dom-018--survey-entity)

**Done when** — both appear as consumers in impact analysis and neither appears in the development view.

> **Moved from R1 / M1.1 to R2 / M2.7 on 2026-08-17.** They were `Must` in R1 because an import that dropped them would fail; that justification no longer holds for R1, so they move out rather than sit on the critical path (see the [demotion list](milestones.md)).

#### US-EDT-30 — Create a new tracking on a page · _Editor_ · E1

**As a** tracking specialist **I want** to create a tracking, attach it to a page, and choose which navigation event fires it **so that** every documented interaction has a definite home and type.

[REQ-DOM-002](requirements/REQ-DOM.md#req-dom-002--tracking-entity-with-navigation-event-and-attachment)

**Done when** — creating a tracking requires a target page and a navigation event (screen view, popup view, element click, form submission, user error); when a template applies it starts from that template, otherwise blank; and it accumulates in the draft, not in any published version.

#### US-EDT-31 — Define a data-layer property · _Editor_ · E1

**As a** tracking specialist **I want** to add a data-layer property with its full definition — name, business label, description, data source, type, format pattern, allowed values, example values, PII and hashing policy, and analysis notes **so that** a developer and an analyst read the same single source of truth.

[REQ-DOM-003](requirements/REQ-DOM.md#req-dom-003--data-layer-property-full-attribute-set), [REQ-DOM-005](requirements/REQ-DOM.md#req-dom-005--business_label-field)

**Done when** — every documented attribute is captured once at the property and shown wherever the property appears, with no second place to keep in sync; `introduced_in_version` is set by the system at first publication and never by hand; and `presence` is not a property attribute (it lives only on the tracking-property record).

#### US-EDT-32 — Add a single property to a tracking · _Editor_ · E1

**As a** tracking specialist **I want** to add one property to a tracking on its own, without going through a module **so that** a tracking that needs just one extra field is one action rather than a bundle.

[REQ-DOM-027](requirements/REQ-DOM.md#req-dom-027--trackingproperty-entity-carrying-the-presence-enum), [REQ-DOM-008](requirements/REQ-DOM.md#req-dom-008--property-removal-with-automatic-module-detachment)

**Done when** — adding the property directly makes it a tracking-property on which I can set presence; a directly-added property is removable individually just like a module-supplied one; and later re-adding a module does not duplicate a property I added directly.

#### US-EDT-33 — Remove a property from a tracking · _Editor_ · E1

**As a** tracking specialist **I want** to remove a property from a tracking **so that** an obsolete field stops being documented without damaging the rest.

[REQ-DOM-008](requirements/REQ-DOM.md#req-dom-008--property-removal-with-automatic-module-detachment)

**Done when** — removing any single property works whether it came from a module or was added directly; removing the last property of a module detaches the module with a warning rather than leaving it doing nothing; and re-adding the module restores its full set without duplicating properties I added directly and kept.

#### US-EDT-34 — Define a module in this project · _Editor_ · E1

**As a** tracking specialist **I want** to create a module — a named, reusable bundle of data-layer properties — within this project **so that** a common set is defined once and attached many times.

[REQ-DOM-006](requirements/REQ-DOM.md#req-dom-006--module-entity-project-scoped-inheritable)

**Done when** — a module is project-scoped and not nestable; attaching it later brings the whole property set at once (US-EDT-04); and a later change to it reaches existing trackings only through the explicit opt-in propagation (US-EDT-05).

#### US-EDT-35 — Create a project tracking template · _Editor_ · E1

**As a** tracking specialist **I want** to create a tracking template in this project — preset modules, preconfigured properties, default specific values and prefilled description sections **so that** new trackings of a kind start the way I want with no software release.

[REQ-DOM-009](requirements/REQ-DOM.md#req-dom-009--tracking-template-editor-configurable)

**Done when** — any editor can create and edit a template with no release; editing a template leaves trackings already created from it untouched; and templates exist only for trackings, never for pages or flows.

#### US-EDT-36 — Customise the inherited default template for this project · _Editor_ · E1

**As a** tracking specialist **I want** to take the standard template the project inherited from the catalogue and adjust it for this project **so that** this project's conventions can differ from the company default without forking anything globally.

[REQ-DOM-009](requirements/REQ-DOM.md#req-dom-009--tracking-template-editor-configurable), [REQ-DOM-019](requirements/REQ-DOM.md#req-dom-019--company-catalogue-copy-on-project-creation)

**Done when** — the inherited template is a project-scoped copy, editable here; changes affect only this project's future trackings; and later taking a catalogue change is an explicit, separate decision (US-EDT-23), never automatic.

#### US-EDT-37 — Deprecate a property without deleting it · _Editor_ · E1

**As a** tracking specialist **I want** to mark a property `deprecated` while keeping it and its history **so that** old versions and imports do not silently lose a field that was once there.

[REQ-DOM-003](requirements/REQ-DOM.md#req-dom-003--data-layer-property-full-attribute-set)

**Done when** — `status` supports `deprecated` without deletion; deprecation is a manual act, never scheduled; and the property stays present in historical versions.

#### US-EDT-38 — Set the project icon · _Editor_ · E1

**As a** tracking specialist **I want** to give a project an icon matching the product's logo **so that** the project is recognisable at a glance.

[REQ-FDN-003](requirements/REQ-FDN.md#req-fdn-003--projects-with-flat-grouping-labels)

**Done when** — the project carries an `icon` attribute and it renders wherever the project is listed.

#### US-EDT-39 — Add an analytics destination to the project · _Editor_ · E1

**As a** tracking specialist **I want** to add a destination — an analytics platform that properties map onto (Adobe, CJA, GA4, PostHog) **so that** properties can be mapped onto it (US-EDT-09) rather than only onto platforms that pre-exist.

[REQ-DOM-015](requirements/REQ-DOM.md#req-dom-015--unified-destination-entity-nn-with-properties)

**Done when** — a destination is an entity in the project; a property can map to several destinations and a destination can be fed by several properties (N:N); and any single mapping may carry a per-destination name override.

#### US-ADM-11 — Create the company's standard tracking template · _Company admin_ · E7

**As a** company admin **I want** to define the catalogue's standard tracking template **so that** every new project starts from a sensible default instead of an empty slate.

[REQ-DOM-019](requirements/REQ-DOM.md#req-dom-019--company-catalogue-copy-on-project-creation), [REQ-DOM-009](requirements/REQ-DOM.md#req-dom-009--tracking-template-editor-configurable), [REQ-SEC-010](requirements/REQ-SEC.md#req-sec-010--company-catalogue-is-managed-by-the-admin-role)

**Done when** — the template lives in the company catalogue and is copied into a project at creation (US-EDT-01); a project's copy has no live link back to the catalogue; and a project may replace its own copy without affecting the catalogue.

## M1.2 — Import-grade API

#### US-AGT-01 — Build a whole project through the API · _Agent_ · E6

**As an** agent importing a product **I want** every entity in the R1 model creatable, readable and updatable through a documented API **so that** I can complete the import without a human opening the UI once.

[REQ-IMP-002](requirements/REQ-IMP.md#req-imp-002--api-surface-complete-for-every-r1-entity), [REQ-API-002](requirements/REQ-API.md#req-api-002--documented-public-api)

**Done when** — every attribute writable in the UI is writable through the API, relationships are settable in either order or the ordering is documented, and I can write the script from the published documentation alone without reading Platform source.

> This story is the acceptance test for [M1.2](milestones.md#m12--import-grade-api) in its entirety, and the proof that pain point 6 — no machine access — cannot recur.

#### US-AGT-02 — Re-run a corrected script safely · _Agent_ · E6

**As an** agent importing a product **I want** writes keyed on a `custom_id` to update rather than duplicate **so that** getting it wrong the first time costs a re-run rather than a cleanup.

[REQ-IMP-003](requirements/REQ-IMP.md#req-imp-003--idempotent-upsert-keyed-on-custom_id)

**Done when** — running the same script twice produces no duplicates and no orphans, and a corrected script converges over a partial import without manual repair.

#### US-AGT-03 — Bring the images across · _Agent_ · E6

**As an** agent importing a product **I want** to upload an image from the export folder and reference it from Markdown in the same run **so that** imported content is not a wall of broken images.

[REQ-IMP-004](requirements/REQ-IMP.md#req-imp-004--asset-upload-through-the-api)

**Done when** — upload obeys the same limits and processing as the UI path, is idempotent by `custom_id`, and anything unresolved is listed in the reconciliation report.

#### US-AGT-04 — Write thousands of records without thousands of round trips · _Agent_ · E6

**As an** agent importing the products **I want** batch write endpoints with per-item outcomes **so that** one invalid row does not discard the batch and I know exactly which rows failed.

[REQ-IMP-005](requirements/REQ-IMP.md#req-imp-005--batch-write-endpoints), [REQ-API-008](requirements/REQ-API.md#req-api-008--bulk-operations-restricted-to-explicit-identifier-lists)

**Done when** — batch semantics are documented and consistent, the target is always an explicit list of identifiers rather than a filter, and audit entries are proportionate rather than one per item.

#### US-AGT-07 — Be unable to publish, delete a user or change a permission · _Agent_ · E6

**As the** editor accountable for the import **I want** the agent to have no tool for publishing, user deletion or permission changes **so that** the boundary is structural rather than a permission check that could be misconfigured.

[REQ-API-009](requirements/REQ-API.md#req-api-009--service-account-api-tokens) → M1.3: [REQ-API-004](requirements/REQ-API.md#req-api-004--mcp-write-tools-draft-only), [REQ-SEC-011](requirements/REQ-SEC.md#req-sec-011--permission-matrix-enforced-server-side)

**Done when** — a service-account token carries no privilege its owner lacks and cannot publish; from M1.3, the corresponding MCP tools are absent rather than denied.

## M1.3 — MCP server

#### US-AGT-05 — Check my own work · _Agent_ · E6

**As an** agent importing a product **I want** to read back what I wrote and pull the reconciliation report mid-run **so that** the import is self-checking rather than blind.

[REQ-IMP-006](requirements/REQ-IMP.md#req-imp-006--reconciliation-report), [REQ-API-003](requirements/REQ-API.md#req-api-003--mcp-read-tools)

**Done when** — the report is produced by the Platform from its own state, because a process that reports on itself is not verification.

#### US-AGT-06 — Follow the house conventions without being told · _Agent_ · E6

**As an** agent writing content **I want** the naming and documentation guidelines as a resource I can read **so that** the first product follows house conventions rather than being corrected afterwards.

[REQ-API-006](requirements/REQ-API.md#req-api-006--mcp-resources-exposing-naming-guidelines), [REQ-DOM-023](requirements/REQ-DOM.md#req-dom-023--non-blocking-naming-and-format-warnings)

**Done when** — lowercase underscores, `si`/`no` booleans, ISO 8601, `dev`/`qa`/`prod` and the separator rules are retrievable as an MCP resource rather than restated per conversation.

## M1.4 — Agent-driven pilot import

#### US-EDT-20 — Verify an imported product against its source · _Editor_ · E6

**As a** tracking specialist **I want** a report of what actually landed in the Platform, legible to me rather than to a developer **so that** I can check the agent's work against the previous documentation before trusting it.

[REQ-IMP-006](requirements/REQ-IMP.md#req-imp-006--reconciliation-report), [REQ-IMP-007](requirements/REQ-IMP.md#req-imp-007--import-scripts-committed-and-re-runnable)

**Done when** — the report is generated by the Platform from its own state rather than by the import script, and the first product is verified item by item before the remaining products are attempted.

> The whole mitigation for risk R9 lands on this story. An agent can produce plausible-looking wrong data where a parser would have failed loudly; this is where a human catches it.

## M1.5 — Authoring

#### US-EDT-11 — Paste a screenshot straight into the page · _Editor_ · E1

**As a** tracking specialist **I want** to paste a screenshot from the clipboard **so that** documenting a screen costs one keystroke rather than a save-upload-insert round trip.

[REQ-AUTH-002](requirements/REQ-AUTH.md#req-auth-002--image-upload-10-mb-cap-resize-to-2000-px)

**Done when** — clipboard paste works for a screenshot taken outside the browser, oversized files fail with the limit named before any bytes are stored, and duplicating content copies the image rather than referencing it.

#### US-EDT-12 — Write rich descriptions with diagrams · _Editor_ · E1

**As a** tracking specialist **I want** headings, tables, code blocks and callouts that render as I type **so that** the prose half of the documentation is as good as the structured half.

[REQ-AUTH-001](requirements/REQ-AUTH.md#req-auth-001--markdown-editor-with-the-full-block-set) · diagrams: [REQ-AUTH-004](requirements/REQ-AUTH.md#req-auth-004--mermaid-rendering-and-live-preview) (R2)

**Done when** — content is stored as Markdown and every block round-trips without lossy re-serialisation.

> **The diagram half of this story is R1 (M1.6).** A Mermaid block can be written and is stored verbatim from M1.5 (REQ-AUTH-001); from M1.6, REQ-AUTH-004 renders it live, alongside the diagrams generated from the flow graph (REQ-NAV-006). The rendering half returned to R1 on 2026-08-17 with the Flows move — flows are R1, so the renderer they need ships with them.

#### US-EDT-13 — Duplicate a tracking instead of retyping it · _Editor_ · E1

**As a** tracking specialist **I want** to duplicate a tracking with everything it carries **so that** the twelfth variation of a page view takes seconds.

[REQ-AUTH-006](requirements/REQ-AUTH.md#req-auth-006--tracking-duplication-within-a-project)

**Done when** — the copy is fully independent, with its own identifier and its own image objects, and no live link to its parent.

#### US-EDT-14 — Not lose work when a colleague saves first · _Editor_ · E1

**As a** tracking specialist **I want** to be told when the record I am editing has changed underneath me **so that** two of us working the same morning do not overwrite each other.

[REQ-AUTH-005](requirements/REQ-AUTH.md#req-auth-005--optimistic-concurrency-with-stale-write-rejection)

**Done when** — the rejected save explains what happened and keeps my input, and the check applies to API and MCP writes identically, not only to the browser.

#### US-EDT-15 — Keep test credentials out of everything published · _Editor_ · E1

**As a** tracking specialist **I want** to mark a free page non-publishable **so that** test URLs and test credentials stay inside the instance no matter which channel we add next.

[REQ-AUTH-003](requirements/REQ-AUTH.md#req-auth-003--free-wiki-pages-with-publishable-flag), [REQ-SEC-012](requirements/REQ-SEC.md#req-sec-012--non-publishable-content-never-leaves-the-instance)

**Done when** — the page is provably absent from the search index when queried directly, invisible to shared-password readers, and absent from every generated artefact. **This is a standing guarantee, not a one-milestone one**: every later milestone that adds an output channel adds its own omission test.

#### US-EDT-40 — Provide the standard front-matter sections · _Editor_ · E1

**As a** tracking specialist **I want** to write the standard documentation sections — the data-layer overview and the script/SDK integration instructions — and a references page only the documentation team sees **so that** the documentation is complete to read and safe to distribute.

[REQ-AUTH-003](requirements/REQ-AUTH.md#req-auth-003--free-wiki-pages-with-publishable-flag), [REQ-SEC-012](requirements/REQ-SEC.md#req-sec-012--non-publishable-content-never-leaves-the-instance)

**Done when** — the data-layer overview and the integration-instructions page are free, publishable pages; the references page is a free page marked non-publishable; and non-publishable content stays inside the instance across every index and export channel.

## M1.6 — Structure and navigation

#### US-EDT-02 — Catalogue the page hierarchy · _Editor_ · E1

**As a** tracking specialist **I want** to build the product's page and screen tree, including modals, popups and CMS templates **so that** every tracking has somewhere true to hang from.

[REQ-DOM-001](requirements/REQ-DOM.md#req-dom-001--pagescreen-entity), [REQ-NAV-001](requirements/REQ-NAV.md#req-nav-001--page-hierarchy-with-navigable-sidebar)

**Done when** — the first imported product's full tree exists, is reorderable, and reordering breaks no reference and changes no identifier.

#### US-ANL-02 — See everything tracked on a page · _Analyst_ · E2

**As a** digital analyst **I want** a page to list every tracking attached to it with its specific values **so that** "what is tracked here?" is answered without further clicks.

[REQ-NAV-002](requirements/REQ-NAV.md#req-nav-002--automatic-per-page-tracking-recap)

**Done when** — the recap is generated from the model and never maintained by hand, and shows the draft to an editor and the published version to a reader. This is also where [REQ-NFR-004](requirements/REQ-NFR.md#req-nfr-001--req-nfr-004--performance-targets) — load a very large project in under 3 s — first becomes measurable, against the imported data that arrived at M1.4.

#### US-BUS-04 — Follow a customer journey end to end · _Business_ · E5

**As a** business user **I want** a named journey drawn over the real pages, with the actions that fire trackings on it **so that** the diagram cannot drift from the documentation the way a hand-drawn one does.

[REQ-NAV-003](requirements/REQ-NAV.md#req-nav-003--flow-entity), [REQ-NAV-005](requirements/REQ-NAV.md#req-nav-005--directed-graph-with-labels-and-conditions), [REQ-NAV-006](requirements/REQ-NAV.md#req-nav-006--automatic-mermaid-generation-from-the-graph), [REQ-NAV-007](requirements/REQ-NAV.md#req-nav-007--sidebar-exposing-flows-alongside-the-hierarchy)

**Done when** — the diagram is generated from the graph rather than written, funnel steps are Pages rather than a separate entity, and the sidebar exposes flows alongside the hierarchy.

> Pain points 3 and 4 in the [vision](vision.md), closed together.

#### US-EDT-27 — Model an action that exists on many screens · _Editor_ · E5

**As a** tracking specialist **I want** a navigation-bar action with five source pages and no destination to be an ordinary case **so that** the model does not need a special "cross-page" attachment mode.

[REQ-NAV-004](requirements/REQ-NAV.md#req-nav-004--trigger-nodes-distinct-from-visual-transitions)

**Done when** — a Trigger carries 0..N sources and 0..N destinations, and the non-navigating action needs no workaround.

## M1.7 — Search

#### US-ANL-01 — Find which tracking sets a value · _Analyst_ · E2

**As a** digital analyst **I want** to search a literal value and get the trackings that set it **so that** the most frequent question I have — "where does this string come from?" — stops requiring a colleague.

[REQ-AUTH-007](requirements/REQ-AUTH.md#req-auth-007--project-scoped-full-text-search), [REQ-FDN-008](requirements/REQ-FDN.md#req-fdn-008--search-scoping-enforced-server-side)

**Done when** — specific values are indexed, property and tracking names rank above other text, search reflects the draft for an editor and the published version for a reader, and search never crosses a project I have no grant on.

> **Typo tolerance is not part of this story.** The default adapter does prefix matching and stemming, not typo correction, and that is an accepted first-phase trade — searching `page_nam` finds `page_name`, searching `pgae_name` does not. It returns when a capable adapter is adopted ([REQ-FDN-022](requirements/REQ-FDN.md#req-fdn-022--hosted-search-adapter)). What is bought instead — no documentation content leaving the instance ([US-OPS-05](#us-ops-05--run-without-a-hosted-search-dependency--operator--e8)) — is the half an operator cannot add later.
>
> **O14 is closed** (2026-08-12): the draft index is rebuilt asynchronously after each save, with rebuilds coalesced so a burst of typing costs one rebuild, and an edit is findable within 30 seconds of the save. Readers are on a separate index rebuilt at publication, so what they search is exactly what was published.

## M1.8 — Versioning and publication

#### US-EDT-17 — See what I am about to publish · _Editor_ · E3

**As a** tracking specialist **I want** to review every change since the last version before I publish **so that** publication is a deliberate act rather than a hopeful one.

[REQ-VER-002](requirements/REQ-VER.md#req-ver-002--unpublished-changes-indicator), [REQ-VER-005](requirements/REQ-VER.md#req-ver-005--diff-by-entity-property-and-specific-value)

**Done when** — the question "what would I publish?" is answerable from the project level, the diff reaches per-property and per-specific-value granularity, and changes by every actor appear, agents included.

#### US-EDT-18 — Hold back work in progress from a publication · _Editor_ · E3

**As a** tracking specialist **I want** to exclude individual trackings and pages from a version **so that** a half-documented feature does not force me to delay everything else.

[REQ-VER-003](requirements/REQ-VER.md#req-ver-003--selective-publication-of-trackings-and-pagesflows)

**Done when** — the excluded item stays in the draft unchanged, the exclusion applies to that publication only, and **no published entity can reference an excluded one**: excluding a page proposes excluding its trackings, and overriding that proposal is refused with the conflicting pair named rather than published as a tracking attached to nothing.

#### US-EDT-19 — Publish with a changelog I did not write · _Editor_ · E3

**As a** tracking specialist **I want** the changelog generated from the diff **so that** the capability the previous documentation never had costs me nothing per release.

[REQ-VER-004](requirements/REQ-VER.md#req-ver-004--version-metadata), [REQ-VER-006](requirements/REQ-VER.md#req-ver-006--automatically-generated-changelog)

**Done when** — publishing produces a changelog nobody wrote by hand, with a system-granted version number, a customisable title and optional release notes around it.

#### US-BUS-02 — Know what is in this release · _Business_ · E3

**As a** product manager **I want** to read what changed, with a title and release notes **so that** I can tell my stakeholders what tracking a release actually delivers.

[REQ-VER-004](requirements/REQ-VER.md#req-ver-004--version-metadata), [REQ-VER-006](requirements/REQ-VER.md#req-ver-006--automatically-generated-changelog)

**Done when** — product releases are referenced in prose in the notes; there is deliberately no product-release entity.

#### US-BUS-05 — Consult the documentation as it was at a past release · _Business_ · E3

**As a** product manager **I want** to open version 7 as it stood **so that** a question about what we shipped in March has an answer.

[REQ-VER-007](requirements/REQ-VER.md#req-ver-007--full-historical-version-consultation)

**Done when** — a version renders in full including its assets, which are therefore never deleted while a version references them.

#### US-ANL-05 — Know when a property first appeared · _Analyst_ · E2

**As a** digital analyst **I want** to see which version introduced a property **so that** I know how far back a time series can honestly go.

[REQ-DOM-003](requirements/REQ-DOM.md#req-dom-003--data-layer-property-full-attribute-set), [REQ-VER-007](requirements/REQ-VER.md#req-ver-007--full-historical-version-consultation)

**Done when** — `introduced_in_version` is set automatically at first publication and never hand-edited.

#### US-EDT-41 — Publish an immutable snapshot of the single draft · _Editor_ · E3

**As a** tracking specialist **I want** to publish the draft as an immutable snapshot **so that** readers see one coherent version and earlier versions stay consultable.

[REQ-VER-001](requirements/REQ-VER.md#req-ver-001--single-draft--published-model)

**Done when** — all edits accumulate in a single draft per project; publication creates an immutable snapshot of it; there is no branching or merging and no approval workflow; and after publication the draft keeps accumulating new edits for the next version.

## M1.9 — Access and consultation

#### US-ADM-06 — Open a project to an external audience for a while · _PM_ · E7

**As a** project manager **I want** to issue a shared password with an expiry, and revoke one without affecting the others **so that** an agency engagement is bounded by construction.

[REQ-SEC-005](requirements/REQ-SEC.md#req-sec-005--project-shared-password-access-with-expiry)

**Done when** — expiry takes effect without an administrative action, and the mode is read-only through every path including exports.

#### US-ADM-07 — Show that a change was made by a named actor · _Admin_ · E7

**As an** administrator **I want** an append-only record of writes, publications, exports, shared-password access and MCP calls **so that** "who changed this and when" is answerable for two years.

[REQ-SEC-006](requirements/REQ-SEC.md#req-sec-006--append-only-audit-log-24-month-retention) → R2: [REQ-SEC-008](requirements/REQ-SEC.md#req-sec-008--audit-log-ui-paginated-list-and-csv-export)

**Done when** — entries cannot be updated or deleted through any application path, and a human actor is distinguishable from an agent acting on their behalf. The consultation UI follows in R2.

#### US-BUS-01 — Read the documentation without an account · _Business_ · E3

**As a** business user **I want** to reach a project behind a shared password **so that** an external agency or a colleague outside the licence pool can read it for the weeks they need it.

[REQ-SEC-005](requirements/REQ-SEC.md#req-sec-005--project-shared-password-access-with-expiry), [REQ-VIEW-001](requirements/REQ-VIEW.md#req-view-001--in-app-read-only-view)

**Done when** — access is read-only through every path and non-publishable content is invisible.

> This story is the direct answer to cost — pain point 1 in the [vision](vision.md). Hundreds of licensed writers existed because reading required an account.

#### US-DEV-01 — See only what I have to implement · _Developer_ · E4

**As a** web or app developer **I want** a view without destinations, tag-manager-derived properties, analysis notes, audiences or surveys **so that** I am not reading past three-quarters of the page to find my work.

[REQ-VIEW-002](requirements/REQ-VIEW.md#req-view-002--view-selector-as-a-presentation-filter)

**Done when** — the selector switches presentation and nothing else, and is documented in the UI and in code as **not** a security boundary.

#### US-DSG-01 — Understand which interactions are tracked · _Designer_ · E5

**As a** designer **I want** to use the Analyst/Business view **so that** I can see which interactions carry tracking without a view built specially for me.

[REQ-VIEW-002](requirements/REQ-VIEW.md#req-view-002--view-selector-as-a-presentation-filter), [REQ-VIEW-010](requirements/REQ-VIEW.md#req-view-010--dedicated-design-view-field-level-permissions)

**Done when** — there is no dedicated Design view, and that is recorded as a decision rather than a backlog item.

#### US-ANL-03 — Understand what a property means · _Analyst_ · E2

**As a** digital analyst **I want** the property's meaning, format, allowed values, examples and analysis notes in one place **so that** I interpret the data the same way as the person who specified it.

[REQ-DOM-003](requirements/REQ-DOM.md#req-dom-003--data-layer-property-full-attribute-set), [REQ-DOM-005](requirements/REQ-DOM.md#req-dom-005--business_label-field) → R2: [REQ-DOM-014](requirements/REQ-DOM.md#req-dom-014--company-defined-custom-fields)

**Done when** — the full attribute set is authored and visible in the Analyst view. Open decision O3 — how "read this in the analytics platform" is structured — is what the R2 half is waiting on.

> In R1–R3 the analyst view means property documentation, destination mappings and the version an item was introduced in. **Interpretation guidance is deliberately not part of it** and carries no requirement — see the [vision](vision.md).

#### US-ANL-04 — See which audiences and surveys consume a property · _Analyst_ · E2

**As a** digital analyst **I want** to know which CDP audiences and surveys are built on a property **so that** I understand the blast radius before I rely on it or ask for it to change.

[REQ-DOM-017](requirements/REQ-DOM.md#req-dom-017--cdp-audience-entity), [REQ-DOM-018](requirements/REQ-DOM.md#req-dom-018--survey-entity) → [REQ-DOM-020](requirements/REQ-DOM.md#req-dom-020--project-scoped-impact-analysis)

**Done when** — audiences and surveys are documented (M2.7) and R2's impact analysis makes the reverse lookup answerable.

> **Moved from R1 to R2 on 2026-08-17** alongside US-EDT-10.

## M1.10 — Pilot cutover

#### US-EDT-28 — Freeze and archive the source on import · _Editor_ · E6

**As a** tracking specialist **I want** the source documentation frozen per product as it is imported, then kept read-only **so that** no edit is stranded and nothing is destroyed.

[REQ-IMP-008](requirements/REQ-IMP.md#req-imp-008--source-system-frozen-then-read-only-archive)

**Done when** — the freeze is announced and effective before the final import run, applies per product rather than to all at once, and the archive stays reachable.

> **R1 gate, as one sentence:** _an editor works a full week without returning to the previous documentation._ Every R1 editor story above is something they would otherwise go back for. If one is demoted, that is the sentence to re-read before agreeing.

---

# R2 — Navigation and distribution

_Months 3–4. The release that lets people outside the tool consume the documentation._

## M2.1 — Structured expression

#### US-EDT-16 — Express a conditional valorisation · _Editor_ · E1

**As a** tracking specialist **I want** to say that a property takes one value when the user is logged in and another when they are not **so that** the scenario is documented once rather than as two near-identical trackings.

[REQ-DOM-012](requirements/REQ-DOM.md#req-dom-012--structured-property-conditions-four-operators--note), [REQ-DOM-013](requirements/REQ-DOM.md#req-dom-013--conditions-targeting-nested-property-paths)

**Done when** — the condition is _property + operator + value + note_, including on nested paths, with `is not set` offered where presence is `sometimes`.

> **This capability does not exist in R1 in any form.** The prose stopgap was rejected rather than shipped ([REQ-DOM-011](requirements/REQ-DOM.md#req-dom-011--prose-conditional-valorisations)), which is why there is no conversion exercise across the imported products and why this story appears once, here, rather than spanning two releases. Two later stories depend on it and on nothing else: [US-DEV-04](#us-dev-04--see-only-the-values-that-apply-to-my-scenario--developer--e4) and mechanical conformance checking in R4.


## M2.2 — ~~Flows~~ _(moved to M1.6 on 2026-08-17)_

The flow stories (US-BUS-04, US-EDT-27) and REQ-NAV-003…007 now live under [M1.6](#m16--structure-and-navigation).

## M2.3 — Image annotations

#### US-EDT-26 — Anchor a tracking to the element that fires it · _Editor_ · E1

**As a** tracking specialist **I want** to mark the exact button or region on a screenshot and link it to a trigger or tracking **so that** implementation ambiguity is resolved by pointing rather than by better prose.

[REQ-AUTH-014](requirements/REQ-AUTH.md#req-auth-014--image-annotation-layer-linked-to-triggers)

**Done when** — annotations are a separate layer over a preserved original, regions nest to express container-level and item-level interactions, and an annotation survives re-editing.

#### US-DSG-02 — See tracking anchored on the actual screen · _Designer_ · E5

**As a** designer **I want** trackings marked on the screenshot itself **so that** the conversation about what fires where happens on the interface rather than in prose.

[REQ-AUTH-014](requirements/REQ-AUTH.md#req-auth-014--image-annotation-layer-linked-to-triggers)

**Done when** — points mark small elements, regions mark areas and nest, and each may link to a trigger or a tracking.

## M2.4 — Bulk operations

#### US-EDT-22 — Apply one change across a multi-selection · _Editor_ · E1

**As a** tracking specialist **I want** to add a module, remove a property or reattach a page across fifty selected trackings at once **so that** a convention change is an afternoon rather than a fortnight.

[REQ-AUTH-010](requirements/REQ-AUTH.md#req-auth-010--bulk-operations-on-a-multi-selection-with-preview), [REQ-API-008](requirements/REQ-API.md#req-api-008--bulk-operations-restricted-to-explicit-identifier-lists)

**Done when** — every operation previews the affected items first, produces a single audit entry, and appears in the publication diff as ordinary per-entity changes.

> **O13 closed on 2026-08-13.** The operation list is now an observation rather than a proposal: six operations, confirmed against what editors actually did by hand during the import (REQ-AUTH-010). Bulk-setting presence is not among them.

## M2.5 / M2.6 — Rendering and distribution

#### US-BUS-06 — Read it outside the application · _Business_ · E3

**As a** business user **I want** a per-project site regenerated on every publication **so that** consulting the documentation does not require the tool or a seat in it.

[REQ-VIEW-003](requirements/REQ-VIEW.md#req-view-003--profile-aware-rendering-engine), [REQ-VIEW-004](requirements/REQ-VIEW.md#req-view-004--per-project-static-site)

**Done when** — the site is regenerated on publication and contains no content the selected profile excludes, verified by scanning generated bytes rather than by inspecting the template.

> [REQ-VIEW-003](requirements/REQ-VIEW.md#req-view-003--profile-aware-rendering-engine) is the one `Must` outside R0/R1 — it stays a Must because "adding a channel without an omission test fails review" has to be enforceable, and it is R2 because no channel exists before then. Build it before any channel.

#### US-DEV-02 — Know what changed since the last release · _Developer_ · E4

**As a** web or app developer **I want** the changelog narrowed to what affects code **so that** a release means reading a page rather than diffing the whole plan.

[REQ-VIEW-008](requirements/REQ-VIEW.md#req-view-008--development-filtered-changelog), [REQ-VER-006](requirements/REQ-VER.md#req-ver-006--automatically-generated-changelog)

**Done when** — the narrowing is prominent in the Development view; the R1 diff data already supports it.

#### US-DEV-05 — Receive a self-contained handoff for a release · _Developer_ · E4

**As a** web or app developer **I want** a PDF of what changed in this version, with images **so that** the handoff survives leaving the tool.

[REQ-VIEW-006](requirements/REQ-VIEW.md#req-view-006--pdf-export-of-version-changes) → R3: [REQ-DEV-004](requirements/REQ-DEV.md#req-dev-004--changed-tracking-snippets-in-the-developer-pdf)

**Done when** — the PDF covers disconnected consultation, which is why no offline mode is needed. R3 adds snippets for the changed trackings.

#### US-ANL-06 — Pull the property list into a spreadsheet · _Analyst_ · E2

**As a** digital analyst **I want** every property with every column as an export **so that** I can work the list in the tool I already use for bulk review.

[REQ-VIEW-007](requirements/REQ-VIEW.md#req-view-007--excel-export-of-data-layer-properties)

**Done when** — referenced entities resolve to their names rather than to identifiers.

## M2.7 — Editorial depth

#### US-EDT-21 — Tell an agent's edits from a colleague's · _Editor_ · E6

**As a** tracking specialist **I want** agent-written changes visually distinguished in the publication diff **so that** the review I already do is also the review of the agent.

[REQ-VER-010](requirements/REQ-VER.md#req-ver-010--agent-vs-human-attribution-in-the-diff)

**Done when** — an agent edit is distinguishable at a glance in the diff, which is the only review gate there is — there is deliberately no separate agent-review queue.

#### US-EDT-23 — Adopt a catalogue change I actually want · _Editor_ · E1

**As a** tracking specialist **I want** to be shown that a company module has changed since my project copied it, and choose whether to take the change **so that** the catalogue can improve without rewriting my project behind my back.

[REQ-DOM-024](requirements/REQ-DOM.md#req-dom-024--selective-adoption-of-catalogue-module-changes), [REQ-DOM-007](requirements/REQ-DOM.md#req-dom-007--opt-in-propagation-of-module-changes)

**Done when** — correspondence is established by **name match**, computed when I ask rather than stored at copy time, and the feature is advisory: it proposes, I accept. A renamed module on either side simply produces no match. Adopting the change and propagating it into existing trackings are two separate decisions.

#### US-EDT-24 — Know what references a property before deprecating it · _Editor_ · E1

**As a** tracking specialist **I want** to list every tracking, destination, audience, survey and dashboard that uses a property **so that** deprecating it is an informed decision.

[REQ-DOM-020](requirements/REQ-DOM.md#req-dom-020--project-scoped-impact-analysis)

**Done when** — the question is answerable before the deprecation, within the project — there is no cross-project impact analysis and none is wanted.

#### US-EDT-25 — Undo a publication, and see who changed a field · _Editor_ · E3

**As a** tracking specialist **I want** to restore the draft to a previous version, and to see per-element history **so that** a bad publication is recoverable and "why does this say that?" has an answer six months later.

[REQ-VER-008](requirements/REQ-VER.md#req-ver-008--full-rollback), [REQ-AUTH-012](requirements/REQ-AUTH.md#req-auth-012--per-element-change-history-blame)

**Done when** — the restore is complete and recorded in the audit log; history is available on the individual entity, distinct from project versioning and from the audit log.

#### US-EDT-29 — Reuse the web plan when documenting the app · _Editor_ · E1

**As a** tracking specialist **I want** to copy a selection of trackings into another project, mapping missing modules and properties as I go **so that** the iOS plan starts from the web plan rather than from nothing.

[REQ-AUTH-009](requirements/REQ-AUTH.md#req-auth-009--cross-project-tracking-copy-with-guided-mapping), [REQ-AUTH-008](requirements/REQ-AUTH.md#req-auth-008--page-and-flow-duplication)

**Done when** — the copy is independent in the target project; no shared identity is created, because projects are isolated by construction.

#### US-DEV-07 — Jump to the design frame · _Developer_ · E4

**As a** web or app developer **I want** the page and the tracking to link to the Figma frame **so that** I can see what I am instrumenting.

[REQ-DEV-001](requirements/REQ-DEV.md#req-dev-001--figma-frame-links-stored-as-fileid--nodeid)

**Done when** — the link is stored as `figma_file_id` + `figma_node_id` rather than as an opaque URL, which is what makes frame import in R4 additive rather than a data migration.

#### US-BUS-03 — Be told when something is published · _Business_ · E3

**As a** product manager **I want** an email when a project I follow publishes **so that** I am not polling a tool.

[REQ-VER-009](requirements/REQ-VER.md#req-ver-009--publication-email-notifications)

**Done when** — subscription is per project, publication is the only notification event, and unsubscribe works from the web interface.

## M2.8 — Platform hardening

#### US-OPS-04 — Run it on the database my organisation supports · _Operator_ · E8

**As a** system administrator **I want** to select MariaDB or PostgreSQL by configuration **so that** the database is not the reason we cannot deploy.

[REQ-FDN-005](requirements/REQ-FDN.md#req-fdn-005--persistence-behind-repository-ports-sqlite-default), [REQ-FDN-018](requirements/REQ-FDN.md#req-fdn-018--mariadb-adapter), [REQ-FDN-019](requirements/REQ-FDN.md#req-fdn-019--postgresql-adapter), [REQ-FDN-020](requirements/REQ-FDN.md#req-fdn-020--schema-constrained-to-a-portable-sql-subset)

**Done when** — the full repository and migration suite runs unchanged on all three dialects with no test skipped on any of them.

> Nothing forces compliance with the portable-SQL subset until this story lands. Every shortcut taken in M0.2 is paid for here, under existing data.

#### US-ADM-05 — Let people in with corporate SSO · _Admin_ · E7

**As an** administrator **I want** OIDC login **so that** the corporate instance uses the identity provider everyone already has.

[REQ-SEC-004](requirements/REQ-SEC.md#req-sec-004--oidc-sso)

**Done when** — a first SSO login creates a user with no role and no grants, so access is always granted deliberately rather than inferred from a successful authentication; local and SSO login coexist.

> **Moved from R1 / M1.9 to R2 / M2.8 on 2026-08-17** alongside SAML SSO (REQ-SEC-007).

#### US-ADM-08 — Retire a project without losing it · _Admin_ · E7

**As an** administrator **I want** to archive a finished project rather than delete it **so that** nothing in the product can destroy documentation.

[REQ-SEC-009](requirements/REQ-SEC.md#req-sec-009--project-archive-and-restore-no-hard-delete)

**Done when** — no application path hard-deletes a project, and a restore brings back content and version history intact.

> **R2 gate.** An external stakeholder consults the documentation without an account in the application.

---

# R3 — Developer handoff, API and MCP

_Months 5–6._

## M3.1 / M3.2 — Snippets and Confluence

#### US-DEV-03 — Take a snippet rather than read a table · _Developer_ · E4

**As a** web or app developer **I want** a ready-to-use snippet for my platform and tag manager **so that** I transcribe nothing by hand.

[REQ-DEV-002](requirements/REQ-DEV.md#req-dev-002--code-snippet-generation-per-platform--tag-manager), [REQ-DEV-003](requirements/REQ-DEV.md#req-dev-003--snippets-in-every-development-facing-artefact)

**Done when** — snippets appear in the in-app development view, the static site, Confluence and the PDF, are generated on the fly, and preserve placeholders verbatim with explanatory comments.

#### US-DEV-04 — See only the values that apply to my scenario · _Developer_ · E4

**As a** web or app developer **I want** the snippet for the logged-in case to show only the logged-in values, marking what is required and what is forbidden **so that** I am not deducing the scenario from a full property table.

[REQ-DEV-005](requirements/REQ-DEV.md#req-dev-005--snippets-narrowed-by-structured-property-conditions), [REQ-DOM-012](requirements/REQ-DOM.md#req-dom-012--structured-property-conditions-four-operators--note)

**Done when** — narrowing is driven by structured conditions. This is the main practical gain over the previous documentation, and it is why [US-EDT-16](#us-edt-16--express-a-conditional-valorisation--editor--e1) exists.

#### US-DEV-06 — Read the documentation where my team already works · _Developer_ · E4

**As a** web or app developer **I want** the development view published into our Confluence space **so that** I am not asked to adopt another tool for one page a sprint.

[REQ-VIEW-009](requirements/REQ-VIEW.md#req-view-009--confluence-cloud-publication)

**Done when** — publication overwrites the space in full, and that a manual Confluence edit is lost is documented as intended rather than as a limitation.

## M3.4 — Interactive agent access

#### US-ANL-07 — Ask my own AI assistant · _Analyst_ · E2

**As a** digital analyst **I want** to query the documentation from my own assistant, authenticated as me **so that** I get answers in the tool I am already working in.

[REQ-API-005](requirements/REQ-API.md#req-api-005--oauth-with-user-consent-for-mcp-clients), [REQ-API-010](requirements/REQ-API.md#req-api-010--richer-mcp-read-tools)

**Done when** — access is by user consent rather than a shared token, and the assistant sees neither more nor less than I would.

#### US-DEV-08 — Query the plan from my IDE · _Developer_ · E4

**As a** web or app developer **I want** to ask the documentation questions from my editor **so that** implementing a tracking does not mean leaving the code.

[REQ-API-005](requirements/REQ-API.md#req-api-005--oauth-with-user-consent-for-mcp-clients), [REQ-API-010](requirements/REQ-API.md#req-api-010--richer-mcp-read-tools)

**Done when** — the IDE client authenticates by consent and is bound by my grants.

> **R3 gate.** A developer receives everything they need without manual intervention; an analyst queries the documentation from an AI assistant.

---

# R4 and beyond

_R4's scope waits on open decisions O4 and O5; the backlog's on O1 and O2, which the [milestones](milestones.md) place before the end of R2. Stories are written when those close._

#### US-ANL-08 — Judge whether the data is trustworthy · _Analyst_ · E9

**As a** digital analyst **I want** to see top values, occurrence trend and non-conformance rate against what is documented **so that** I know whether to trust a property before I build on it.

R4 · [M4.2](milestones.md#m42--signals-and-conformance-reports) · [REQ-DQ-002](requirements/REQ-DQ.md#req-dq-002--data-quality-signals), [REQ-DQ-003](requirements/REQ-DQ.md#req-dq-003--conformance-reports-no-persisted-state)

**Done when** — signals are segmented by environment and platform, and the conformance check produces a report rather than a state. Persisting the state waits for the backlog.

#### US-DSG-03 — Refresh screenshots when the design changes · _Designer_ · E5

**As a** designer **I want** a page's screenshot re-pulled from its source frame **so that** who refreshes screenshots after a redesign stops being a question of editorial discipline.

R4 · [M4.3](milestones.md#m43--r4-conveniences) · [REQ-DEV-007](requirements/REQ-DEV.md#req-dev-007--figma-frame-import-with-design-refresh), [REQ-DEV-001](requirements/REQ-DEV.md#req-dev-001--figma-frame-links-stored-as-fileid--nodeid)

**Done when** — the stored `file_id` + `node_id` turns the refresh into a button.

#### US-ADM-09 — Offboard a leaver across every project · _Admin_ · E7

**As an** administrator **I want** to see and revoke everything one user can reach **so that** offboarding is not thirty separate edits.

**Not planned — accepted design choice**, [REQ-SEC-003](requirements/REQ-SEC.md#req-sec-003--per-project-access-grants)

**Done when** — it isn't. Grant administration is deliberately one project at a time: every access decision being explicit and individually made is the property the model is buying, and a bulk tool is the mechanism by which access quietly widens. Recorded as a story so the administrative cost is visible rather than discovered, and so reopening it requires stating the trade.

---

## Index by persona

| Persona                 | Stories, in delivery order                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Editor** (US-EDT)     | R1: [01](#us-edt-01--start-a-project-from-the-company-catalogue--editor--e1) [03](#us-edt-03--create-a-tracking-from-a-template--editor--e1) [04](#us-edt-04--add-properties-in-bulk-with-a-module--editor--e1) [05](#us-edt-05--change-a-module-without-disturbing-existing-trackings--editor--e1) [06](#us-edt-06--document-a-nested-data-layer--editor--e1) [07](#us-edt-07--state-when-a-property-is-present--editor--e1) [08](#us-edt-08--record-the-value-a-property-must-take--editor--e1) [09](#us-edt-09--map-a-property-onto-each-analytics-platform--editor--e1) [20](#us-edt-20--verify-an-imported-product-against-its-source--editor--e6) [11](#us-edt-11--paste-a-screenshot-straight-into-the-page--editor--e1) [12](#us-edt-12--write-rich-descriptions-with-diagrams--editor--e1) [13](#us-edt-13--duplicate-a-tracking-instead-of-retyping-it--editor--e1) [27](#us-edt-27--model-an-action-that-exists-on-many-screens--editor--e5) [14](#us-edt-14--not-lose-work-when-a-colleague-saves-first--editor--e1) [15](#us-edt-15--keep-test-credentials-out-of-everything-published--editor--e1) [02](#us-edt-02--catalogue-the-page-hierarchy--editor--e1) [17](#us-edt-17--see-what-i-am-about-to-publish--editor--e3) [18](#us-edt-18--hold-back-work-in-progress-from-a-publication--editor--e3) [19](#us-edt-19--publish-with-a-changelog-i-did-not-write--editor--e3) [28](#us-edt-28--freeze-and-archive-the-source-on-import--editor--e6) [30](#us-edt-30--create-a-new-tracking-on-a-page--editor--e1) [31](#us-edt-31--define-a-data-layer-property--editor--e1) [32](#us-edt-32--add-a-single-property-to-a-tracking--editor--e1) [33](#us-edt-33--remove-a-property-from-a-tracking--editor--e1) [34](#us-edt-34--define-a-module-in-this-project--editor--e1) [35](#us-edt-35--create-a-project-tracking-template--editor--e1) [36](#us-edt-36--customise-the-inherited-default-template-for-this-project--editor--e1) [37](#us-edt-37--deprecate-a-property-without-deleting-it--editor--e1) [38](#us-edt-38--set-the-project-icon--editor--e1) [39](#us-edt-39--add-an-analytics-destination-to-the-project--editor--e1) [40](#us-edt-40--provide-the-standard-front-matter-sections--editor--e1) [41](#us-edt-41--publish-an-immutable-snapshot-of-the-single-draft--editor--e3) · R2: [10](#us-edt-10--document-audiences-and-surveys--editor--e1) [16](#us-edt-16--express-a-conditional-valorisation--editor--e1) [26](#us-edt-26--anchor-a-tracking-to-the-element-that-fires-it--editor--e1) [22](#us-edt-22--apply-one-change-across-a-multi-selection--editor--e1) [21](#us-edt-21--tell-an-agents-edits-from-a-colleagues--editor--e6) [23](#us-edt-23--adopt-a-catalogue-change-i-actually-want--editor--e1) [24](#us-edt-24--know-what-references-a-property-before-deprecating-it--editor--e1) [25](#us-edt-25--undo-a-publication-and-see-who-changed-a-field--editor--e3) [29](#us-edt-29--reuse-the-web-plan-when-documenting-the-app--editor--e1) |
| **Analyst** (US-ANL)    | R1: [02](#us-anl-02--see-everything-tracked-on-a-page--analyst--e2) [01](#us-anl-01--find-which-tracking-sets-a-value--analyst--e2) [05](#us-anl-05--know-when-a-property-first-appeared--analyst--e2) [03](#us-anl-03--understand-what-a-property-means--analyst--e2) · R2: [06](#us-anl-06--pull-the-property-list-into-a-spreadsheet--analyst--e2) [04](#us-anl-04--see-which-audiences-and-surveys-consume-a-property--analyst--e2) · R3: [07](#us-anl-07--ask-my-own-ai-assistant--analyst--e2) · R4: [08](#us-anl-08--judge-whether-the-data-is-trustworthy--analyst--e9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Developer** (US-DEV)  | R1: [01](#us-dev-01--see-only-what-i-have-to-implement--developer--e4) · R2: [02](#us-dev-02--know-what-changed-since-the-last-release--developer--e4) [05](#us-dev-05--receive-a-self-contained-handoff-for-a-release--developer--e4) [07](#us-dev-07--jump-to-the-design-frame--developer--e4) · R3: [03](#us-dev-03--take-a-snippet-rather-than-read-a-table--developer--e4) [04](#us-dev-04--see-only-the-values-that-apply-to-my-scenario--developer--e4) [06](#us-dev-06--read-the-documentation-where-my-team-already-works--developer--e4) [08](#us-dev-08--query-the-plan-from-my-ide--developer--e4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Business** (US-BUS)   | R1: [02](#us-bus-02--know-what-is-in-this-release--business--e3) [05](#us-bus-05--consult-the-documentation-as-it-was-at-a-past-release--business--e3) [01](#us-bus-01--read-the-documentation-without-an-account--business--e3) [04](#us-bus-04--follow-a-customer-journey-end-to-end--business--e5) · R2: [06](#us-bus-06--read-it-outside-the-application--business--e3) [03](#us-bus-03--be-told-when-something-is-published--business--e3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Designer** (US-DSG)   | R1: [01](#us-dsg-01--understand-which-interactions-are-tracked--designer--e5) · R2: [02](#us-dsg-02--see-tracking-anchored-on-the-actual-screen--designer--e5) · R4: [03](#us-dsg-03--refresh-screenshots-when-the-design-changes--designer--e5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Admin / PM** (US-ADM) | R0: [01](#us-adm-01--host-several-companies-on-one-instance--system-administrator--e7) [02](#us-adm-02--give-a-user-access-to-only-their-projects--company-admin--e7) [03](#us-adm-03--bring-the-first-administrator-into-a-fresh-instance--admin--e7) [04](#us-adm-04--invite-a-user-and-let-them-recover-a-lost-password--admin--pm--editor--e7) [10](#us-adm-10--administer-the-deployment-without-seeing-anyones-documentation--operator--admin--e7) · R1: [06](#us-adm-06--open-a-project-to-an-external-audience-for-a-while--pm--e7) [07](#us-adm-07--show-that-a-change-was-made-by-a-named-actor--admin--e7) [11](#us-adm-11--create-the-companys-standard-tracking-template--company-admin--e7) · R2: [08](#us-adm-08--retire-a-project-without-losing-it--admin--e7) [05](#us-adm-05--let-people-in-with-corporate-sso--admin--e7) [10 _portal_](#us-adm-10--administer-the-deployment-without-seeing-anyones-documentation--operator--admin--e7) · not planned: [09](#us-adm-09--offboard-a-leaver-across-every-project--admin--e7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Agent** (US-AGT)      | R1: [01](#us-agt-01--build-a-whole-project-through-the-api--agent--e6) [02](#us-agt-02--re-run-a-corrected-script-safely--agent--e6) [03](#us-agt-03--bring-the-images-across--agent--e6) [04](#us-agt-04--write-thousands-of-records-without-thousands-of-round-trips--agent--e6) [07](#us-agt-07--be-unable-to-publish-delete-a-user-or-change-a-permission--agent--e6) [05](#us-agt-05--check-my-own-work--agent--e6) [06](#us-agt-06--follow-the-house-conventions-without-being-told--agent--e6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Operator** (US-OPS)   | R0: [03](#us-ops-03--upgrade-without-losing-data--operator--e8) [06](#us-ops-06--configure-an-instance-without-touching-code--operator--e8) [05](#us-ops-05--run-without-a-hosted-search-dependency--operator--e8) [01](#us-ops-01--stand-up-an-instance-without-asking-anyone--operator--e8) [02](#us-ops-02--know-what-to-back-up-and-when--operator--e8) [07](#us-ops-07--know-what-content-leaves-the-instance--operator--e8) · R2: [04](#us-ops-04--run-it-on-the-database-my-organisation-supports--operator--e8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Stories the Platform deliberately will not support

Recorded so each is visibly a decision rather than an oversight. Each maps to a `Won't` requirement or an accepted design choice.

| Story someone will ask for                                               | Why not                                                                                                                | Recorded as                                                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| _"Let me approve a change before it publishes."_                         | Editors publish autonomously; review happens at the diff                                                               | [REQ-VER-012](requirements/REQ-VER.md#req-ver-012--branches-merges-approval-workflow-scheduled-deprecation)                                                                             |
| _"Let me branch the documentation for a big redesign."_                  | Single draft stream; branches imply merges                                                                             | [REQ-VER-012](requirements/REQ-VER.md#req-ver-012--branches-merges-approval-workflow-scheduled-deprecation)                                                                             |
| _"Search across all our products at once."_                              | Follows from project isolation, not from effort                                                                        | [REQ-NAV-009](requirements/REQ-NAV.md#req-nav-009--cross-project-search)                                                                             |
| _"Share one property definition between the web and app projects."_      | Properties are fully isolated per project                                                                              | [REQ-DOM-028](requirements/REQ-DOM.md#req-dom-028--no-cross-project-references)                                                                             |
| _"Write the condition as a sentence for now, we'll structure it later."_ | Rejected rather than deferred — the stopgap is what creates the conversion problem                                     | [REQ-DOM-011](requirements/REQ-DOM.md#req-dom-011--prose-conditional-valorisations)                                                                             |
| _"Hide the destination column from developers as a permission."_         | Views are presentation filters, never security boundaries                                                              | [REQ-VIEW-010](requirements/REQ-VIEW.md#req-view-010--dedicated-design-view-field-level-permissions)                                                                           |
| _"Give designers their own view."_                                       | Designers use the Analyst/Business view                                                                                | [REQ-VIEW-010](requirements/REQ-VIEW.md#req-view-010--dedicated-design-view-field-level-permissions)                                                                           |
| _"Grant these forty people access to these six projects."_               | Every grant is explicit and individually made                                                                          | [REQ-SEC-003](requirements/REQ-SEC.md#req-sec-003--per-project-access-grants), [US-ADM-09](#us-adm-09--offboard-a-leaver-across-every-project--admin--e7) |
| _"Derive roles from our identity-provider groups."_                      | Authentication never implies authorisation                                                                             | [REQ-SEC-002](requirements/REQ-SEC.md#req-sec-002--four-company-scoped-roles), [REQ-SEC-004](requirements/REQ-SEC.md#req-sec-004--oidc-sso)                                     |
| _"Read it on my phone."_                                                 | Desktop only; 99% of usage                                                                                             | [REQ-NFR-007](requirements/REQ-NFR.md#req-nfr-007--desktop-only-no-responsive-layout)                                                                             |
| _"Work on it offline."_                                                  | PDF export covers disconnected consultation                                                                            | [REQ-NFR-009](requirements/REQ-NFR.md#req-nfr-009--no-offline-mode)                                                                             |
| _"Edit the git export and sync it back."_                                | One-way by design; no second source of truth                                                                           | [REQ-VIEW-005](requirements/REQ-VIEW.md#req-view-005--git-export-one-commit-per-publication)                                                                           |
| _"Import our wiki through an upload screen."_                            | The Platform holds no knowledge of any source format                                                                   | [REQ-IMP-009](requirements/REQ-IMP.md#req-imp-009--flows-history-internal-links-importer-ui)                                                                             |
| _"Schedule this property to be deprecated next quarter."_                | Deprecation is manual                                                                                                  | [REQ-VER-012](requirements/REQ-VER.md#req-ver-012--branches-merges-approval-workflow-scheduled-deprecation)                                                                             |
| _"Tell me how to analyse this tracking."_                                | A product direction, deliberately carrying no requirement until there is a clear idea of what it is                    | [vision](vision.md)                                                                                                |
| _"Make it screen-reader compliant."_                                     | Built to WCAG AA as a design principle, but not verified and not claimed — what is missing is verification, not intent | [REQ-NFR-013](requirements/REQ-NFR.md#req-nfr-013--wcag-aa-as-a-design-principle-not-a-gate)                                                                             |

## Keeping this current

1. When a story's requirements are all **Verified**, mark the story done — not when they are merely Implemented.
2. When a new capability is proposed, write the story first. A feature with no persona and no job is the signal to stop.
3. When a `Gap` story acquires a requirement, replace the gap marker with the requirement ID and drop the finding reference.
4. When a story moves milestone, move it in this document and keep its ID. The delivery grouping is the point of the file; a story filed under a milestone it is no longer in makes the release gates wrong.
5. Stories never contradict requirements. Where they appear to, the requirement is right and the story needs correcting — or the disagreement is a defect in the record, to be logged under _known inconsistencies_ in the [requirements index](requirements/README.md).

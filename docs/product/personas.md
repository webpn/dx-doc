# Personas

Defined in the functional specification §4.1. Summarized here for convenience.

**Related:** [user stories](user-stories.md) — what each persona needs to get done, traced to the requirements that satisfy it.

| Persona                                      | Role                      | What they do                                                                                                                                                                                                                     | Access                      |
| -------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Tracking specialist / analytics engineer** | Editor                    | Owns the documentation. Specifies trackings, properties, and destination mappings. Verifies implementations.                                                                                                                     | Write                       |
| **Digital analyst**                          | Viewer                    | Consults documentation to understand available data and interpretation.                                                                                                                                                          | Read                        |
| **Business user**                            | Viewer                    | Reviews flows and trackings at a high level for self-service analysis.                                                                                                                                                           | Read                        |
| **Web / app developer**                      | Viewer                    | Consults documentation to know which trackings to implement. Uses development view and code snippets.                                                                                                                            | Read                        |
| **Designer**                                 | Viewer                    | Understands which interactions are tracked, anchored to screenshots. Uses same view as business user.                                                                                                                            | Read                        |
| **Product manager / owner**                  | Project Manager           | Verifies trackings per release. Manages user access on own projects. Consults changelog.                                                                                                                                         | Read + user management      |
| **Company admin**                            | Admin                     | Administers **one company**: creates and configures its projects, configures its integrations, manages its catalogue and branding, reads its audit log, archives and restores its projects. Cannot see or reach another company. | Full, within one company    |
| **System administrator**                     | Instance admin + operator | Administers **the deployment**: creates companies, grants company-admin access, and runs the instance — deploys, configures, upgrades, backs up. Sees no documentation content in any company.                                   | Instance-wide, content-free |
| **AI Agent (MCP)**                           | Per consenting user       | Reads documentation, creates and modifies draft content. Cannot publish, delete users, or change permissions.                                                                                                                    | Per user's grants           |

## System Roles

Four roles, held **within a single company** and combined with per-project access grants. A user belongs to one company; their role applies across that company and is narrowed further by their project grants:

- **Admin** — creates and configures projects _within their company_, configures its integrations, manages its catalogue, reads its audit log, archives and restores its projects. **Creating companies is not an Admin action** — see below.
- **Project Manager** — manages user access on granted projects, manages guest passwords. Does not imply editing rights (also needs Editor role).
- **Editor** — creates and modifies content, publishes versions on granted projects.
- **Viewer** — reads, exports, uses MCP read tools on granted projects.

There is no fifth role and no separate catalogue capability: managing the company catalogue is part of being that company's Admin ([REQ-SEC-010](requirements/REQ-SEC.md), closing O11 on 2026-08-12).

For the complete permission matrix, see the specification Appendix B.

## Company admin vs system administrator

These are two different jobs and the distinction is load-bearing. Conflating them is how a person who runs a server ends up able to read every tenant's documentation.

|                     | **Company admin**                                                                        | **System administrator**                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Scope               | One company                                                                              | The whole deployment                                                                              |
| Held as             | The `Admin` role (REQ-SEC-002)                                                           | The `instance_admin` capability (REQ-SEC-014)                                                     |
| Creates             | Projects, within their company                                                           | **Companies**, and grants company-admin access to them                                            |
| Sees documentation? | Yes — subject to project grants like anyone                                              | **No.** The capability confers no read access to any project in any company                       |
| Also does           | Integrations, catalogue, branding, audit log, archive/restore — all within their company | Deploys, configures, upgrades, backs up the instance                                              |
| Authenticates       | However the company does — SSO or local                                                  | Always retains a working local password, so the instance survives an identity provider being down |

**Neither can do the other's job by default.** A company admin cannot create a company or reach another one. A system administrator cannot read a tracking plan — reaching content still requires a role and a project grant, granted and audited like anyone else's.

**Both hats on one head is normal** in a small deployment, and it is two grants, not one. That is the point: it stays visible in the audit log and can be taken away separately.

### Why the system administrator is listed at all

They are the persona the white-label distribution model exists for, and several requirements are addressed to them and nobody else — backup is theirs (REQ-NFR-006), the instance starts from their README (REQ-FDN-011, REQ-FDN-012), configuration and database choice are theirs (REQ-FDN-013, REQ-FDN-018, REQ-FDN-019), the availability of any given instance is their commitment (REQ-NFR-005), and how they upgrade was open decision O7, closed by [ADR-0015](../adr/0015-schema-migration-strategy.md).

A requirement addressed to an unnamed persona is the one that gets cut first.

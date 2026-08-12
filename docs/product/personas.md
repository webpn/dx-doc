# Personas

Defined in the functional specification §4.1. Summarized here for convenience.

**Related:** [user stories](user-stories.md) — what each persona needs to get done, traced to the requirements that satisfy it.

| Persona | Role | What they do | Access |
|---|---|---|---|
| **Tracking specialist / analytics engineer** | Editor | Owns the documentation. Specifies trackings, properties, and destination mappings. Verifies implementations. | Write |
| **Digital analyst** | Viewer | Consults documentation to understand available data and interpretation. | Read |
| **Business user** | Viewer | Reviews flows and trackings at a high level for self-service analysis. | Read |
| **Web / app developer** | Viewer | Consults documentation to know which trackings to implement. Uses development view and code snippets. | Read |
| **Designer** | Viewer | Understands which interactions are tracked, anchored to screenshots. Uses same view as business user. | Read |
| **Product manager / owner** | Project Manager | Verifies trackings per release. Manages user access on own projects. Consults changelog. | Read + user management |
| **Admin** | Admin | Creates companies and projects. Configures integrations. Manages company catalogue. Reads audit log. Archives/restores projects. | Full |
| **System administrator** | Operator | Deploys, configures, upgrades and backs up the instance. Not a documentation user — may never open the application. | Outside the permission matrix |
| **AI Agent (MCP)** | Per consenting user | Reads documentation, creates and modifies draft content. Cannot publish, delete users, or change permissions. | Per user's grants |

## System Roles

Four global roles, combined with per-project access grants:

- **Admin** — creates companies/projects, configures integrations, manages catalogue, reads audit log, archives/restores projects.
- **Project Manager** — manages user access on granted projects, manages guest passwords. Does not imply editing rights (also needs Editor role).
- **Editor** — creates and modifies content, publishes versions on granted projects.
- **Viewer** — reads, exports, uses MCP read tools on granted projects.

A fifth capability, *manage company catalogue*, is granted individually (open decision O11).

For the complete permission matrix, see the specification Appendix B.

## The system administrator is not an application role

The **system administrator** is the person the white-label distribution model exists for: they run an instance, whether that is the corporate deployment or a third party's. Several requirements are addressed to them and to nobody else — backup is theirs (REQ-NFR-006), the instance starts from their README (REQ-FDN-011, REQ-FDN-012), configuration and database choice are theirs (REQ-FDN-013, REQ-FDN-018, REQ-FDN-019), the availability of any given instance is their commitment (REQ-NFR-005), and open decision O7 is about how they upgrade.

They are listed here because a requirement addressed to an unnamed persona is the one that gets cut first. Two distinctions matter:

- **They are not the Admin role.** Admin is an application role, inside a running instance, subject to the permission matrix. The system administrator operates the deployment and has no application privileges by virtue of doing so.
- **They may hold an application role as well**, and in a small deployment usually will. That is a second hat, granted the same way anyone else's is — not something the operating role confers.
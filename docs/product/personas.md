# Personas

Defined in the functional specification §4.1. Summarized here for convenience.

| Persona | Role | What they do | Access |
|---|---|---|---|
| **Tracking specialist / analytics engineer** | Editor | Owns the documentation. Specifies trackings, properties, and destination mappings. Verifies implementations. | Write |
| **Digital analyst** | Viewer | Consults documentation to understand available data and interpretation. | Read |
| **Business user** | Viewer | Reviews flows and trackings at a high level for self-service analysis. | Read |
| **Web / app developer** | Viewer | Consults documentation to know which trackings to implement. Uses development view and code snippets. | Read |
| **Designer** | Viewer | Understands which interactions are tracked, anchored to screenshots. Uses same view as business user. | Read |
| **Product manager / owner** | Project Manager | Verifies trackings per release. Manages user access on own projects. Consults changelog. | Read + user management |
| **Admin** | Admin | Creates companies and projects. Configures integrations. Manages company catalogue. Reads audit log. Archives/restores projects. | Full |
| **AI Agent (MCP)** | Per consenting user | Reads documentation, creates and modifies draft content. Cannot publish, delete users, or change permissions. | Per user's grants |

## System Roles

Four global roles, combined with per-project access grants:

- **Admin** — creates companies/projects, configures integrations, manages catalogue, reads audit log, archives/restores projects.
- **Project Manager** — manages user access on granted projects, manages guest passwords. Does not imply editing rights (also needs Editor role).
- **Editor** — creates and modifies content, publishes versions on granted projects.
- **Viewer** — reads, exports, uses MCP read tools on granted projects.

A fifth capability, *manage company catalogue*, is granted individually (open decision O11).

For the complete permission matrix, see the specification Appendix B.
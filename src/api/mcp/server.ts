import type { PageService } from '@project/application/page/page-service';
import type { ProjectService } from '@project/application/project/project-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import type {
  DestinationCreateInput,
  ModuleCreateInput,
  PageCreateInput,
  PropertyCreateInput,
  TrackingCreateInput,
} from '@project/application/validation/schemas';

import type { McpRequest, McpResource, McpResourceContent, McpResponse, McpTool } from './types';

/**
 * Naming and documentation guidelines exposed as MCP resource (REQ-API-006).
 */
export const NAMING_GUIDELINES_RESOURCE: McpResource = {
  uri: 'dxdoc://guidelines/naming',
  name: 'Data Layer Naming and Documentation Guidelines',
  description:
    'Standard conventions for events, properties, modules, and specific values in dx-doc',
  mimeType: 'text/markdown',
};

export const NAMING_GUIDELINES_TEXT = `# Data Layer Naming and Documentation Guidelines

## Property Naming Conventions
- Names must use lowercase alphanumeric characters and underscores (\`snake_case\`).
- Explicit names are preferred over generic ones (e.g. \`product_category\` instead of \`category\`).
- Booleans should follow \`is_*\` or \`has_*\` prefixes.
- ISO 8601 timestamps formatted as UTC strings.

## Tracking & Navigation Events
- Screen views attach to specific Page entities.
- Popups/modals are catalogued as Pages.
- Specific values with dynamic parameters use plain bracket placeholders, e.g. \`article_[slug]\`.
`;

export const MCP_TOOLS: McpTool[] = [
  // ── READ TOOLS (REQ-API-003) ─────────────────────────────────
  {
    name: 'list_projects',
    description: 'List accessible projects for the caller',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Company ID' },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'get_page_structure',
    description: 'Retrieve the page hierarchy/structure for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_trackings',
    description: 'Retrieve trackings for a project or specific page',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_tracking',
    description: 'Retrieve tracking details with modules, properties, and specific values',
    inputSchema: {
      type: 'object',
      properties: {
        trackingId: { type: 'string', description: 'Tracking ID' },
      },
      required: ['trackingId'],
    },
  },
  {
    name: 'list_properties',
    description: 'Search and list data layer properties in a project or company catalogue',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Company ID' },
        projectId: { type: 'string', description: 'Project ID (optional, omit for catalogue)' },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'get_property',
    description: 'Retrieve full details of a data layer property',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'Property ID' },
      },
      required: ['propertyId'],
    },
  },
  {
    name: 'get_reconciliation_report',
    description: 'Retrieve the reconciliation report for a project (REQ-IMP-006)',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Company ID' },
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['companyId', 'projectId'],
    },
  },

  // ── WRITE TOOLS — DRAFT ONLY (REQ-API-004) ───────────────────
  // Note: Publication, user deletion, and permission changes have NO MCP tool at all.
  {
    name: 'create_page',
    description: 'Create a Page/Screen in a project draft',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Page name' },
        slug: { type: 'string', description: 'Page slug' },
        parentId: { type: 'string', description: 'Parent Page ID (optional)' },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['projectId', 'name', 'slug'],
    },
  },
  {
    name: 'create_property',
    description: 'Create a Data Layer Property in draft',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Company ID' },
        projectId: { type: 'string', description: 'Project ID (optional)' },
        name: { type: 'string', description: 'Property name' },
        businessLabel: { type: 'string', description: 'Business Label (optional)' },
        type: { type: 'string', description: 'Data type (string, number, boolean, array, object)' },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['companyId', 'name'],
    },
  },
  {
    name: 'create_module',
    description: 'Create a Module bundling properties in draft',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Company ID' },
        projectId: { type: 'string', description: 'Project ID (optional)' },
        name: { type: 'string', description: 'Module name' },
        propertyIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Property IDs to bundle',
        },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['companyId', 'name'],
    },
  },
  {
    name: 'create_destination',
    description: 'Create a unified Destination in draft',
    inputSchema: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: 'Company ID' },
        projectId: { type: 'string', description: 'Project ID (optional)' },
        platform: { type: 'string', description: 'Platform (e.g. GA4, Adobe)' },
        variableType: { type: 'string', description: 'Variable type' },
        identifier: { type: 'string', description: 'Platform variable identifier' },
        name: { type: 'string', description: 'Destination name' },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['companyId', 'platform', 'variableType', 'identifier', 'name'],
    },
  },
  {
    name: 'create_tracking',
    description: 'Create a Tracking event in draft',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        pageId: { type: 'string', description: 'Target Page ID (optional)' },
        navigationEventId: { type: 'string', description: 'Navigation Event ID' },
        name: { type: 'string', description: 'Tracking name' },
        slug: { type: 'string', description: 'Tracking slug' },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['projectId', 'navigationEventId', 'name', 'slug'],
    },
  },
  {
    name: 'apply_module_to_tracking',
    description: 'Apply a Module to a Tracking event in draft',
    inputSchema: {
      type: 'object',
      properties: {
        trackingId: { type: 'string', description: 'Tracking ID' },
        moduleId: { type: 'string', description: 'Module ID' },
      },
      required: ['trackingId', 'moduleId'],
    },
  },
  {
    name: 'remove_property_from_tracking',
    description:
      'Remove a property from tracking with auto module detachment if last (REQ-DOM-008)',
    inputSchema: {
      type: 'object',
      properties: {
        trackingId: { type: 'string', description: 'Tracking ID' },
        propertyId: { type: 'string', description: 'Property ID' },
      },
      required: ['trackingId', 'propertyId'],
    },
  },
];

export class McpServerHandler {
  constructor(
    private readonly projects: ProjectService,
    private readonly pages: PageService,
    private readonly trackingService: TrackingService,
  ) {}

  async handleRequest(userId: string, req: McpRequest): Promise<McpResponse> {
    const id = req.id ?? null;

    switch (req.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'dx-doc-mcp',
              version: '0.1.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: MCP_TOOLS },
        };

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: { resources: [NAMING_GUIDELINES_RESOURCE] },
        };

      case 'resources/read': {
        const uri = req.params?.uri as string | undefined;
        if (uri === NAMING_GUIDELINES_RESOURCE.uri) {
          const content: McpResourceContent = {
            uri: NAMING_GUIDELINES_RESOURCE.uri,
            mimeType: 'text/markdown',
            text: NAMING_GUIDELINES_TEXT,
          };
          return {
            jsonrpc: '2.0',
            id,
            result: { contents: [content] },
          };
        }
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Unknown resource: ${String(uri)}` },
        };
      }

      case 'tools/call': {
        const toolName = req.params?.name as string | undefined;
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
        return this.executeTool(userId, id, toolName, args);
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        };
    }
  }

  private async executeTool(
    userId: string,
    id: string | number | null,
    name: string | undefined,
    args: Record<string, unknown>,
  ): Promise<McpResponse> {
    try {
      switch (name) {
        // --- READ TOOLS ---
        case 'list_projects': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const res = await this.projects.list(userId, companyId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_trackings': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.listTrackingsForProject(userId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_tracking': {
          const trackingId = typeof args.trackingId === 'string' ? args.trackingId : '';
          const res = await this.trackingService.getTracking(userId, trackingId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_properties': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : null;
          const res = await this.trackingService.listProperties(userId, companyId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_property': {
          const propertyId = typeof args.propertyId === 'string' ? args.propertyId : '';
          const res = await this.trackingService.getProperty(userId, propertyId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_reconciliation_report': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.generateReconciliationReport(
            userId,
            companyId,
            projectId,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        // --- WRITE TOOLS (DRAFT ONLY) ---
        case 'create_page': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.pages.create(
            userId,
            projectId,
            args as unknown as PageCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'create_property': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : null;
          const res = await this.trackingService.createProperty(
            userId,
            companyId,
            projectId,
            args as unknown as PropertyCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'create_module': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : null;
          const res = await this.trackingService.createModule(
            userId,
            companyId,
            projectId,
            args as unknown as ModuleCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'create_destination': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : null;
          const res = await this.trackingService.createDestination(
            userId,
            companyId,
            projectId,
            args as unknown as DestinationCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'create_tracking': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.createTracking(
            userId,
            projectId,
            args as unknown as TrackingCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'apply_module_to_tracking': {
          const trackingId = typeof args.trackingId === 'string' ? args.trackingId : '';
          const moduleId = typeof args.moduleId === 'string' ? args.moduleId : '';
          const res = await this.trackingService.applyModuleToTracking(
            userId,
            trackingId,
            moduleId,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'remove_property_from_tracking': {
          const trackingId = typeof args.trackingId === 'string' ? args.trackingId : '';
          const propertyId = typeof args.propertyId === 'string' ? args.propertyId : '';
          const res = await this.trackingService.removePropertyFromTracking(
            userId,
            trackingId,
            propertyId,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool not found: ${String(name)}` },
          };
      }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err instanceof Error ? err.message : 'Internal MCP execution error',
        },
      };
    }
  }

  private formatError(
    id: string | number | null,
    error: { kind: string; issues?: unknown },
  ): McpResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32001,
        message: `Operation failed: ${error.kind}`,
        data: error,
      },
    };
  }
}

import type { PageService } from '@project/application/page/page-service';
import type { ProjectService } from '@project/application/project/project-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import type {
  DestinationCreateInput,
  FlowCreateInput,
  FlowGraphInput,
  ModuleCreateInput,
  NavigationEventCreateInput,
  PageCreateInput,
  PropertyCreateInput,
  TrackingCreateInput,
  TriggerCreateInput,
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
  {
    name: 'list_navigation_events',
    description: 'List navigation events (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_navigation_event',
    description: 'Get a single navigation event by ID',
    inputSchema: {
      type: 'object',
      properties: {
        navigationEventId: { type: 'string', description: 'Navigation Event ID' },
      },
      required: ['navigationEventId'],
    },
  },
  {
    name: 'get_destination',
    description: 'Get a single destination by ID',
    inputSchema: {
      type: 'object',
      properties: {
        destinationId: { type: 'string', description: 'Destination ID' },
      },
      required: ['destinationId'],
    },
  },
  {
    name: 'list_destinations',
    description: 'List destinations in a project or company catalogue',
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
    name: 'get_property_destinations',
    description: 'Get destination mappings for a property (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'Property ID' },
      },
      required: ['propertyId'],
    },
  },
  {
    name: 'list_modules',
    description: 'List modules in a project or company catalogue',
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
    name: 'get_module',
    description: 'Get a single module by ID',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'Module ID' },
      },
      required: ['moduleId'],
    },
  },
  {
    name: 'list_flows',
    description: 'List flows for a project (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_flow',
    description: 'Get a single flow by ID with its nodes and edges',
    inputSchema: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'Flow ID' },
      },
      required: ['flowId'],
    },
  },
  {
    name: 'list_triggers',
    description: 'List triggers for a project (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_trigger',
    description: 'Get a single trigger by ID',
    inputSchema: {
      type: 'object',
      properties: {
        triggerId: { type: 'string', description: 'Trigger ID' },
      },
      required: ['triggerId'],
    },
  },
  {
    name: 'list_versions',
    description: 'List published versions of a project (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_version',
    description: 'Get a specific published version',
    inputSchema: {
      type: 'object',
      properties: {
        versionId: { type: 'string', description: 'Version ID' },
      },
      required: ['versionId'],
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
  {
    name: 'create_navigation_event',
    description: 'Create a Navigation Event required for trackings (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Event name' },
        description: { type: 'string', description: 'Event description (optional)' },
        active: { type: 'boolean', description: 'Whether event is active (default: true)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'set_property_destinations',
    description: 'Map a property to destinations (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'Property ID' },
        destinationIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Destination IDs to map',
        },
        nameOverrides: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Per-destination name overrides (destinationId -> override name)',
        },
      },
      required: ['propertyId', 'destinationIds'],
    },
  },
  {
    name: 'set_specific_value',
    description: 'Set a specific value for a property in a tracking (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        trackingId: { type: 'string', description: 'Tracking ID' },
        propertyId: { type: 'string', description: 'Property ID' },
        value: { type: 'string', description: 'Specific value' },
      },
      required: ['trackingId', 'propertyId', 'value'],
    },
  },
  {
    name: 'create_flow',
    description: 'Create a Flow in draft (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Flow name' },
        description: { type: 'string', description: 'Flow description (optional)' },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'set_flow_graph',
    description: 'Set the nodes and edges of a flow (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        flowId: { type: 'string', description: 'Flow ID' },
        nodes: {
          type: 'array',
          items: { type: 'object' },
          description: 'Flow nodes',
        },
        edges: {
          type: 'array',
          items: { type: 'object' },
          description: 'Flow edges',
        },
      },
      required: ['flowId', 'nodes', 'edges'],
    },
  },
  {
    name: 'create_trigger',
    description: 'Create a Trigger in draft (M1.12)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Trigger name' },
        type: { type: 'string', description: 'Trigger type' },
        trackingId: { type: 'string', description: 'Associated Tracking ID (optional)' },
        customId: { type: 'string', description: 'External source custom_id (optional)' },
      },
      required: ['projectId', 'name', 'type'],
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

        case 'get_page_structure': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.pages.listForProject(userId, projectId);
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

        case 'list_navigation_events': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.listNavigationEvents(userId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_navigation_event': {
          const navigationEventId =
            typeof args.navigationEventId === 'string' ? args.navigationEventId : '';
          const res = await this.trackingService.getNavigationEvent(userId, navigationEventId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_destination': {
          const destinationId = typeof args.destinationId === 'string' ? args.destinationId : '';
          const res = await this.trackingService.getDestination(userId, destinationId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_destinations': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : null;
          const res = await this.trackingService.listDestinations(userId, companyId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_property_destinations': {
          const propertyId = typeof args.propertyId === 'string' ? args.propertyId : '';
          const res = await this.trackingService.getPropertyDestinations(userId, propertyId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_modules': {
          const companyId = typeof args.companyId === 'string' ? args.companyId : '';
          const projectId = typeof args.projectId === 'string' ? args.projectId : null;
          const res = await this.trackingService.listModules(userId, companyId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_module': {
          const moduleId = typeof args.moduleId === 'string' ? args.moduleId : '';
          const res = await this.trackingService.getModule(userId, moduleId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_flows': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.listFlowsForProject(userId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_flow': {
          const flowId = typeof args.flowId === 'string' ? args.flowId : '';
          const res = await this.trackingService.getFlow(userId, flowId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_triggers': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.listTriggersForProject(userId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_trigger': {
          const triggerId = typeof args.triggerId === 'string' ? args.triggerId : '';
          const res = await this.trackingService.getTrigger(userId, triggerId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'list_versions': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.listVersionsForProject(userId, projectId);
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'get_version': {
          const versionId = typeof args.versionId === 'string' ? args.versionId : '';
          const res = await this.trackingService.getVersion(userId, versionId);
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

        case 'create_navigation_event': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.createNavigationEvent(
            userId,
            projectId,
            args as unknown as NavigationEventCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'set_property_destinations': {
          const propertyId = typeof args.propertyId === 'string' ? args.propertyId : '';
          const destinationIds = Array.isArray(args.destinationIds) ? args.destinationIds : [];
          const nameOverrides = (args.nameOverrides ?? {}) as Record<string, string>;
          const mappings = (destinationIds as string[]).map((destId) => ({
            destinationId: destId,
            destinationNameOverride: nameOverrides[destId] ?? null,
          }));
          const res = await this.trackingService.setPropertyDestinations(
            userId,
            propertyId,
            mappings,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'set_specific_value': {
          const trackingId = typeof args.trackingId === 'string' ? args.trackingId : '';
          const propertyId = typeof args.propertyId === 'string' ? args.propertyId : '';
          const value = typeof args.value === 'string' ? args.value : '';
          // Find the TrackingProperty ID by getting the tracking and finding the property
          const trackingRes = await this.trackingService.getTracking(userId, trackingId);
          if (!trackingRes.ok) return this.formatError(id, trackingRes.error);
          const trackingProp = trackingRes.value.properties.find(
            (p) => p.propertyId === propertyId,
          );
          if (!trackingProp) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32001,
                message: 'Property not found on tracking',
              },
            };
          }
          const res = await this.trackingService.setSpecificValue(userId, trackingProp.id, {
            value,
          });
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'create_flow': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.createFlow(
            userId,
            projectId,
            args as unknown as FlowCreateInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'set_flow_graph': {
          const flowId = typeof args.flowId === 'string' ? args.flowId : '';
          const res = await this.trackingService.setFlowGraph(
            userId,
            flowId,
            args as unknown as FlowGraphInput,
          );
          if (!res.ok) return this.formatError(id, res.error);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(res.value) }] },
          };
        }

        case 'create_trigger': {
          const projectId = typeof args.projectId === 'string' ? args.projectId : '';
          const res = await this.trackingService.createTrigger(
            userId,
            projectId,
            args as unknown as TriggerCreateInput,
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

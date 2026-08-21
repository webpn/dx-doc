import { z } from 'zod';

/**
 * Shared, single-source validation schemas for the M0.5 REST entities
 * (REQ-FDN-010, ADR-0022). These define the rules once; the application
 * services and every transport validate through them. They describe the wire
 * format but own no business rule beyond field shape.
 */

/** Project platform codes — must match the schema `projects.platform` CHECK. */
export const PLATFORMS = ['web', 'ios', 'android', 'flutter', 'react'] as const;
export type Platform = (typeof PLATFORMS)[number];

const slug = z
  .string()
  .trim()
  .min(1, 'slug is required')
  .max(120, 'slug must be 120 characters or fewer')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase letters, digits and single hyphens');

/**
 * An optional `custom_id` — the orthogonal idempotency key (REQ-IMP-003, D30).
 * It is never a foreign key; dx-doc references always use the immutable `id`.
 */
const optionalCustomId = z
  .string()
  .trim()
  .min(1, 'custom_id must not be empty')
  .max(200, 'custom_id must be 200 characters or fewer');

export const companyCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  slug,
  /**
   * Optional first-Admin provisioning (REQ-SEC-014): a freshly created
   * company otherwise has no member who could pass `canInCompany`, so
   * nothing in the API could create its first Admin. Supplying this at
   * creation seeds one Admin user in the same operation, mirroring how
   * `BootstrapService` seeds the instance administrator.
   */
  firstAdmin: z
    .object({
      email: z.string().trim().pipe(z.email('email must be a valid email address')),
      password: z.string().min(8, 'password must be at least 8 characters').optional(),
    })
    .optional(),
});
export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;

export const companyUpdateSchema = companyCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

export const projectCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  slug,
  description: z.string().max(4000, 'description must be 4000 characters or fewer').optional(),
  icon: z.string().max(200, 'icon must be 200 characters or fewer').optional(),
  platform: z.enum(PLATFORMS, {
    message: 'platform must be one of web, ios, android, flutter, react',
  }),
  tagManager: z.string().max(200, 'tag_manager must be 200 characters or fewer').optional(),
  customId: optionalCustomId.optional(),
});
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const pageCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  slug,
  parentId: z.string().min(1, 'parent_id must not be empty').optional(),
  customId: optionalCustomId.optional(),
});
export type PageCreateInput = z.infer<typeof pageCreateSchema>;

export const pageUpdateSchema = pageCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;

export const PROPERTY_DATA_SOURCES = ['development', 'tag_manager', 'other'] as const;
export const PROPERTY_DATA_TYPES = ['string', 'number', 'boolean', 'array', 'object'] as const;
export const PROPERTY_STATUSES = ['active', 'deprecated'] as const;
export const PRESENCE_VALUES = ['always', 'sometimes', 'never'] as const;

export const propertyCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  businessLabel: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  dataSource: z.enum(PROPERTY_DATA_SOURCES).optional().default('development'),
  type: z.enum(PROPERTY_DATA_TYPES).optional().default('string'),
  formatPattern: z.string().max(500).optional(),
  allowedValues: z.array(z.string()).optional(),
  exampleValues: z.array(z.string()).optional(),
  piiFlag: z.boolean().optional().default(false),
  hashingPolicy: z.string().max(200).optional(),
  status: z.enum(PROPERTY_STATUSES).optional().default('active'),
  analysisNotes: z.string().max(2000).optional(),
  aepFieldGroup: z.string().max(200).optional(),
  parentPropertyId: z.string().min(1).optional(),
  derivedFrom: z.array(z.string()).optional(),
  customId: optionalCustomId.optional(),
});
export type PropertyCreateInput = z.input<typeof propertyCreateSchema>;
export type PropertyCreateOutput = z.output<typeof propertyCreateSchema>;

export const propertyUpdateSchema = propertyCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;

export const moduleCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  description: z.string().max(2000).optional(),
  propertyIds: z.array(z.string()).optional().default([]),
  customId: optionalCustomId.optional(),
});
export type ModuleCreateInput = z.input<typeof moduleCreateSchema>;
export type ModuleCreateOutput = z.output<typeof moduleCreateSchema>;

export const destinationCreateSchema = z.object({
  platform: z.string().trim().min(1, 'platform is required').max(100),
  variableType: z.string().trim().min(1, 'variableType is required').max(100),
  identifier: z.string().trim().min(1, 'identifier is required').max(200),
  name: z.string().trim().min(1, 'name is required').max(120),
  reconciliationIdentifier: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  platformAttributes: z.record(z.string(), z.unknown()).optional(),
  customId: optionalCustomId.optional(),
});
export type DestinationCreateInput = z.infer<typeof destinationCreateSchema>;

export const destinationUpdateSchema = destinationCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type DestinationUpdateInput = z.infer<typeof destinationUpdateSchema>;

export const moduleUpdateSchema = moduleCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type ModuleUpdateInput = z.infer<typeof moduleUpdateSchema>;

export const trackingTemplateCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  description: z.string().max(2000).optional(),
  navigationEventId: z.string().min(1).optional(),
  configJson: z.string().optional(),
  customId: optionalCustomId.optional(),
});
export type TrackingTemplateCreateInput = z.input<typeof trackingTemplateCreateSchema>;
export type TrackingTemplateCreateOutput = z.output<typeof trackingTemplateCreateSchema>;

export const trackingTemplateUpdateSchema = trackingTemplateCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type TrackingTemplateUpdateInput = z.infer<typeof trackingTemplateUpdateSchema>;

export const freePageCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'title is required')
    .max(200, 'title must be 200 characters or fewer'),
  slug,
  content: z.string().default(''),
  publishable: z.boolean().optional().default(true),
  customId: optionalCustomId.optional(),
});
export type FreePageCreateInput = z.input<typeof freePageCreateSchema>;
export type FreePageCreateOutput = z.output<typeof freePageCreateSchema>;

export const freePageUpdateSchema = freePageCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type FreePageUpdateInput = z.infer<typeof freePageUpdateSchema>;

export const navigationEventCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional().default(true),
});
export type NavigationEventCreateInput = z.input<typeof navigationEventCreateSchema>;
export type NavigationEventCreateOutput = z.output<typeof navigationEventCreateSchema>;

export const navigationEventUpdateSchema = navigationEventCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type NavigationEventUpdateInput = z.infer<typeof navigationEventUpdateSchema>;

export const trackingCreateSchema = z.object({
  templateId: z.string().min(1).optional(),
  pageId: z.string().min(1).optional(),
  navigationEventId: z.string().min(1, 'navigationEventId is required'),
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  slug,
  description: z.string().max(5000).optional(),
  customId: optionalCustomId.optional(),
});
export type TrackingCreateInput = z.infer<typeof trackingCreateSchema>;

export const trackingUpdateSchema = trackingCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type TrackingUpdateInput = z.infer<typeof trackingUpdateSchema>;

export const trackingPropertyPresenceSchema = z.object({
  presence: z.enum(PRESENCE_VALUES),
  expectedUpdatedAt: z.string().optional(),
});
export type TrackingPropertyPresenceInput = z.infer<typeof trackingPropertyPresenceSchema>;

export const specificValueCreateSchema = z.object({
  value: z.string().min(1, 'value is required'),
  description: z.string().max(2000).optional(),
});
export type SpecificValueCreateInput = z.infer<typeof specificValueCreateSchema>;

export const flowCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  slug,
  description: z.string().max(5000).optional(),
  customId: optionalCustomId.optional(),
});
export type FlowCreateInput = z.input<typeof flowCreateSchema>;
export type FlowCreateOutput = z.output<typeof flowCreateSchema>;

export const flowUpdateSchema = flowCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type FlowUpdateInput = z.infer<typeof flowUpdateSchema>;

export const triggerCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(120, 'name must be 120 characters or fewer'),
  description: z.string().max(2000).optional(),
  trackingIds: z.array(z.string()).optional().default([]),
  customId: optionalCustomId.optional(),
});
export type TriggerCreateInput = z.input<typeof triggerCreateSchema>;
export type TriggerCreateOutput = z.output<typeof triggerCreateSchema>;

export const triggerUpdateSchema = triggerCreateSchema.partial().extend({
  expectedUpdatedAt: z.string().optional(),
});
export type TriggerUpdateInput = z.infer<typeof triggerUpdateSchema>;

export const flowNodeSchema = z.object({
  id: z.string().min(1).optional(),
  nodeType: z.enum(['page', 'trigger']),
  pageId: z.string().min(1).optional(),
  triggerId: z.string().min(1).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});
export type FlowNodeInput = z.infer<typeof flowNodeSchema>;

export const flowEdgeSchema = z.object({
  id: z.string().min(1).optional(),
  fromNodeId: z.string().min(1, 'fromNodeId is required'),
  toNodeId: z.string().min(1, 'toNodeId is required'),
  label: z.string().max(200).optional(),
  conditionDescription: z.string().max(2000).optional(),
});
export type FlowEdgeInput = z.infer<typeof flowEdgeSchema>;

export const flowGraphSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});
export type FlowGraphInput = z.infer<typeof flowGraphSchema>;

export const publishVersionSchema = z.object({
  title: z.string().max(200).optional(),
  releaseNotes: z.string().max(10000).optional(),
  excludedTrackingIds: z.array(z.string()).optional().default([]),
  excludedPageIds: z.array(z.string()).optional().default([]),
  excludedFlowIds: z.array(z.string()).optional().default([]),
});
export type PublishVersionInput = z.input<typeof publishVersionSchema>;
export type PublishVersionOutput = z.output<typeof publishVersionSchema>;

export const projectSharedPasswordCreateSchema = z.object({
  password: z.string().min(6, 'password must be at least 6 characters'),
  label: z.string().max(100).optional(),
  expiresAt: z.string().optional(),
});
export type ProjectSharedPasswordCreateInput = z.infer<typeof projectSharedPasswordCreateSchema>;

export const projectSharedPasswordVerifySchema = z.object({
  password: z.string().min(1, 'password is required'),
});
export type ProjectSharedPasswordVerifyInput = z.infer<typeof projectSharedPasswordVerifySchema>;

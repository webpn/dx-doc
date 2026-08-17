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
});
export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;

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

export const projectUpdateSchema = projectCreateSchema.partial();
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

export const pageUpdateSchema = pageCreateSchema.partial();
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

export const propertyUpdateSchema = propertyCreateSchema.partial();
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

export const trackingCreateSchema = z.object({
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

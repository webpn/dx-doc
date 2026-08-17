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

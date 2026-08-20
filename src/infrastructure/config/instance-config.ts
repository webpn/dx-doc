import { z } from 'zod';

/**
 * Instance-level configuration (REQ-FDN-013, ADR-0014).
 *
 * Only operator/instance settings live here, read from the environment.
 * Company-level configuration (SSO connections, supported login methods,
 * locales, branding, catalogue defaults, SMTP override) lives in the database
 * and is edited by each company's Admin — it is never read from the
 * environment at request time.
 *
 * The environment-variable matrix (README and .env.example) is reproduced from
 * this module; a test fails when they diverge (REQ-FDN-013 acceptance).
 */

export interface InstanceVariableDef {
  /** Environment variable name. */
  key: string;
  /** Set when the instance must not start without it (READMEE "Required"). */
  required: boolean;
  /** Default when unset; undefined means "must be provided" (required) or optional. */
  default?: string;
  /** One-line purpose shown in the README table. */
  purpose: string;
}

export const INSTANCE_VARIABLES: readonly InstanceVariableDef[] = [
  {
    key: 'APP_URL',
    required: true,
    purpose: 'Public base URL; also derives the OIDC redirect URI',
  },
  {
    key: 'APP_SECRET',
    required: true,
    purpose: 'Signing key for sessions and encrypted company-level secrets',
  },
  { key: 'APP_ENV', required: false, default: 'development', purpose: 'Runtime environment' },
  {
    key: 'APP_DEFAULT_LOCALE',
    required: false,
    default: 'en',
    purpose: 'Interface language fallback before any company context exists',
  },
  {
    key: 'DB_DRIVER',
    required: false,
    default: 'sqlite',
    purpose: 'Persistence adapter: sqlite (default), mariadb or postgres (R2)',
  },
  {
    key: 'DB_FILE',
    required: false,
    default: './var/db/dxdoc.sqlite',
    purpose: 'SQLite database file path',
  },
  { key: 'DB_HOST', required: false, purpose: 'Server database host (R2)' },
  { key: 'DB_PORT', required: false, purpose: 'Server database port (R2)' },
  { key: 'DB_NAME', required: false, purpose: 'Server database name (R2)' },
  { key: 'DB_USER', required: false, purpose: 'Server database user (R2)' },
  { key: 'DB_PASSWORD', required: false, purpose: 'Server database password (R2)' },
  {
    key: 'DB_POOL_SIZE',
    required: false,
    default: '10',
    purpose: 'Server database pool size (R2)',
  },
  {
    key: 'DB_SSL_MODE',
    required: false,
    default: 'preferred',
    purpose: 'Server database SSL mode (R2)',
  },
  {
    key: 'STORAGE_S3_ENDPOINT',
    required: true,
    purpose: 'S3-compatible object storage endpoint',
  },
  { key: 'STORAGE_S3_REGION', required: true, purpose: 'S3-compatible object storage region' },
  { key: 'STORAGE_S3_BUCKET', required: true, purpose: 'S3-compatible object storage bucket' },
  {
    key: 'STORAGE_S3_ACCESS_KEY',
    required: true,
    purpose: 'S3-compatible object storage access key',
  },
  {
    key: 'STORAGE_S3_SECRET_KEY',
    required: true,
    purpose: 'S3-compatible object storage secret key',
  },
  {
    key: 'STORAGE_S3_FORCE_PATH_STYLE',
    required: false,
    default: 'true',
    purpose: 'Required by providers using path-style addressing (MinIO, B2)',
  },
  {
    key: 'STORAGE_PUBLIC_BASE_URL',
    required: false,
    purpose: 'Public URL prefix for stored assets, if different from the endpoint',
  },
  {
    key: 'UPLOAD_MAX_BYTES',
    required: false,
    default: '10485760',
    purpose: 'Maximum asset upload size',
  },
  {
    key: 'IMAGE_MAX_DIMENSION',
    required: false,
    default: '2000',
    purpose: 'Automatic image resize threshold, px per side',
  },
  {
    key: 'BOOTSTRAP_ADMIN_EMAIL',
    required: false,
    purpose: 'Read once, against an empty database, to create the first instance_admin',
  },
  {
    key: 'BOOTSTRAP_ADMIN_PASSWORD',
    required: false,
    purpose: 'Read once, against an empty database, to create the first instance_admin',
  },
  {
    key: 'SEARCH_DRIVER',
    required: false,
    default: 'pagefind',
    purpose: 'Search adapter; hosted adapters arrive later',
  },
  {
    key: 'SEARCH_INDEX_PATH',
    required: false,
    default: './var/search',
    purpose: 'Default search index location on local disk',
  },
  { key: 'SMTP_HOST', required: false, purpose: 'Instance-wide email fallback host' },
  { key: 'SMTP_PORT', required: false, default: '587', purpose: 'SMTP transport port' },
  { key: 'SMTP_USER', required: false, purpose: 'SMTP transport user' },
  { key: 'SMTP_PASSWORD', required: false, purpose: 'SMTP transport password' },
  {
    key: 'SMTP_FROM',
    required: false,
    default: 'noreply@localhost',
    purpose: 'Default sender address',
  },
  { key: 'SMTP_TLS', required: false, default: 'true', purpose: 'SMTP transport security' },
  {
    key: 'SENTRY_DSN',
    required: false,
    purpose: 'Error tracking (R1); the application runs normally with none',
  },
  { key: 'AUDIT_RETENTION_MONTHS', required: false, default: '24', purpose: 'Audit log retention' },
  { key: 'AUTH_SESSION_TTL', required: false, default: '8h', purpose: 'Session expiry' },
  { key: 'LOG_LEVEL', required: false, default: 'info', purpose: 'Structured log verbosity' },
];

/** Error thrown at boot when a required instance variable is missing (REQ-FDN-013). */
export class InstanceConfigError extends Error {
  readonly missingVariables: readonly string[];

  constructor(missingVariables: readonly string[]) {
    super(
      `Instance configuration is incomplete. Missing required variable${
        missingVariables.length === 1 ? '' : 's'
      }: ${missingVariables.join(', ')}.`,
    );
    this.name = 'InstanceConfigError';
    this.missingVariables = missingVariables;
  }
}

function toBool(value: string | undefined): boolean | undefined {
  return value === undefined ? undefined : value === 'true';
}

const instanceEnvSchema = z.object({
  APP_URL: z.string().trim().min(1),
  APP_SECRET: z.string().trim().min(1),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_DEFAULT_LOCALE: z.string().trim().default('en'),

  DB_DRIVER: z.enum(['sqlite', 'mariadb', 'postgres']).default('sqlite'),
  DB_FILE: z.string().trim().default('./var/db/dxdoc.sqlite'),
  DB_HOST: z.string().trim().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_NAME: z.string().trim().optional(),
  DB_USER: z.string().trim().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
  DB_SSL_MODE: z.enum(['preferred', 'required', 'disabled']).default('preferred'),

  STORAGE_S3_ENDPOINT: z.string().trim().min(1),
  STORAGE_S3_REGION: z.string().trim().min(1),
  STORAGE_S3_BUCKET: z.string().trim().min(1),
  STORAGE_S3_ACCESS_KEY: z.string().trim().min(1),
  STORAGE_S3_SECRET_KEY: z.string().min(1),
  STORAGE_S3_FORCE_PATH_STYLE: z.preprocess(toBool, z.boolean()).default(true),
  STORAGE_PUBLIC_BASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760),
  IMAGE_MAX_DIMENSION: z.coerce.number().int().positive().default(2000),

  BOOTSTRAP_ADMIN_EMAIL: z.string().trim().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),

  SEARCH_DRIVER: z.enum(['pagefind']).default('pagefind'),
  SEARCH_INDEX_PATH: z.string().trim().default('./var/search'),

  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().trim().default('noreply@localhost'),
  SMTP_TLS: z.preprocess(toBool, z.boolean()).default(true),

  SENTRY_DSN: z.string().trim().optional(),

  AUDIT_RETENTION_MONTHS: z.coerce.number().int().positive().default(24),
  AUTH_SESSION_TTL: z
    .string()
    .trim()
    .regex(/^\d+[smhd]$/, 'AUTH_SESSION_TTL must look like 8h, 30m, 60s, 1d')
    .default('8h'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type InstanceConfig = z.infer<typeof instanceEnvSchema>;

const REQUIRED_VARIABLE_KEYS: readonly string[] = INSTANCE_VARIABLES.filter(
  (def) => def.required,
).map((def) => def.key);

/**
 * Load and validate the instance configuration from the environment.
 *
 * Refuses to run when a required variable is missing, naming each one
 * (REQ-FDN-013 acceptance). Unknown variables are ignored; malformed values
 * fail with the variable name in the error.
 */
export function loadInstanceConfig(env: NodeJS.ProcessEnv = process.env): InstanceConfig {
  const missing = REQUIRED_VARIABLE_KEYS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === '';
  });
  if (missing.length > 0) {
    throw new InstanceConfigError(missing);
  }
  return instanceEnvSchema.parse(env);
}

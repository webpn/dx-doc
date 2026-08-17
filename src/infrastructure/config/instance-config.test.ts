import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { INSTANCE_VARIABLES, InstanceConfigError, loadInstanceConfig } from './instance-config';

const REQUIRED: Record<string, string> = {
  APP_URL: 'https://dxdoc.example.com',
  APP_SECRET: 'a-very-long-random-signing-secret',
  STORAGE_S3_ENDPOINT: 'http://localhost:9000',
  STORAGE_S3_REGION: 'us-east-1',
  STORAGE_S3_BUCKET: 'dxdoc-assets',
  STORAGE_S3_ACCESS_KEY: 'minioadmin',
  STORAGE_S3_SECRET_KEY: 'minioadmin',
};

function envWith(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...REQUIRED, ...overrides };
}

describe('loadInstanceConfig', () => {
  it('refuses to run when a required variable is missing, naming it', () => {
    const { APP_URL: _omitted, ...withoutAppUrl } = REQUIRED;

    expect(() => loadInstanceConfig(withoutAppUrl)).toThrow(InstanceConfigError);
    expect(() => loadInstanceConfig(withoutAppUrl)).toThrow(/APP_URL/);
  });

  it('names every missing required variable, not just the first', () => {
    const missing = {
      STORAGE_S3_ENDPOINT: 'http://localhost:9000',
      STORAGE_S3_BUCKET: 'dxdoc-assets',
      STORAGE_S3_ACCESS_KEY: 'minioadmin',
      STORAGE_S3_SECRET_KEY: 'minioadmin',
    };

    try {
      loadInstanceConfig(missing);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InstanceConfigError);
      if (error instanceof InstanceConfigError) {
        expect(error.missingVariables).toEqual(
          expect.arrayContaining(['APP_URL', 'APP_SECRET', 'STORAGE_S3_REGION']),
        );
        expect(error.message).toContain('APP_URL');
        expect(error.message).toContain('STORAGE_S3_REGION');
      }
    }
  });

  it('applies defaults for optional variables', () => {
    const config = loadInstanceConfig(envWith());

    expect(config.DB_DRIVER).toBe('sqlite');
    expect(config.DB_FILE).toBe('./var/db/dxdoc.sqlite');
    expect(config.SEARCH_DRIVER).toBe('pagefind');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.AUTH_SESSION_TTL).toBe('8h');
    expect(config.STORAGE_S3_FORCE_PATH_STYLE).toBe(true);
    expect(config.AUDIT_RETENTION_MONTHS).toBe(24);
  });

  it('coerces value-taking variables to their declared types and ignores unknown ones', () => {
    const config = loadInstanceConfig(
      envWith({ UPLOAD_MAX_BYTES: '512000', SMTP_TLS: 'false', UNKNOWN_VAR: 'x' }),
    );

    expect(config.UPLOAD_MAX_BYTES).toBe(512000);
    expect(config.SMTP_TLS).toBe(false);
  });

  it('rejects a malformed value naming the variable', () => {
    expect(() => loadInstanceConfig(envWith({ LOG_LEVEL: 'chatty' }))).toThrow(/LOG_LEVEL/);
    expect(() => loadInstanceConfig(envWith({ AUTH_SESSION_TTL: '2weeks' }))).toThrow(
      /AUTH_SESSION_TTL/,
    );
  });
});

describe('environment variable matrix sync (REQ-FDN-013)', () => {
  const matrixKeys = INSTANCE_VARIABLES.map((def) => def.key).sort();

  function readmarkdownTableKeys(filePath: string): string[] {
    const keys: string[] = [];
    for (const line of readFileSync(path.join(process.cwd(), filePath), 'utf8').split('\n')) {
      if (!line.startsWith('| `')) {
        continue;
      }
      // Only the first cell lists the variable(s); merged cells hold several:
      // | `DB_HOST`, `DB_PORT` | ... Prose cells may mention other variables.
      const firstCell = line.split('|')[1] ?? '';
      for (const match of firstCell.matchAll(/`([A-Z][A-Z0-9_]*)`/g)) {
        const key = match[1];
        if (key) {
          keys.push(key);
        }
      }
    }
    return keys;
  }

  function readEnvExampleKeys(filePath: string): string[] {
    // Optional (R2) variables are documented commented out: # DB_HOST=localhost
    return [
      ...readFileSync(path.join(process.cwd(), filePath), 'utf8').matchAll(
        /^#? ?([A-Z][A-Z0-9_]*)=/gm,
      ),
    ].map((match) => match[1] ?? '');
  }

  it('matches the README environment-variable table', () => {
    const readmeKeys = readmarkdownTableKeys('README.md').sort();

    expect(readmeKeys).toEqual(matrixKeys);
  });

  it('matches .env.example', () => {
    const envExampleKeys = readEnvExampleKeys('.env.example').sort();

    expect(envExampleKeys).toEqual(matrixKeys);
  });
});

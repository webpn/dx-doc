import { defineConfig, devices } from '@playwright/test';

// The E2E suite runs against the real production wiring (REQ-FDN-023/024):
// a fresh SQLite file, migrated, with bootstrap env vars set so the server's
// own first-run bootstrap creates the instance administrator — no seeded
// database and no direct API setup (M1.15 acceptance-path constraint).
// MinIO and SMTP must already be reachable (see e2e/README.md); CI provides
// them as service containers, matching the Vitest infrastructure suites.
const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // `channel` uses a browser already installed on the machine instead of
      // Playwright's own download. Set PLAYWRIGHT_CHANNEL=chrome (or msedge) on
      // networks where cdn.playwright.dev is unreachable; CI leaves it unset and
      // uses the pinned bundled build.
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL === undefined
          ? {}
          : { channel: process.env.PLAYWRIGHT_CHANNEL }),
      },
    },
  ],
  webServer: {
    command: 'npm run test:e2e:server',
    url: BASE_URL,
    reuseExistingServer: false,
    // Generous: this boots tsx + migrations + the real server, and on a
    // OneDrive-backed working copy module resolution alone can take a minute.
    timeout: 180_000,
    env: {
      APP_URL: BASE_URL,
      APP_SECRET: 'e2e-test-secret-do-not-use-in-production',
      APP_ENV: 'test',
      DB_DRIVER: 'sqlite',
      DB_FILE: './var/e2e/dxdoc-e2e.sqlite',
      STORAGE_S3_ENDPOINT: process.env.S3_TEST_ENDPOINT ?? 'http://127.0.0.1:9000',
      STORAGE_S3_REGION: process.env.S3_TEST_REGION ?? 'us-east-1',
      STORAGE_S3_BUCKET: process.env.S3_TEST_BUCKET ?? 'dxdoc-test-bucket',
      STORAGE_S3_ACCESS_KEY: process.env.S3_TEST_ACCESS_KEY ?? 'minioadmin',
      STORAGE_S3_SECRET_KEY: process.env.S3_TEST_SECRET_KEY ?? 'minioadmin',
      STORAGE_S3_FORCE_PATH_STYLE: 'true',
      SMTP_HOST: process.env.SMTP_TEST_HOST ?? '127.0.0.1',
      SMTP_PORT: process.env.SMTP_TEST_PORT ?? '1025',
      SMTP_TLS: 'false',
      BOOTSTRAP_ADMIN_EMAIL: 'admin@e2e.test',
      BOOTSTRAP_ADMIN_PASSWORD: 'bootstrap-password-1',
      PORT: String(PORT),
      HOST: '127.0.0.1',
    },
  },
});

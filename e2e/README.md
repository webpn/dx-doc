# End-to-end tests

Playwright acceptance tests that exercise the real production wiring
(REQ-FDN-023/024): a fresh SQLite database, migrated on startup, with
bootstrap env vars set so the server's own first-run bootstrap creates the
instance administrator. There is no seeded database and no direct API setup —
every acceptance path starts from a clean instance, the same way a real
deployment would.

## Prerequisites

The suite needs an SMTP catcher and an S3-compatible object store reachable
before it starts the server. Locally, start them with the reference Docker
Compose stack:

```bash
docker compose up -d mailpit minio minio-init
```

This starts Mailpit (SMTP on `:1025`) and MinIO (S3 API on `:9000`) and
creates the bucket the app expects. CI provides the same two services as
service containers instead.

By default the suite expects a bucket named `dxdoc-test-bucket` — separate
from the `dxdoc-assets` bucket used by the reference stack, so E2E runs never
share state with local manual testing. Create it once with:

```bash
docker compose exec minio-init mc mb --ignore-existing local/dxdoc-test-bucket
```

or point the suite at a different bucket/endpoint with the env vars below.

## Running the suite

```bash
npm run test:e2e
```

This runs `playwright test`, which starts a dedicated server
(`npm run test:e2e:server`, see `scripts/e2e-server.mjs`) on port `3101`
against a fresh `./var/e2e/dxdoc-e2e.sqlite` database, waits for it to
respond, runs the tests, and tears it down.

## Configuration

All server configuration for the suite is set by the `webServer.env` block in
`playwright.config.ts` — the E2E server boots through the same entry point
and config schema as any other environment (`src/api/server.ts`,
`src/infrastructure/config/instance-config.ts`); no test-only wiring exists.

A few values can be overridden from the host environment before running
`npm run test:e2e`, useful for pointing the suite at CI service containers
instead of local Docker Compose:

| Variable             | Default                 | Purpose                  |
| -------------------- | ----------------------- | ------------------------ |
| `S3_TEST_ENDPOINT`   | `http://127.0.0.1:9000` | S3-compatible endpoint   |
| `S3_TEST_REGION`     | `us-east-1`             | S3 region                |
| `S3_TEST_BUCKET`     | `dxdoc-test-bucket`     | Bucket used by the suite |
| `S3_TEST_ACCESS_KEY` | `minioadmin`            | S3 access key            |
| `S3_TEST_SECRET_KEY` | `minioadmin`            | S3 secret key            |
| `SMTP_TEST_HOST`     | `127.0.0.1`             | SMTP catcher host        |
| `SMTP_TEST_PORT`     | `1025`                  | SMTP catcher port        |

Everything else (app secret, bootstrap admin credentials, database file,
port) is fixed by `playwright.config.ts` and is not meant to be overridden.

## Troubleshooting

- **Server fails to start / times out**: confirm MinIO and Mailpit are
  running and reachable at the configured endpoints, and that the target
  bucket exists.
- **Stale database**: `scripts/e2e-server.mjs` removes any leftover
  `./var/e2e/dxdoc-e2e.sqlite` before each run, so a failed previous run
  cannot leave the suite in an inconsistent state.

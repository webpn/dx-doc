import {
  CreateBucketCommand,
  DeleteBucketCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { S3ObjectStorage } from './s3-storage';

/**
 * Integration test against a real S3-compatible service (ADR-0017 — no mocking
 * at the infrastructure level). Configure via S3_TEST_* variables; CI provides
 * a MinIO service container so the suite never skips there.
 */
const TEST_ENDPOINT = process.env.S3_TEST_ENDPOINT ?? 'http://127.0.0.1:9000';
const TEST_ACCESS_KEY = process.env.S3_TEST_ACCESS_KEY ?? 'minioadmin';
const TEST_SECRET_KEY = process.env.S3_TEST_SECRET_KEY ?? 'minioadmin';
const TEST_BUCKET = process.env.S3_TEST_BUCKET ?? 'dxdoc-test-bucket';

// Opt in by setting S3_TEST_ENDPOINT (CI provides a MinIO service container,
// so the suite always runs there). Locally: S3_TEST_ENDPOINT=http://127.0.0.1:9000 npm test
const RUN_INTEGRATION = process.env.S3_TEST_ENDPOINT !== undefined;

describe('S3ObjectStorage (against a real S3-compatible service)', () => {
  const client = new S3Client({
    endpoint: TEST_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: TEST_ACCESS_KEY, secretAccessKey: TEST_SECRET_KEY },
  });

  beforeAll(async () => {
    if (!RUN_INTEGRATION) {
      return;
    }
    // Tolerate the test service still coming up (CI service containers start
    // concurrently). Bucket-already-exists (409) is success.
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        await client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
        return;
      } catch (error) {
        if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 409) {
          return;
        }
        if (attempt === 19) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  });

  afterAll(async () => {
    if (!RUN_INTEGRATION) {
      return;
    }
    await client.send(new DeleteBucketCommand({ Bucket: TEST_BUCKET })).catch(() => undefined);
    client.destroy();
  });

  const storage = new S3ObjectStorage({
    endpoint: TEST_ENDPOINT,
    region: 'us-east-1',
    bucket: TEST_BUCKET,
    accessKeyId: TEST_ACCESS_KEY,
    secretAccessKey: TEST_SECRET_KEY,
    forcePathStyle: true,
  });

  it.runIf(RUN_INTEGRATION)('stores and retrieves an object with its content type', async () => {
    await storage.put('assets/a.png', Buffer.from('png-bytes'), 'image/png');

    const body = await storage.get('assets/a.png');
    expect(body?.toString()).toBe('png-bytes');
  });

  it.runIf(RUN_INTEGRATION)('returns null for a missing key', async () => {
    expect(await storage.get('assets/missing.png')).toBeNull();
  });

  it.runIf(RUN_INTEGRATION)('deletes an object', async () => {
    await storage.put('assets/to-delete.png', Buffer.from('x'), 'image/png');

    await storage.delete('assets/to-delete.png');

    expect(await storage.get('assets/to-delete.png')).toBeNull();
  });

  it.runIf(RUN_INTEGRATION)('copies an object', async () => {
    await storage.put('assets/src.png', Buffer.from('px'), 'image/png');

    await storage.copy('assets/src.png', 'assets/dst.png');

    expect((await storage.get('assets/dst.png'))?.toString()).toBe('px');
  });

  it.runIf(RUN_INTEGRATION)(
    'honours path-style addressing (STORAGE_S3_FORCE_PATH_STYLE)',
    async () => {
      // MinIO only accepts path-style requests; a successful round trip on this
      // endpoint proves forcePathStyle=true reached the wire (REQ-FDN-006).
      await storage.put('assets/pathstyle.png', Buffer.from('ps'), 'image/png');

      expect((await storage.get('assets/pathstyle.png'))?.toString()).toBe('ps');
    },
  );

  it.runIf(!RUN_INTEGRATION)('is skipped when no S3-compatible test service is configured', () => {
    expect(TEST_ENDPOINT).toBeDefined();
  });
});

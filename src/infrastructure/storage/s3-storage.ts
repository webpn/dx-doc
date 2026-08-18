import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import type { ObjectStorage } from '@project/application';

import type { InstanceConfig } from '../config/instance-config';

/**
 * S3-compatible `ObjectStorage` adapter (REQ-FDN-006).
 *
 * Any provider implementing the S3 API works: AWS S3, MinIO, Backblaze B2.
 * `STORAGE_S3_FORCE_PATH_STYLE` is honoured for providers that require
 * path-style addressing (MinIO, B2) — see the instance configuration matrix.
 */
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    const clientConfig: S3ClientConfig = {
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    };
    // Unset endpoint means the SDK's default (AWS); exactOptionalPropertyTypes
    // forbids assigning an explicit undefined.
    if (options.endpoint !== undefined) {
      clientConfig.endpoint = options.endpoint;
    }
    this.client = new S3Client(clientConfig);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (response.Body === undefined) {
        return null;
      }
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${this.bucket}/${sourceKey}`,
      }),
    );
  }

  /** Probe reachability (REQ-FDN-024). HeadBucket resolves when the bucket is reachable. */
  async checkHealth(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

export interface S3StorageOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Path-style addressing (STORAGE_S3_FORCE_PATH_STYLE). */
  forcePathStyle: boolean;
}

/**
 * Build the S3 adapter from the instance configuration (REQ-FDN-013).
 */
export function createS3ObjectStorage(config: InstanceConfig): ObjectStorage {
  return new S3ObjectStorage({
    endpoint: config.STORAGE_S3_ENDPOINT,
    region: config.STORAGE_S3_REGION,
    bucket: config.STORAGE_S3_BUCKET,
    accessKeyId: config.STORAGE_S3_ACCESS_KEY,
    secretAccessKey: config.STORAGE_S3_SECRET_KEY,
    forcePathStyle: config.STORAGE_S3_FORCE_PATH_STYLE,
  });
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404;
}

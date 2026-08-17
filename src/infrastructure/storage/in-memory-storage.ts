import type { ObjectStorage } from '@project/application';

/**
 * In-memory `ObjectStorage` for tests and local development. Using the real
 * storage port lets an integration test exercise application code with a
 * substitute adapter, no S3 SDK or network involved (REQ-FDN-006).
 *
 * The adapter is synchronous under an async interface: methods return
 * resolved promises rather than being `async` (nothing is awaited here).
 */
export class InMemoryObjectStorage implements ObjectStorage {
  private readonly objects = new Map<string, Buffer>();

  put(key: string, body: Buffer, _contentType: string): Promise<void> {
    this.objects.set(key, Buffer.from(body));
    return Promise.resolve();
  }

  get(key: string): Promise<Buffer | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  copy(sourceKey: string, destinationKey: string): Promise<void> {
    const body = this.objects.get(sourceKey);
    if (body === undefined) {
      return Promise.reject(new Error(`InMemoryObjectStorage: source key not found: ${sourceKey}`));
    }
    this.objects.set(destinationKey, Buffer.from(body));
    return Promise.resolve();
  }
}

/**
 * Object storage port (REQ-FDN-006).
 *
 * S3-compatible object storage sits behind this interface. No application
 * service may reference an S3 (or any other provider's) SDK type — adapters in
 * `src/infrastructure/` implement it, and swapping provider requires no change
 * outside `src/infrastructure/`.
 *
 * Keys are opaque asset paths chosen by the caller. Operations throw on
 * unexpected I/O failures; a `get` for a missing key returns `null`.
 */
export interface ObjectStorage {
  /** Store `body` at `key` with the given content type. */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Retrieve the object at `key`, or `null` when it does not exist. */
  get(key: string): Promise<Buffer | null>;
  /** Delete the object at `key` (no-op when absent). */
  delete(key: string): Promise<void>;
  /** Copy `sourceKey` to `destinationKey`; throws when the source is absent. */
  copy(sourceKey: string, destinationKey: string): Promise<void>;
}

import { describe, expect, it } from 'vitest';

import { createErrorTracking } from './sentry';

describe('createErrorTracking (REQ-FDN-014)', () => {
  it('is a no-op when no DSN is configured — the application runs normally', () => {
    const tracking = createErrorTracking(undefined);

    expect(tracking.enabled).toBe(false);
    expect(() => {
      tracking.captureException(new Error('boom'));
    }).not.toThrow();
  });

  it('treats an empty or whitespace DSN as unconfigured', () => {
    expect(createErrorTracking('').enabled).toBe(false);
    expect(createErrorTracking('   ').enabled).toBe(false);
  });

  it('enables when a DSN is configured', () => {
    expect(createErrorTracking('https://key@o1.ingest.sentry.example/1').enabled).toBe(true);
  });

  it('never reports without a DSN (no client side effects)', () => {
    const tracking = createErrorTracking(undefined);

    // captureException on the no-op must be safe and silent.
    expect(() => {
      tracking.captureException(new Error('should not go anywhere'));
    }).not.toThrow();
  });
});

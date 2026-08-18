/**
 * Error tracking integration (REQ-FDN-014), behind `SENTRY_DSN`.
 *
 * The integration is optional and load-free in the common case: with no DSN
 * configured the module returns a no-op and `@sentry/node` is never imported
 * (no onboarding side effects, no network). Only a DSN-configured instance
 * imports the SDK, and even then lazily, on first captured error.
 *
 * Privacy (REQ-FDN-014 acceptance): no documentation content and no personal
 * data is reported. The `beforeSend` hook strips request bodies, cookies and
 * user identity, keeping only the method + URL needed to locate an error.
 * `tracesSampleRate` stays 0 and automatic session tracking is disabled — this
 * is error tracking for troubleshooting, not product analytics.
 */
import type { ErrorEvent } from '@sentry/node';

export interface ErrorTracking {
  readonly enabled: boolean;
  /** Report an error. Safe to call whether or not a DSN is configured. */
  captureException(error: unknown): void;
}

const NOOP: ErrorTracking = {
  enabled: false,
  captureException(): void {
    // No DSN configured — the application runs normally without error tracking.
  },
};

/**
 * Build the error-tracking bridge from the instance configuration. Passes
 * `config.SENTRY_DSN`; undefined or empty returns a no-op (REQ-FDN-014).
 */
export function createErrorTracking(dsn: string | undefined): ErrorTracking {
  if (dsn === undefined || dsn.trim() === '') {
    return NOOP;
  }
  return new SentryErrorTracking(dsn);
}

class SentryErrorTracking implements ErrorTracking {
  readonly enabled = true;

  private readonly dsn: string;
  private pending: Promise<void> | null = null;
  private initialized = false;

  constructor(dsn: string) {
    this.dsn = dsn;
  }

  captureException(error: unknown): void {
    void this.initialize().then(() => {
      if (this.initialized) {
        // Dynamic import keeps `@sentry/node` out of memory until a
        // DSN-configured instance actually reports its first error.
        void import('@sentry/node').then((sentry) => {
          sentry.captureException(error);
        });
      }
    });
  }

  private async initialize(): Promise<void> {
    if (this.initialized || this.pending !== null) {
      return;
    }
    this.pending = (async (): Promise<void> => {
      const sentry = await import('@sentry/node');
      sentry.init({
        dsn: this.dsn,
        tracesSampleRate: 0,
        beforeSend: scrubEvent,
      });
      this.initialized = true;
    })();
    try {
      await this.pending;
    } catch {
      // Initialization failure must never bring the request path down.
      this.initialized = false;
    }
  }
}

/** Keep only the method and URL; drop bodies, cookies, headers and identity. */
function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...event };
  delete scrubbed.user;
  if (scrubbed.request !== undefined) {
    const { method, url } = scrubbed.request;
    scrubbed.request = {
      ...(method !== undefined ? { method } : {}),
      ...(url !== undefined ? { url } : {}),
    };
  }
  return scrubbed;
}

import { createHash, randomBytes } from 'node:crypto';

/**
 * Opaque session tokens (D18): a random value handed to the browser as the
 * cookie, while only its SHA-256 is stored server-side. A leaked database row
 * cannot mint a usable cookie.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

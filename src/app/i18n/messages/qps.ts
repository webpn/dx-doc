import type { Translation } from '../catalogue';

/**
 * Pseudo-locale used only by tests (REQ-NFR-010).
 *
 * It deliberately translates ONE key and omits the rest, which is what proves
 * the runtime fallback to English works. It is `Partial<Translation>` rather
 * than a full catalogue precisely so this fixture stays intentionally sparse.
 *
 * A real locale added later should be typed `Translation` (not `Partial`) so
 * that omitting a key is a compile error rather than a silent fallback.
 */
export const qps: Partial<Translation> = {
  'auth.login.submit': '[qps] Sign in',
};

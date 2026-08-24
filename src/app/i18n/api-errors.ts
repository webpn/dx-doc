import { ApiClientError, ApiNetworkError } from '../api/client';

import type { KeyWithoutParams } from './catalogue';

/**
 * Maps an API failure to a message key (REQ-NFR-010).
 *
 * REQ-NFR-010's acceptance explicitly includes "error messages surfaced from
 * the API", so a screen must never render `error.message` from the server
 * directly: that text is not translatable and is written for an API consumer,
 * not for this user. Screens call this and translate the key.
 *
 * The mapping lives in the i18n layer, not in the API client, because it is a
 * presentation decision: the same 409 is a "someone else edited this" message
 * on one screen and a merge prompt elsewhere.
 *
 * The return type is `KeyWithoutParams` so the result is directly renderable —
 * an error message that needed a runtime parameter could not be produced from
 * an error alone, so excluding those keys here keeps the call site free of a
 * cast.
 */
export function apiErrorMessageKey(error: unknown): KeyWithoutParams {
  if (error instanceof ApiNetworkError) return 'error.unreachable';

  if (error instanceof ApiClientError) {
    switch (error.status) {
      case 401:
        return 'error.invalidCredentials';
      case 403:
        return 'error.forbidden';
      case 404:
        return 'error.notFound';
      case 409:
        // Several unrelated failures share 409, so the envelope's `code` decides
        // (REQ-FDN-010 guarantees it). REQ-AUTH-005 requires a rejected save to
        // state what happened: telling someone their slug collided because
        // another editor saved first would be plainly wrong.
        switch (error.code) {
          case 'STALE_WRITE':
            return 'error.staleWrite';
          case 'SLUG_TAKEN':
            return 'error.slugTaken';
          case 'IN_USE':
            return 'error.inUse';
          default:
            return 'error.conflict';
        }
      default:
        return 'error.unexpected';
    }
  }

  return 'error.unexpected';
}

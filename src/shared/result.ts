/**
 * A minimal, dependency-free `Result` type used across the layers for
 * operations that can fail in a typed way. Kept in Shared because it has no
 * domain, UI or infrastructure knowledge.
 *
 * See ARCHITECTURE.md §Shared for the intent behind this module.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<E, T = never>(error: E): Result<T, E> {
  return { ok: false, error };
}

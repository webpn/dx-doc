import { describe, expect, it } from 'vitest';

import { err, ok, type Result } from '../src/shared';

describe('Result', () => {
  it('holds a value on success', () => {
    const result = ok(42);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('holds an error on failure', () => {
    const result = err('boom');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('boom');
    }
  });

  it('preserves the error type distinctly from the value type', () => {
    const result: Result<number, string> = err('nope');

    if (!result.ok) {
      expect(result.error.toUpperCase()).toBe('NOPE');
    }
  });
});

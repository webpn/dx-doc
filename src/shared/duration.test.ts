import { describe, expect, it } from 'vitest';

import { parseDurationToMs } from './duration';

describe('parseDurationToMs', () => {
  it('parses seconds, minutes, hours and days', () => {
    expect(parseDurationToMs('60s')).toBe(60_000);
    expect(parseDurationToMs('30m')).toBe(30 * 60_000);
    expect(parseDurationToMs('8h')).toBe(8 * 3_600_000);
    expect(parseDurationToMs('1d')).toBe(86_400_000);
  });

  it('accepts multi-digit values', () => {
    expect(parseDurationToMs('12h')).toBe(12 * 3_600_000);
  });

  it('rejects malformed values', () => {
    expect(() => parseDurationToMs('')).toThrow(/Invalid duration/);
    expect(() => parseDurationToMs('8')).toThrow(/Invalid duration/);
    expect(() => parseDurationToMs('8w')).toThrow(/Invalid duration/);
    expect(() => parseDurationToMs('abc')).toThrow(/Invalid duration/);
    expect(() => parseDurationToMs('-8h')).toThrow(/Invalid duration/);
    expect(() => parseDurationToMs('8.5h')).toThrow(/Invalid duration/);
  });
});

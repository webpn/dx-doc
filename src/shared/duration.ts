/**
 * Parse a compact duration string (`8h`, `30m`, `60s`, `1d`) into
 * milliseconds (AUTH_SESSION_TTL, REQ-FDN-013). The syntax matches the
 * zod regex in the instance configuration loader; a malformed value is a
 * programming/configuration error, so it throws rather than returning a
 * sentinel.
 */
export function parseDurationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (match === null) {
    throw new Error(`Invalid duration "${value}" — expected a value like 8h, 30m, 60s, 1d`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  if (unit === undefined) {
    throw new Error(`Invalid duration unit in "${value}"`);
  }
  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Invalid duration unit in "${value}"`);
  }
  return amount * multiplier;
}

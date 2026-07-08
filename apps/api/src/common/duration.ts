const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse a short duration like "15m", "30d", "12h", "45s" into milliseconds. */
export function parseDurationToMs(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }
  const amount = Number.parseInt(match[1] as string, 10);
  const unit = match[2] as string;
  return amount * (UNIT_MS[unit] as number);
}

// Rain-only flood watch. This is a heuristic from forecast rainfall, NOT a river-level reading.
// Thresholds are loosely based on PAGASA's hourly rainfall warning levels (yellow 7.5 to 15, orange 15 to 30, red above 30 mm/h).
export const FLOOD_RULES = {
  watch:   { perHour: 15, per24h: 50 },
  warning: { perHour: 30, per24h: 100 },
};

export function assessFlood(precipNext24) {
  const total = precipNext24.reduce((a, b) => a + b, 0);
  const peak = Math.max(0, ...precipNext24);
  let state = 'normal';
  if (total >= FLOOD_RULES.warning.per24h || peak >= FLOOD_RULES.warning.perHour) state = 'warning';
  else if (total >= FLOOD_RULES.watch.per24h || peak >= FLOOD_RULES.watch.perHour) state = 'watch';
  return { state, total: Math.round(total), peak: Math.round(peak * 10) / 10 };
}

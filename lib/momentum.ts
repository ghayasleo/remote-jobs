// How a company's hiring is moving, from its open remote roles on each
// recorded day (lib/data/history.ts). Pure, so it's easy to test.

export const MOMENTUM = {
  growing: "Growing",
  started: "Started hiring",
  steady: "Steady",
  slowing: "Slowing",
  paused: "Paused",
} as const;
export type Momentum = keyof typeof MOMENTUM;

/** Labels need at least this much history, so a few days' noise isn't called a trend. */
export const MIN_HISTORY_DAYS = 7;
/** How far back "now" is compared with. */
export const WINDOW_DAYS = 28;
/** A change of fewer roles than this is noise, whatever the percentage. */
const MIN_CHANGE = 3;

const DAY_MS = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

/** A day's missing value (the company's board didn't answer) carries the last known one forward. */
export function carryForward(series: (number | null)[]): number[] {
  let last = 0;
  return series.map((value) => (last = value ?? last));
}

/**
 * The company's momentum, comparing its open remote roles on the last recorded
 * day with WINDOW_DAYS earlier (or the first record, if history is shorter).
 * Paused needs three recorded days in a row without roles, since one missing
 * day can just be a board that didn't answer. null until there's enough history.
 */
export function momentum(dates: string[], series: (number | null)[]) {
  if (dates.length < 2 || daysBetween(dates[0], dates.at(-1)!) < MIN_HISTORY_DAYS) return null;
  const target = new Date(Date.parse(`${dates.at(-1)}T00:00:00Z`) - WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);
  let thenIndex = 0;
  for (let index = 0; index < dates.length; index += 1) if (dates[index] <= target) thenIndex = index;

  const values = carryForward(series);
  const then = values[thenIndex];
  const now = values.at(-1)!;
  const quiet = series.length >= 3 && series.slice(-3).every((value) => !value);
  const change = now - then;

  let label: Momentum = "steady";
  if (then >= MIN_CHANGE && quiet) label = "paused";
  else if (then === 0 && now >= MIN_CHANGE) label = "started";
  else if (change >= MIN_CHANGE && change >= then * 0.25) label = "growing";
  else if (change <= -MIN_CHANGE && -change >= then * 0.25) label = "slowing";
  return { label, then, now: quiet ? 0 : now, since: dates[thenIndex] };
}

export type MomentumResult = NonNullable<ReturnType<typeof momentum>>;

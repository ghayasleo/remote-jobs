import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { HistoryDay } from "@/lib/history";
import { HISTORY_START, datesBetween } from "@/lib/weekly";

// The daily history the record-history workflow keeps on the repo's "data" branch.
const HISTORY_URL = "https://raw.githubusercontent.com/ghayasleo/remote-jobs/data/history/days";
/** How far back the trend lines go. */
const SERIES_DAYS = 56;

export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
export const laterDate = (a: string, b: string) => (a > b ? a : b);

/** One day's record, or null if that day wasn't recorded. A recorded day never changes. */
export async function getHistoryDay(date: string): Promise<HistoryDay | null> {
  "use cache";
  try {
    const response = await fetch(`${HISTORY_URL}/${date}.json`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      cacheLife("hours");
      return null;
    }
    cacheLife("max");
    return (await response.json()) as HistoryDay;
  } catch {
    cacheLife("minutes");
    return null;
  }
}

type DayInsights = { remoteRoles?: number; categories?: { key: string; count: number }[] };

/**
 * The last eight weeks of history, shaped for trends: each company's open
 * remote roles per recorded day (null when its board wasn't in that day's
 * record), roles opened and closed per company in the last 30 days, and the
 * day-by-day totals by kind of work. Loaded once an hour for every page.
 */
export async function getHiringSeries() {
  "use cache";
  cacheLife("hours");
  cacheTag("history");

  const today = new Date().toISOString().slice(0, 10);
  const days = (await Promise.all(datesBetween(laterDate(shiftDate(today, -SERIES_DAYS), HISTORY_START), today).map(getHistoryDay))).filter(
    (day): day is HistoryDay => day !== null,
  );
  const dates = days.map((day) => day.date);
  const slugs = [...new Set(days.flatMap((day) => Object.keys(day.hiring)))];
  const remote = Object.fromEntries(slugs.map((slug) => [slug, days.map((day) => day.hiring[slug]?.remote ?? null)]));

  const since30 = shiftDate(today, -30);
  const opened30: Record<string, number> = {};
  const closed30: Record<string, number> = {};
  for (const day of days) {
    if (day.baseline || day.date <= since30) continue;
    for (const role of day.opened) opened30[role.company] = (opened30[role.company] ?? 0) + 1;
    for (const key of day.closed) {
      const company = key.slice(0, key.indexOf("/"));
      closed30[company] = (closed30[company] ?? 0) + 1;
    }
  }

  const totals = days.map((day) => {
    const insights = day.insights as DayInsights;
    return {
      date: day.date,
      remoteRoles: insights.remoteRoles ?? 0,
      categories: Object.fromEntries((insights.categories ?? []).map(({ key, count }) => [key, count])),
      opened: day.baseline ? null : day.opened.length,
      closed: day.baseline ? null : day.closed.length,
    };
  });

  return { dates, remote, opened30, closed30, totals, recordedOpenings: days.some((day) => !day.baseline) };
}

export type HiringSeries = Awaited<ReturnType<typeof getHiringSeries>>;

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import type { HistoryDay } from "@/lib/history";
import { HISTORY_START, buildWeeklyReport, datesBetween, finishedWeeks, weekRange } from "@/lib/weekly";

// The daily history the record-history workflow keeps on the repo's "data" branch.
const HISTORY_URL = "https://raw.githubusercontent.com/ghayasleo/remote-jobs/data/history/days";

const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const later = (a: string, b: string) => (a > b ? a : b);

/** One day's record, or null if that day wasn't recorded. A recorded day never changes. */
async function getHistoryDay(date: string): Promise<HistoryDay | null> {
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

/** A finished week's report, or null if the week isn't finished or has nothing recorded. */
export async function getWeeklyReport(key: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("history");

  const range = weekRange(key);
  if (!range || !finishedWeeks(new Date().toISOString().slice(0, 10)).includes(key)) return null;

  const [days, companies] = await Promise.all([
    Promise.all(datesBetween(later(range.start, HISTORY_START), range.end).map(getHistoryDay)),
    getCompanyIndex(),
  ]);
  const recorded = days.filter((day): day is HistoryDay => day !== null);
  if (!recorded.some((day) => !day.baseline)) return null;

  // The last record before the week, so "open at the start" means Monday morning.
  let before: HistoryDay | null = null;
  if (range.start > HISTORY_START) {
    for (const date of datesBetween(later(shift(range.start, -7), HISTORY_START), shift(range.start, -1)).reverse()) {
      before = await getHistoryDay(date);
      if (before) break;
    }
  }

  const names = new Map(companies.map((company) => [company.slug, company.name]));
  return {
    ...buildWeeklyReport({ key, days: recorded, before, names }),
    newCompanies: companies
      .filter((company) => company.addedAt && company.addedAt >= range.start && company.addedAt <= range.end)
      .map((company) => ({ slug: company.slug, name: company.name })),
  };
}

export type WeeklyPage = NonNullable<Awaited<ReturnType<typeof getWeeklyReport>>>;

/** Every published weekly report, newest first. */
export async function getWeeklyReports() {
  "use cache";
  cacheLife("hours");
  cacheTag("history");

  const keys = finishedWeeks(new Date().toISOString().slice(0, 10));
  const reports = await Promise.all(keys.map(getWeeklyReport));
  return reports.filter((report): report is WeeklyPage => report !== null);
}

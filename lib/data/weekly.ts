import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { getHistoryDay, laterDate as later, shiftDate as shift } from "./history";
import type { HistoryDay } from "@/lib/history";
import { HISTORY_START, buildWeeklyReport, datesBetween, finishedWeeks, weekRange } from "@/lib/weekly";

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

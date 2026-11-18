import type { HistoryDay } from "@/lib/history";
import { JOB_CATEGORIES, type JobCategory } from "@/lib/jobs";
import { annualUsd } from "@/lib/salaries";

// Weekly reports on remote hiring, built from the daily history on the
// "data" branch (see lib/history.ts). Weeks run Monday to Sunday, UTC, and are
// named like ISO weeks: "2026-w47". Pure, so it's easy to test.

/** The day recording started; nothing exists before it. */
export const HISTORY_START = "2026-11-18";

const DAY_MS = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Monday of the week a date falls in. */
export function weekStart(date: string) {
  const time = Date.parse(`${date}T00:00:00Z`);
  const weekday = (new Date(time).getUTCDay() + 6) % 7; // Monday = 0
  return iso(time - weekday * DAY_MS);
}

/** "2026-w47" for any date in that ISO week. */
export function weekKey(date: string) {
  const monday = Date.parse(`${weekStart(date)}T00:00:00Z`);
  const thursday = new Date(monday + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const firstThursday = Date.parse(`${year}-01-04T00:00:00Z`);
  const firstMonday = Date.parse(`${weekStart(iso(firstThursday))}T00:00:00Z`);
  const week = Math.round((monday - firstMonday) / (7 * DAY_MS)) + 1;
  return `${year}-w${String(week).padStart(2, "0")}`;
}

/** The Monday and Sunday of a week key, or null if it isn't one. */
export function weekRange(key: string) {
  const match = /^(\d{4})-w(\d{2})$/.exec(key);
  if (!match) return null;
  const [, year, week] = match;
  const firstMonday = Date.parse(`${weekStart(`${year}-01-04`)}T00:00:00Z`);
  const start = iso(firstMonday + (Number(week) - 1) * 7 * DAY_MS);
  if (weekKey(start) !== key) return null;
  return { start, end: iso(Date.parse(`${start}T00:00:00Z`) + 6 * DAY_MS) };
}

export const datesBetween = (start: string, end: string) => {
  const dates: string[] = [];
  for (let time = Date.parse(`${start}T00:00:00Z`); time <= Date.parse(`${end}T00:00:00Z`); time += DAY_MS) dates.push(iso(time));
  return dates;
};

/** Every finished week since recording started, newest first. */
export function finishedWeeks(today: string) {
  const keys: string[] = [];
  const lastSunday = iso(Date.parse(`${weekStart(today)}T00:00:00Z`) - DAY_MS);
  for (let monday = weekStart(HISTORY_START); monday <= lastSunday; monday = iso(Date.parse(`${monday}T00:00:00Z`) + 7 * DAY_MS)) {
    keys.unshift(weekKey(monday));
  }
  return keys;
}

type Insights = { remoteRoles?: number; hiringCompanies?: number };
const openRoles = (day: HistoryDay | undefined) => (day?.insights as Insights | undefined)?.remoteRoles ?? null;

/**
 * One week's report from its daily records (oldest first) and the record
 * just before the week, if there is one. The baseline record's "opened" is
 * every role open on day one, so it isn't counted as openings.
 */
export function buildWeeklyReport({
  key,
  days,
  before,
  names,
}: {
  key: string;
  days: HistoryDay[];
  before: HistoryDay | null;
  names: Map<string, string>;
}) {
  const range = weekRange(key)!;
  const counted = days.filter((day) => !day.baseline);
  const opened = counted.flatMap((day) => day.opened);
  const closed = counted.reduce((sum, day) => sum + day.closed.length, 0);

  const byCompany = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const role of opened) {
    byCompany.set(role.company, (byCompany.get(role.company) ?? 0) + 1);
    byCategory.set(role.category, (byCategory.get(role.category) ?? 0) + 1);
  }

  const bestPaid = opened
    .map((role) => ({ role, pay: annualUsd({ pay: null, salary: role.salary }) }))
    .filter((entry): entry is { role: (typeof opened)[number]; pay: { min: number | null; max: number | null } } => entry.pay !== null)
    .sort((a, b) => (b.pay.max ?? b.pay.min ?? 0) - (a.pay.max ?? a.pay.min ?? 0))
    .slice(0, 8)
    .map(({ role, pay }) => ({ ...role, companyName: names.get(role.company) ?? role.company, ...pay }));

  const first = before ?? days[0];
  const last = days.at(-1);
  return {
    key,
    ...range,
    recordedDays: days.length,
    partial: range.start < HISTORY_START,
    opened: opened.length,
    closed,
    openAtStart: openRoles(first),
    openAtEnd: openRoles(last),
    hiringAtEnd: (last?.insights as Insights | undefined)?.hiringCompanies ?? null,
    topCompanies: [...byCompany]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([slug, count]) => ({ slug, name: names.get(slug) ?? slug, count })),
    categories: [...byCategory]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ key: category, label: JOB_CATEGORIES[category as JobCategory] ?? category, count })),
    bestPaid,
  };
}

export type WeeklyReport = ReturnType<typeof buildWeeklyReport>;

export const weeklyPath = (key: string) => `/weekly/${key}`;

const dates = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** "Nov 16 – 22, 2026": a report's week, written like the site's other dates. */
export const weekLabel = ({ start, end }: { start: string; end: string }) =>
  dates.formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`)).replace(/[\u2009\u202f]/g, " ");

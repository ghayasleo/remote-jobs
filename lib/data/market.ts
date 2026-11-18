import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyNews } from "./company-news";
import { getExploreData } from "./explore-data";
import { getHiringSeries } from "./history";
import { getRemoteJobs } from "./jobs";
import { getBoard, getOpenRoles } from "./job-boards";
import { JOB_CATEGORIES, isPlaceholderRole, jobCategory, type JobCategory } from "@/lib/jobs";
import { carryForward, momentum } from "@/lib/momentum";

const DAY_MS = 86_400_000;

/** A company's hiring momentum box: today's numbers plus the trend from the daily history. */
export async function getCompanyHiring(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "history");

  const board = getBoard(slug);
  if (!board) return null;
  const [open, series] = await Promise.all([getOpenRoles(board), getHiringSeries()]);
  const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const remote = (open?.roles ?? []).filter((role) => role.workplace === "remote" && !isPlaceholderRole(role.title));
  const kinds = new Map<JobCategory, number>();
  for (const role of remote) {
    const kind = jobCategory(role.title, role.team);
    if (kind !== "other") kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  }
  const values = series.remote[slug] ?? series.dates.map(() => null);
  return {
    postedLast30: remote.filter((role) => role.postedAt && role.postedAt >= since30).length,
    mix: [...kinds]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([kind, count]) => ({ label: JOB_CATEGORIES[kind], count })),
    trend: momentum(series.dates, values),
    series: carryForward(values),
    opened30: series.opened30[slug] ?? 0,
    closed30: series.closed30[slug] ?? 0,
    hasOpenings: series.recordedOpenings,
  };
}

/** Everything the Market page shows, refreshed with the hourly role data. */
export async function getMarket() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies", "history", "news");

  const [series, explore, jobs] = await Promise.all([getHiringSeries(), getExploreData(), getRemoteJobs()]);
  const now = Date.now();
  const since = (days: number) => new Date(now - days * DAY_MS).toISOString();
  const companies = new Map(explore.companies.map((company) => [company.slug, company]));

  // Roles posted recently, by their own posting date: known today, before any history.
  const posted7 = jobs.filter((job) => job.postedAt && job.postedAt >= since(7)).length;
  const posted30ByCompany = new Map<string, number>();
  for (const job of jobs) {
    if (job.postedAt && job.postedAt >= since(30)) posted30ByCompany.set(job.company, (posted30ByCompany.get(job.company) ?? 0) + 1);
  }
  const postingMost = [...posted30ByCompany]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => ({ slug, name: companies.get(slug)?.name ?? slug, count }));

  // Roles opened and closed in the last 7 days, from the daily records.
  const week = series.totals.filter((day) => day.date > since(7).slice(0, 10) && day.opened !== null);
  const opened7 = week.length ? week.reduce((sum, day) => sum + (day.opened ?? 0), 0) : null;
  const closed7 = week.length ? week.reduce((sum, day) => sum + (day.closed ?? 0), 0) : null;

  // Momentum for every company with a board, once there's enough history.
  const trends = Object.entries(series.remote)
    .map(([slug, values]) => ({ slug, values, trend: momentum(series.dates, values) }))
    .filter((entry) => entry.trend !== null && companies.has(entry.slug))
    .map(({ slug, values, trend }) => ({
      slug,
      name: companies.get(slug)!.name,
      domain: companies.get(slug)!.domain,
      ...trend!,
      change: trend!.now - trend!.then,
      series: carryForward(values),
    }));
  const counts = Object.fromEntries((["growing", "started", "steady", "slowing", "paused"] as const).map((label) => [label, trends.filter((t) => t.label === label).length]));

  // Kinds of work: open remote roles now, and the change since the comparison day.
  const latest = series.totals.at(-1);
  const first = trends[0] ? series.totals.find((day) => day.date === trends[0].since) : undefined;
  const kinds = latest
    ? Object.entries(latest.categories)
        .filter(([key]) => key !== "other")
        .map(([key, count]) => ({
          key,
          label: JOB_CATEGORIES[key as JobCategory] ?? key,
          count,
          then: first ? (first.categories[key] ?? 0) : null,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  // News from the companies with the most open remote roles.
  const biggest = Object.entries(explore.hiring)
    .sort((a, b) => b[1].remote - a[1].remote)
    .slice(0, 30)
    .map(([slug]) => companies.get(slug))
    .filter((company) => company !== undefined);
  const news = (
    await Promise.all(
      biggest.map(async (company) =>
        (await getCompanyNews(company.slug, company.name, company.domain)).map((item) => ({ ...item, company: { slug: company.slug, name: company.name } })),
      ),
    )
  )
    .flat()
    .filter((item) => item.date && item.date >= since(30))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 14);

  return {
    updatedAt: new Date(now).toISOString(),
    remoteRoles: jobs.length,
    hiringCompanies: Object.values(explore.hiring).filter((counts) => counts.remote > 0).length,
    posted7,
    opened7,
    closed7,
    historySince: series.dates[0] ?? null,
    hasTrends: trends.length > 0,
    counts,
    heatingUp: trends.filter((t) => t.label === "growing" || t.label === "started").sort((a, b) => b.change - a.change).slice(0, 8),
    coolingDown: trends.filter((t) => t.label === "slowing").sort((a, b) => a.change - b.change).slice(0, 8),
    paused: trends.filter((t) => t.label === "paused").sort((a, b) => b.then - a.then).slice(0, 8),
    postingMost,
    kinds,
    news,
  };
}

export type Market = Awaited<ReturnType<typeof getMarket>>;

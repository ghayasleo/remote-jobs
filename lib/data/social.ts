import "server-only";

import { getCompanyIndex } from "./companies";
import { getCountryIndex } from "./countries";
import { getInsights } from "./insights";
import { getSalaryData } from "./salaries";
import { getWeeklyReports } from "./weekly";
import { JOB_CATEGORIES, type JobCategory } from "@/lib/jobs";
import { salaryCategories, usd } from "@/lib/salaries";
import type { SocialData } from "@/lib/social";
import { weekLabel } from "@/lib/weekly";

const WEEK_MS = 7 * 86_400_000;

/** Everything the extra Bluesky posts can say, from the site's own data. */
export async function getSocialData(now: number): Promise<SocialData> {
  const [reports, insights, salaries, { countries }, companies] = await Promise.all([
    getWeeklyReports(),
    getInsights(),
    getSalaryData(),
    getCountryIndex(),
    getCompanyIndex(),
  ]);
  const latest = reports[0];
  const kind = insights.categories.find((category) => category.key !== "other");
  const since = new Date(now - WEEK_MS).toISOString().slice(0, 10);
  return {
    weekly: latest
      ? {
          key: latest.key,
          start: latest.start,
          end: latest.end,
          label: weekLabel(latest),
          opened: latest.opened,
          closed: latest.closed,
          openAtEnd: latest.openAtEnd,
          topCompanies: latest.topCompanies.map(({ name, count }) => ({ name, count })),
        }
      : null,
    remoteRoles: insights.remoteRoles,
    companies: insights.companies,
    paySharePercent: Math.round(insights.pay.share * 100),
    topHirer: insights.topCompanies[0]
      ? { name: insights.topCompanies[0].name, slug: insights.topCompanies[0].slug, remote: insights.topCompanies[0].remote }
      : null,
    biggestKind: kind
      ? { label: JOB_CATEGORIES[kind.key as JobCategory], sharePercent: Math.round((kind.count / Math.max(insights.remoteRoles, 1)) * 100) }
      : null,
    worldwideCompanies: insights.regions.find((region) => region.key === "worldwide")?.count ?? 0,
    salaries: salaryCategories(salaries.roles).map((category) => ({
      key: category.key,
      label: category.label,
      min: usd(category.medianMin),
      max: usd(category.medianMax),
    })),
    // Countries with the most roles of their own first, so the spotlight isn't just "worldwide roles".
    countries: [...countries]
      .sort((a, b) => b.named + b.regional - (a.named + a.regional))
      .slice(0, 24)
      .map(({ name, slug, total }) => ({ name, slug, total })),
    newCompanies: companies
      .filter((company) => company.addedAt && company.addedAt >= since)
      .map(({ name, slug }) => ({ name, slug })),
  };
}

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { getCountryIndex } from "./countries";
import { getBoard } from "./job-boards";
import { PROVIDERS } from "./job-boards/providers";
import { getRemoteJobs } from "./jobs";
import { techLabels, type Tech } from "./labels";
import { getMarket } from "./market";
import { getSalaryData } from "./salaries";
import { BOARDS, readSnapshot } from "./snapshot";
import { salaryCategories } from "@/lib/salaries";

/**
 * Everything the homepage shows, from the same hourly snapshot as the rest of
 * the site: real counts, the newest roles, and a taste of each section.
 */
export async function getHomeData() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const [jobs, companies, { countries }, salary, market, snapshot] = await Promise.all([
    getRemoteJobs(),
    getCompanyIndex(),
    getCountryIndex(),
    getSalaryData(),
    getMarket(),
    readSnapshot(),
  ]);

  const byCompany = new Map<string, number>();
  for (const job of jobs) byCompany.set(job.company, (byCompany.get(job.company) ?? 0) + 1);
  const profiles = new Map(companies.map((company) => [company.slug, company]));

  // Which hiring system each listed role came from, by its company's board.
  const providerLabel = (slug: string) => {
    const board = getBoard(slug);
    return board ? PROVIDERS[board.provider].label : null;
  };

  const providerCompanies = new Map<string, number>();
  for (const board of Object.values(BOARDS)) {
    const label = PROVIDERS[board.provider].label;
    providerCompanies.set(label, (providerCompanies.get(label) ?? 0) + 1);
  }

  const stackRoles = new Map<Tech, number>();
  for (const job of jobs) {
    for (const tech of job.companyStack ?? []) {
      if (tech in techLabels) stackRoles.set(tech as Tech, (stackRoles.get(tech as Tech) ?? 0) + 1);
    }
  }

  const categories = salaryCategories(salary.roles);

  return {
    builtAt: snapshot.builtAt,
    totalJobs: jobs.length,
    hiringCompanies: byCompany.size,
    totalCompanies: companies.length,
    boards: Object.keys(BOARDS).length,
    newest: jobs.slice(0, 7).map((job) => ({ ...job, source: providerLabel(job.company) })),
    postedToday: jobs.filter((job) => job.postedAt && Date.now() - Date.parse(job.postedAt) < 86_400_000).length,
    providers: [...providerCompanies.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    countries: [...countries].sort((a, b) => b.total - a.total).slice(0, 8),
    salaries: {
      published: salary.published,
      remoteRoles: salary.remoteRoles,
      categories: categories.slice(0, 4).map(({ key, label, count, p25, p75, medianMid }) => ({ key, label, count, p25, p75, medianMid })),
    },
    heatingUp: market.heatingUp.slice(0, 4).flatMap((trend) => {
      const company = profiles.get(trend.slug);
      return company ? [{ slug: trend.slug, name: company.name, domain: company.domain, change: trend.change, now: trend.now }] : [];
    }),
    stacks: [...stackRoles.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tech, roles]) => ({ tech, label: techLabels[tech], roles })),
    hiringNow: [...byCompany.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .flatMap(([slug, roles]) => {
        const company = profiles.get(slug);
        return company ? [{ slug, name: company.name, domain: company.domain, roles }] : [];
      }),
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

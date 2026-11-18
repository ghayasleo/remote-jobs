import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { getRemoteJobs } from "./jobs";
import { COUNTRIES, countryBySlug, countryRoleCount, countryRoles, hasCountryPage, type Country } from "@/lib/countries";
import { JOB_CATEGORIES, type JobListing } from "@/lib/jobs";

/** Roles shown per section; the rest are a click away in Jobs. */
export const COUNTRY_SHOWN = 30;

async function rolesByCountry() {
  const [jobs, companies] = await Promise.all([getRemoteJobs(), getCompanyIndex()]);
  const regions = new Map(companies.map((company) => [company.slug, company.region]));
  return { jobs, region: (slug: string) => regions.get(slug) };
}

/** Every country with a page, with its role counts. */
export async function getCountryIndex() {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const { jobs, region } = await rolesByCountry();
  const countries = COUNTRIES.map((country) => {
    const roles = countryRoles(jobs, country, region);
    return {
      ...country,
      hasPage: hasCountryPage(roles),
      named: roles.named.length,
      regional: roles.regional.length,
      worldwide: roles.worldwide.length,
      total: countryRoleCount(roles),
    };
  }).filter((country) => country.hasPage);
  return { countries, updatedAt: new Date().toISOString() };
}

export type CountryIndexEntry = Awaited<ReturnType<typeof getCountryIndex>>["countries"][number];

/** One country's page: its roles in three groups, who hires there and what kind of work. */
export async function getCountryPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", "companies");

  const country: Country | null = countryBySlug(slug);
  if (!country) return null;
  const { jobs, region } = await rolesByCountry();
  const roles = countryRoles(jobs, country, region);
  if (!hasCountryPage(roles)) return null;

  const all: JobListing[] = [...roles.named, ...roles.regional, ...roles.worldwide];
  const byCompany = new Map<string, { slug: string; name: string; domain: string | null; count: number }>();
  const byCategory = new Map<string, number>();
  for (const job of all) {
    const entry = byCompany.get(job.company) ?? { slug: job.company, name: job.companyName, domain: job.domain, count: 0 };
    entry.count += 1;
    byCompany.set(job.company, entry);
    byCategory.set(job.category, (byCategory.get(job.category) ?? 0) + 1);
  }

  return {
    country,
    counts: { named: roles.named.length, regional: roles.regional.length, worldwide: roles.worldwide.length, total: all.length },
    companyCount: byCompany.size,
    named: roles.named.slice(0, COUNTRY_SHOWN),
    regional: roles.regional.slice(0, COUNTRY_SHOWN),
    worldwide: roles.worldwide.slice(0, COUNTRY_SHOWN),
    topCompanies: [...byCompany.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    categories: [...byCategory]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ label: JOB_CATEGORIES[key as keyof typeof JOB_CATEGORIES], count })),
    updatedAt: new Date().toISOString(),
  };
}

export type CountryPage = NonNullable<Awaited<ReturnType<typeof getCountryPage>>>;

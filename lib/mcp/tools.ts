// The MCP server's answers (app/mcp/route.ts), built from the same data the
// site's pages use: the Explore list, the Jobs feed and the insights numbers.
// Pure functions, so they're easy to test; lib/mcp/server.ts wires them up.

import type { ProfileSection } from "@/lib/data/parse";
import {
  companySizeLabels,
  label,
  regionLabels,
  remotePolicyLabels,
  techLabels,
  type CompanySize,
  type RemotePolicy,
  type Tech,
} from "@/lib/data/labels";
import {
  DEFAULT_PARAMS,
  filterCompanies,
  serializeParams,
  type ExploreCompany,
  type ExploreParams,
  type HiringCounts,
  type RegionFilter,
  type SortKey,
} from "@/lib/explore";
import type { Insights } from "@/lib/insights";
import {
  DEFAULT_JOB_PARAMS,
  JOB_CATEGORIES,
  countryFromSlug,
  countrySlug,
  filterJobs,
  jobPath,
  serializeJobParams,
  type JobCategory,
  type JobListing,
  type JobParams,
  type JobRegion,
  type JobSort,
  type PostedWithin,
} from "@/lib/jobs";
import { annualUsd, byPay, MIN_SALARY_ROLES, salaryCategories, salaryPath, salaryStats, type SalaryRole } from "@/lib/salaries";

/** What /data/explore.json serves. */
export type ExploreFile = { companies: ExploreCompany[]; hiring: HiringCounts; newSince: string; updatedAt: string };
/** What /data/insights.json serves. */
export type InsightsFile = Insights & { updatedAt: string };

/** The most results one call returns: enough to choose from, small enough for a model's context. */
export const MAX_RESULTS = 25;

export const companyPath = (slug: string) => `/company-profiles/${slug}`;

const labels = (map: Record<string, string>, values: string[]) => values.map((value) => label(map, value));
const page = <T>(items: T[], offset: number, limit: number) => items.slice(offset, offset + limit);
const round1000 = (value: number) => Math.round(value / 1000) * 1000;
const roundOrNull = (value: number | null) => (value === null ? null : round1000(value));
// "Grafana Labs" → "grafana-labs": the same rule country slugs use.
const slugify = countrySlug;

/* ---------- companies ---------- */

export type CompanySearch = {
  query?: string;
  region?: RegionFilter[];
  remote_policy?: RemotePolicy[];
  stack?: Tech[];
  size?: CompanySize[];
  hiring_now?: boolean;
  recently_added?: boolean;
  sort?: SortKey;
  limit?: number;
  offset?: number;
};

function companySummary(company: ExploreCompany, hiring: HiringCounts, url: (path: string) => string) {
  const counts = hiring[company.slug];
  return {
    name: company.name,
    slug: company.slug,
    url: url(companyPath(company.slug)),
    blurb: company.blurb,
    hires_in: label(regionLabels, company.region) || null,
    remote_policy: label(remotePolicyLabels, company.remotePolicy) || null,
    size: company.companySize ? `${label(companySizeLabels, company.companySize)} people` : null,
    stack: labels(techLabels, company.technologies),
    open_roles: counts ? { total: counts.total, remote: counts.remote } : null,
    added: company.addedAt,
  };
}

export function searchCompanies(data: ExploreFile, input: CompanySearch, url: (path: string) => string) {
  const params: ExploreParams = {
    ...DEFAULT_PARAMS,
    q: (input.query ?? "").trim(),
    region: input.region ?? [],
    policy: input.remote_policy ?? [],
    stack: input.stack ?? [],
    size: input.size ?? [],
    hiring: input.hiring_now ?? false,
    recent: input.recently_added ?? false,
    sort: input.sort ?? DEFAULT_PARAMS.sort,
  };
  const matches = filterCompanies(data.companies, params, data.hiring, data.newSince);
  const offset = input.offset ?? 0;
  const results = page(matches, offset, input.limit ?? 10);
  return {
    total: matches.length,
    offset,
    companies: results.map((company) => companySummary(company, data.hiring, url)),
    browse_url: url(`/${serializeParams(params)}`),
    updated: data.updatedAt,
  };
}

/** A company from a slug, a name or a domain; null when nothing is close. */
export function findCompany(companies: ExploreCompany[], text: string): ExploreCompany | null {
  const wanted = text.trim().toLowerCase();
  if (!wanted) return null;
  const domain = wanted.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return (
    companies.find((company) => company.slug === wanted) ??
    companies.find((company) => company.name.toLowerCase() === wanted) ??
    companies.find((company) => company.domain !== null && company.domain === domain) ??
    companies.find((company) => company.slug === slugify(wanted)) ??
    companies.find((company) => company.name.toLowerCase().startsWith(wanted)) ??
    null
  );
}

// Long sections (a few profiles paste whole handbooks) are cut to keep answers small.
const SECTION_MAX = 2_000;
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")} …`);

export function companyDetails(
  profile: {
    name: string;
    slug: string;
    website: string;
    careersUrl: string | null;
    updatedAt: string | null;
    sections: ProfileSection[];
  } | null,
  listed: ExploreCompany,
  hiring: HiringCounts,
  jobs: JobListing[],
  url: (path: string) => string,
) {
  const roles = jobs.filter((job) => job.company === listed.slug);
  return {
    ...companySummary(listed, hiring, url),
    website: profile?.website || null,
    careers_url: profile?.careersUrl ?? null,
    profile_updated: profile?.updatedAt ?? null,
    // "Company blurb" is already the summary above.
    profile: (profile?.sections ?? [])
      .filter((section) => section.id !== "blurb" && section.markdown.trim())
      .map((section) => ({ title: section.title, text: clip(section.markdown.trim(), SECTION_MAX) })),
    remote_roles_total: roles.length,
    remote_roles: roles.slice(0, MAX_RESULTS).map((job) => jobSummary(job, url)),
  };
}

/* ---------- jobs ---------- */

export type JobSearch = {
  query?: string;
  category?: JobCategory[];
  where?: JobRegion[];
  country?: string;
  posted_within?: Exclude<PostedWithin, "">;
  with_salary?: boolean;
  remote_policy?: RemotePolicy[];
  company_size?: CompanySize[];
  stack?: Tech[];
  sort?: JobSort;
  limit?: number;
  offset?: number;
};

export function jobSummary(job: JobListing, url: (path: string) => string) {
  return {
    title: job.title,
    company: job.companyName,
    company_slug: job.company,
    id: job.id,
    location: job.location || null,
    // A role posted once per location lists them all; any of them can apply.
    ...(job.locations && job.locations.length > 1 && { also_open_in: job.locations.slice(1) }),
    team: job.team,
    kind: JOB_CATEGORIES[job.category],
    employment_type: job.employmentType,
    salary: job.salary,
    posted: job.postedAt,
    url: url(jobPath(job)),
  };
}

/** A country's slug from its English name or slug ("Pakistan", "united-kingdom"), or null. */
export function resolveCountry(text: string | undefined) {
  if (!text?.trim()) return "";
  const slug = countrySlug(text);
  return countryFromSlug(slug) ? slug : null;
}

export function searchJobs(jobs: JobListing[], input: JobSearch, now: number, url: (path: string) => string) {
  const country = resolveCountry(input.country);
  if (country === null) return { error: `"${input.country}" isn't a country this site knows. Use its English name, like "Germany" or "United Kingdom".` };
  const params: JobParams = {
    ...DEFAULT_JOB_PARAMS,
    q: (input.query ?? "").trim(),
    category: input.category ?? [],
    where: input.where ?? [],
    country,
    posted: input.posted_within ?? "",
    pay: input.with_salary ?? false,
    policy: input.remote_policy ?? [],
    size: input.company_size ?? [],
    stack: input.stack ?? [],
    sort: input.sort ?? DEFAULT_JOB_PARAMS.sort,
  };
  const matches = filterJobs(jobs, params, now);
  const offset = input.offset ?? 0;
  return {
    total: matches.length,
    offset,
    jobs: page(matches, offset, input.limit ?? 10).map((job) => jobSummary(job, url)),
    browse_url: url(`/jobs${serializeJobParams(params)}`),
  };
}

/* ---------- one role ---------- */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  bull: "•",
  euro: "€",
  pound: "£",
};

/** A job posting's HTML as readable text: paragraphs, "- " list items, no tags. */
export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|section|blockquote|table|tr)>/gi, "\n")
    .replace(/<(p|div|h[1-6]|ul|ol|section|blockquote|table|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === "#") {
        const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
      }
      return ENTITIES[code.toLowerCase()] ?? entity;
    })
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const DESCRIPTION_MAX = 8_000;
export const clipDescription = (text: string) => clip(text, DESCRIPTION_MAX);

/* ---------- salaries ---------- */

export type SalarySearch = { category?: Exclude<JobCategory, "other">; query?: string };

const pay = (stats: { count: number; medianMid: number; p25: number; p75: number; medianMin: number; medianMax: number }) => ({
  roles: stats.count,
  median: round1000(stats.medianMid),
  typical_range: { low: round1000(stats.p25), high: round1000(stats.p75) },
  median_posted_range: { min: round1000(stats.medianMin), max: round1000(stats.medianMax) },
});

/** Pay in remote postings that give an annual US-dollar range, as the Salaries pages count it. */
export function salaryInsights(jobs: JobListing[], input: SalarySearch, url: (path: string) => string) {
  const words = (input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const all: SalaryRole[] = [];
  for (const job of jobs) {
    const range = annualUsd({ pay: null, salary: job.salary });
    if (!range) continue;
    all.push({ ...range, company: job.company, companyName: job.companyName, id: job.id, title: job.title, location: job.location, category: job.category });
  }
  const roles = all.filter(
    (role) =>
      (!input.category || role.category === input.category) &&
      words.every((word) => `${role.title} ${role.companyName}`.toLowerCase().includes(word)),
  );
  const base = {
    currency: "USD per year",
    method:
      "Midpoints of the annual US-dollar ranges that remote job postings publish. Other currencies, hourly rates and postings without pay are left out.",
    remote_roles: jobs.length,
    remote_roles_with_salary: jobs.filter((job) => job.salary).length,
    page_url: url(salaryPath(input.category)),
  };
  if (roles.length < MIN_SALARY_ROLES) {
    return { ...base, roles_with_usd_range: roles.length, note: `Fewer than ${MIN_SALARY_ROLES} matching postings give an annual US-dollar range, too few to summarise.` };
  }
  return {
    ...base,
    roles_with_usd_range: roles.length,
    overall: pay(salaryStats(roles)),
    by_kind_of_work: input.category ? undefined : salaryCategories(roles).map((category) => ({ kind: category.label, ...pay(category) })),
    best_paid: [...roles]
      .sort(byPay)
      .slice(0, 10)
      .map((role) => ({
        title: role.title,
        company: role.companyName,
        range: { min: role.min, max: role.max },
        url: url(jobPath(role)),
      })),
  };
}

/* ---------- the market ---------- */

const DAY_MS = 86_400_000;

export function marketOverview(insights: InsightsFile, jobs: JobListing[], now: number, url: (path: string) => string) {
  const since = (days: number) => new Date(now - days * DAY_MS).toISOString();
  const posted = (days: number) => jobs.filter((job) => job.postedAt && job.postedAt >= since(days));
  const recent = posted(30);
  const byCompany = new Map<string, { name: string; count: number }>();
  for (const job of recent) {
    const entry = byCompany.get(job.company) ?? { name: job.companyName, count: 0 };
    entry.count += 1;
    byCompany.set(job.company, entry);
  }
  return {
    updated: insights.updatedAt,
    companies: insights.companies,
    companies_hiring: insights.hiringCompanies,
    remote_roles: insights.remoteRoles,
    all_roles_at_those_companies: insights.allRoles,
    remote_roles_posted: { last_7_days: posted(7).length, last_30_days: recent.length },
    most_remote_roles: insights.topCompanies.map((company) => ({
      company: company.name,
      remote_roles: company.remote,
      all_roles: company.total,
      url: url(companyPath(company.slug)),
    })),
    posting_most_last_30_days: [...byCompany]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([slug, { name, count }]) => ({ company: name, roles_posted: count, url: url(companyPath(slug)) })),
    remote_roles_by_kind: insights.categories.map(({ key, count }) => ({ kind: JOB_CATEGORIES[key], roles: count })),
    companies_by_hiring_region: insights.regions.map(({ key, count, hiring }) => ({ region: label(regionLabels, key), companies: count, hiring })),
    companies_by_remote_policy: insights.policies.map(({ key, count }) => ({ policy: label(remotePolicyLabels, key), companies: count })),
    stack_at_hiring_companies: insights.stacks.map(({ key, count }) => ({ tech: label(techLabels, key), companies: count })),
    pay: {
      remote_roles_publishing_pay: insights.pay.published,
      share: Math.round(insights.pay.share * 100) / 100,
      median_annual_usd_range: { min: roundOrNull(insights.pay.annualUsd.medianMin), max: roundOrNull(insights.pay.annualUsd.medianMax) },
    },
    more: {
      market: url("/market"),
      insights: url("/insights"),
      weekly_reports: url("/weekly"),
      salaries: url("/salaries"),
    },
  };
}

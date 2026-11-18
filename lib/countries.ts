import { formatCount, listAnd, type Faq } from "@/lib/faq";
import { COUNTRY_LIST, JOB_REGIONS, jobRegions, locationCountries, type JobListing, type JobRegion } from "@/lib/jobs";

// "Remote jobs in <country>": the roles someone living there can apply to.
// Pure, so it's easy to test; lib/data/countries.ts feeds it live roles.

export type Country = { name: string; slug: string; region: Exclude<JobRegion, "anywhere"> };

export const countrySlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const COUNTRIES: Country[] = COUNTRY_LIST.map((country) => ({ ...country, slug: countrySlug(country.name) }));

export const countryBySlug = (slug: string) => COUNTRIES.find((country) => country.slug === slug) ?? null;
export const countryPath = (country: Pick<Country, "slug">) => `/remote/in/${country.slug}`;
export const regionName = (country: Country) => JOB_REGIONS[country.region];

/** A page needs this many roles that are about the country or its region, beyond worldwide ones. */
export const MIN_COUNTRY_ROLES = 5;

export type CountryRoles<T> = {
  /** The location names the country ("Remote - US or Canada", "Toronto, ON"). */
  named: T[];
  /** The location names the country's region but no country ("EMEA", "APAC", "LatAm"). */
  regional: T[];
  /** Open anywhere, or plainly "Remote" at a company that hires worldwide. */
  worldwide: T[];
};

/**
 * Sorts roles into the three ways they can be open to someone living in a
 * country. A role that names other countries isn't open to this one.
 */
export function countryRoles<T extends Pick<JobListing, "company" | "location">>(
  jobs: T[],
  country: Country,
  companyRegion: (slug: string) => string | undefined,
): CountryRoles<T> {
  const roles: CountryRoles<T> = { named: [], regional: [], worldwide: [] };
  for (const job of jobs) {
    const names = locationCountries(job.location);
    if (names.length > 0) {
      if (names.includes(country.name)) roles.named.push(job);
      continue;
    }
    const regions = jobRegions(job.location);
    if (regions.includes(country.region)) roles.regional.push(job);
    else if (regions.includes("anywhere") || (regions.length === 0 && companyRegion(job.company) === "worldwide")) {
      roles.worldwide.push(job);
    }
  }
  return roles;
}

export const countryRoleCount = (roles: CountryRoles<unknown>) =>
  roles.named.length + roles.regional.length + roles.worldwide.length;

/** Whether a country has enough of its own roles to deserve a page. */
export const hasCountryPage = (roles: CountryRoles<unknown>) => roles.named.length + roles.regional.length >= MIN_COUNTRY_ROLES;

/** Questions a country page answers, from its own numbers. */
export function countryFaqs({
  country,
  counts,
  companyCount,
  topCompanies,
  categories,
  asOf,
}: {
  country: Country;
  counts: { named: number; regional: number; worldwide: number; total: number };
  companyCount: number;
  topCompanies: { name: string; count: number }[];
  categories: { label: string; count: number }[];
  asOf: string;
}): Faq[] {
  const roles = (count: number) => `${formatCount(count)} ${count === 1 ? "role" : "roles"}`;
  const parts = [
    counts.named > 0 && `${formatCount(counts.named)} name ${country.name}`,
    counts.regional > 0 && `${formatCount(counts.regional)} are open across ${regionName(country)}`,
    counts.worldwide > 0 && `${formatCount(counts.worldwide)} are open worldwide`,
  ].filter((part): part is string => Boolean(part));
  const faqs: Faq[] = [
    {
      question: `How many remote jobs can I apply to from ${country.name}?`,
      answer: `${formatCount(counts.total)} remote roles at ${formatCount(companyCount)} companies, as of ${asOf}: ${listAnd(parts)}.`,
    },
  ];
  if (topCompanies.length >= 3) {
    faqs.push({
      question: `Which companies hire remotely from ${country.name}?`,
      answer: `${listAnd(topCompanies.slice(0, 3).map((company) => `${company.name} (${roles(company.count)})`))} have the most open roles you can apply to from ${country.name} right now.`,
    });
  }
  const [first, second, third] = categories;
  if (first) {
    const next = [second, third].filter(Boolean).map((category) => category.label);
    faqs.push({
      question: `What kind of remote work is open to people in ${country.name}?`,
      answer: `${first.label}: ${roles(first.count)} of ${formatCount(counts.total)}${next.length ? `, followed by ${listAnd(next)}` : ""}.`,
    });
  }
  faqs.push({
    question: "Is a role listed as worldwide really open to me?",
    answer:
      "Usually, but read the posting. Some ask for working hours that overlap a particular time zone, and some hire people abroad as contractors rather than employees. Roles listed only as “Remote” are included here when the company says it hires worldwide.",
  });
  return faqs;
}

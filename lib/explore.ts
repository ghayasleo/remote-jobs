import type { CompanyListItem } from "@/lib/data/parse";
import {
  COMPANY_SIZES,
  REMOTE_POLICIES,
  TECHS,
  type CompanySize,
  type RemotePolicy,
  type Tech,
} from "@/lib/data/labels";

// Explore's filters, sort and search. Pure functions so they can be tested and
// shared by the server (defaults) and the browser (URL state).

export type HiringCounts = Record<string, { total: number; remote: number }>;

/** The slice of a company the list needs (keeps the page payload small). */
export type ExploreCompany = Pick<
  CompanyListItem,
  "slug" | "name" | "domain" | "region" | "remotePolicy" | "companySize" | "technologies" | "addedAt" | "blurb" | "searchText"
>;

export function toExploreCompany(company: CompanyListItem): ExploreCompany {
  const { slug, name, domain, region, remotePolicy, companySize, technologies, addedAt, blurb, searchText } = company;
  return { slug, name, domain, region, remotePolicy, companySize, technologies, addedAt, blurb, searchText };
}

/** "Where you're based": each choice also matches companies that hire wider. */
export const REGION_FILTERS = {
  americas: { label: "Americas", matches: ["americas", "americas-europe", "worldwide"] },
  europe: { label: "Europe", matches: ["europe", "americas-europe", "worldwide"] },
  "asia-pacific": { label: "Asia Pacific", matches: ["asia-pacific", "worldwide"] },
  worldwide: { label: "Worldwide only", matches: ["worldwide"] },
} as const;
export type RegionFilter = keyof typeof REGION_FILTERS;
export const REGION_FILTER_KEYS = Object.keys(REGION_FILTERS) as RegionFilter[];

export const SORTS = {
  recommended: "Recommended",
  name: "A–Z",
  newest: "Recently added",
  roles: "Most open roles",
} as const;
export type SortKey = keyof typeof SORTS;

export const NEW_WINDOW_DAYS = 365;

export type ExploreParams = {
  q: string;
  region: RegionFilter[];
  policy: RemotePolicy[];
  stack: Tech[];
  size: CompanySize[];
  hiring: boolean;
  recent: boolean;
  sort: SortKey;
};

export const DEFAULT_PARAMS: ExploreParams = {
  q: "",
  region: [],
  policy: [],
  stack: [],
  size: [],
  hiring: false,
  recent: false,
  sort: "recommended",
};

/* ---------- URL <-> params ---------- */

function listParam<T extends string>(search: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const values = (search.get(key) ?? "").split(",").map((value) => value.trim());
  return allowed.filter((value) => values.includes(value)); // canonical order, no junk
}

export function parseParams(query: string): ExploreParams {
  const search = new URLSearchParams(query);
  const sort = search.get("sort");
  return {
    q: (search.get("q") ?? "").slice(0, 100),
    region: listParam(search, "region", REGION_FILTER_KEYS),
    policy: listParam(search, "policy", REMOTE_POLICIES),
    stack: listParam(search, "stack", TECHS),
    size: listParam(search, "size", COMPANY_SIZES),
    hiring: search.get("hiring") === "true",
    recent: search.get("recent") === "true",
    sort: sort && sort in SORTS ? (sort as SortKey) : "recommended",
  };
}

/** Query string with only the non-default values, e.g. "?region=europe&hiring=true". */
export function serializeParams(params: ExploreParams): string {
  const search = new URLSearchParams();
  if (params.q.trim()) search.set("q", params.q.trim());
  for (const key of ["region", "policy", "stack", "size"] as const) {
    if (params[key].length) search.set(key, params[key].join(","));
  }
  if (params.hiring) search.set("hiring", "true");
  if (params.recent) search.set("recent", "true");
  if (params.sort !== "recommended") search.set("sort", params.sort);
  const query = search.toString().replaceAll("%2C", ",");
  return query ? `?${query}` : "";
}

export function activeFilterCount(params: ExploreParams) {
  return (
    params.region.length +
    params.policy.length +
    params.stack.length +
    params.size.length +
    Number(params.hiring) +
    Number(params.recent)
  );
}

/* ---------- filtering ---------- */

export function isRecent(company: Pick<ExploreCompany, "addedAt">, newSince: string) {
  return company.addedAt !== null && company.addedAt >= newSince;
}

/** YYYY-MM-DD, NEW_WINDOW_DAYS before `now`. */
export function newSinceDate(now: number) {
  return new Date(now - NEW_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
}

const terms = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

export function filterCompanies<T extends ExploreCompany>(
  companies: T[],
  params: ExploreParams,
  hiring: HiringCounts,
  newSince: string,
): T[] {
  const words = terms(params.q);
  const regions = new Set<string>(params.region.flatMap((key) => REGION_FILTERS[key].matches));

  const matches = companies.filter(
    (company) =>
      words.every((word) => company.searchText.includes(word)) &&
      (regions.size === 0 || regions.has(company.region)) &&
      (params.policy.length === 0 || params.policy.includes(company.remotePolicy as RemotePolicy)) &&
      (params.size.length === 0 || params.size.includes(company.companySize as CompanySize)) &&
      (params.stack.length === 0 || params.stack.some((tech) => company.technologies.includes(tech))) &&
      (!params.hiring || company.slug in hiring) &&
      (!params.recent || isRecent(company, newSince)),
  );

  return sortCompanies(matches, params, hiring);
}

function sortCompanies<T extends ExploreCompany>(companies: T[], params: ExploreParams, hiring: HiringCounts) {
  const byName = (a: T, b: T) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const roles = (company: T) => hiring[company.slug]?.total ?? 0;
  const remoteRoles = (company: T) => hiring[company.slug]?.remote ?? 0;
  const query = params.q.trim().toLowerCase();
  // When searching, companies whose name matches come first.
  const nameRank = (company: T) => {
    if (!query) return 0;
    const name = company.name.toLowerCase();
    return name.startsWith(query) ? 0 : name.includes(query) ? 1 : 2;
  };

  const compare: Record<SortKey, (a: T, b: T) => number> = {
    recommended: (a, b) =>
      nameRank(a) - nameRank(b) ||
      Number(roles(b) > 0) - Number(roles(a) > 0) ||
      remoteRoles(b) - remoteRoles(a) ||
      byName(a, b),
    name: (a, b) => nameRank(a) - nameRank(b) || byName(a, b),
    newest: (a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? "") || byName(a, b),
    roles: (a, b) => roles(b) - roles(a) || remoteRoles(b) - remoteRoles(a) || byName(a, b),
  };
  return [...companies].sort(compare[params.sort]);
}

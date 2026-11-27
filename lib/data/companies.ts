import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { toListItem, type CompanyListItem, type CompanyProfile } from "./parse";
import { readSnapshot, type Snapshot } from "./snapshot";

export { UPSTREAM_REPO_URL, upstreamFileUrl } from "./company-archive";

const VALID_SLUG = /^[a-z0-9-]+$/i;

// The profiles by slug, built once per snapshot rather than once per lookup.
const bySlug = new WeakMap<Snapshot, Map<string, CompanyProfile>>();

async function loadArchive(): Promise<Map<string, CompanyProfile>> {
  const snapshot = await readSnapshot();
  let companies = bySlug.get(snapshot);
  if (!companies) {
    companies = new Map(snapshot.companies.map((company) => [company.slug, company]));
    bySlug.set(snapshot, companies);
  }
  return companies;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

export async function getCompanyIndex(): Promise<CompanyListItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  return [...(await loadArchive()).values()].map(toListItem).sort(byName);
}

export async function getCompany(slug: string): Promise<CompanyProfile | null> {
  "use cache";
  cacheLife("days");
  cacheTag("companies", `company:${slug}`);

  if (!VALID_SLUG.test(slug)) return null;
  return (await loadArchive()).get(slug) ?? null;
}

/** Current slug for a company that was renamed upstream (from its redirectFrom). */
export async function findSlugByAlias(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  for (const company of (await loadArchive()).values()) {
    if (company.aliases.includes(slug)) return company.slug;
  }
  return null;
}

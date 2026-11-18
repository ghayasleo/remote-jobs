import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { gunzipSync } from "node:zlib";
import { parseCompanyFile, toListItem, type CompanyListItem, type CompanyProfile } from "./parse";
import { readTar } from "./tar";

// All company data comes from remoteintech/remote-jobs. The whole repo is
// downloaded as one tarball (~2.6 MB, no token needed): one request instead of
// one per company.
const REPO = "remoteintech/remote-jobs";
const BRANCH = "main";
const TARBALL_URL = `https://codeload.github.com/${REPO}/tar.gz/${BRANCH}`;
export const UPSTREAM_REPO_URL = `https://github.com/${REPO}`;
export const upstreamFileUrl = (slug: string) =>
  `${UPSTREAM_REPO_URL}/blob/${BRANCH}/src/companies/${slug}.md`;

const COMPANY_FILE = /^[^/]+\/src\/companies\/([^/]+)\.md$/;
const VALID_SLUG = /^[a-z0-9-]+$/i;

type Archive = Map<string, CompanyProfile>;

const DOWNLOAD_ATTEMPTS = 3;

/**
 * The unzipped tarball, retried with backoff so a network blip doesn't fail a
 * build. It skips Next's fetch cache: the download takes about a second, every
 * build gets today's list, and a corrupted copy saved by an earlier build can't
 * fail every build after it. The parsed list is memoized below instead.
 */
async function fetchTarball(attempt = 1): Promise<Buffer> {
  try {
    const response = await fetch(TARBALL_URL, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return gunzipSync(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    if (attempt >= DOWNLOAD_ATTEMPTS) {
      throw new Error(`Downloading ${TARBALL_URL} failed after ${attempt} attempts`, { cause: error });
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    return fetchTarball(attempt + 1);
  }
}

async function downloadArchive(): Promise<Archive> {
  // Read and parse in one go: few awaits keep React's dev-only async tracking happy.
  const tar = await fetchTarball();

  const companies: Archive = new Map();
  readTar(tar, (path, content) => {
    const slug = COMPANY_FILE.exec(path)?.[1];
    if (!slug) return;
    const company = parseCompanyFile(slug, content.toString("utf8"));
    if (company) companies.set(slug, company);
  });
  if (companies.size === 0) throw new Error(`No company files found in ${TARBALL_URL}`);
  return companies;
}

/**
 * Every company profile, keyed by slug: one download shared by the functions
 * below. It's a cached function rather than a module-level promise, so Next
 * does the sharing: a "use cache" function mustn't await a promise another
 * one started (development mode rejects it, and it breaks cache isolation).
 */
async function getArchive(): Promise<Record<string, CompanyProfile>> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  return Object.fromEntries(await downloadArchive());
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

export async function getCompanyIndex(): Promise<CompanyListItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  return Object.values(await getArchive()).map(toListItem).sort(byName);
}

export async function getCompany(slug: string): Promise<CompanyProfile | null> {
  "use cache";
  cacheLife("days");
  cacheTag("companies", `company:${slug}`);

  if (!VALID_SLUG.test(slug)) return null;
  return (await getArchive())[slug] ?? null;
}

/** Current slug for a company that was renamed upstream (from its redirectFrom). */
export async function findSlugByAlias(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  for (const company of Object.values(await getArchive())) {
    if (company.aliases.includes(slug)) return company.slug;
  }
  return null;
}

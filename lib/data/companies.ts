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
const ARCHIVE_TTL_MS = 60 * 60 * 1000;

type Archive = Map<string, CompanyProfile>;

async function downloadArchive(): Promise<Archive> {
  const response = await fetch(TARBALL_URL, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`Downloading ${TARBALL_URL} failed: ${response.status} ${response.statusText}`);
  }
  // Read and parse in one go: few awaits keep React's dev-only async tracking happy.
  const tarball = Buffer.from(await response.arrayBuffer());

  const companies: Archive = new Map();
  readTar(gunzipSync(tarball), (path, content) => {
    const slug = COMPANY_FILE.exec(path)?.[1];
    if (!slug) return;
    const company = parseCompanyFile(slug, content.toString("utf8"));
    if (company) companies.set(slug, company);
  });
  if (companies.size === 0) throw new Error(`No company files found in ${TARBALL_URL}`);
  return companies;
}

// One download per server process (or build worker), refreshed hourly. The
// cached functions below decide how long their own results live.
let archive: { promise: Promise<Archive>; loadedAt: number } | null = null;

function loadArchive(): Promise<Archive> {
  const now = Date.now();
  if (!archive || now - archive.loadedAt > ARCHIVE_TTL_MS) {
    const promise = downloadArchive();
    archive = { promise, loadedAt: now };
    // Don't keep a failed download around.
    promise.catch(() => {
      if (archive?.promise === promise) archive = null;
    });
  }
  return archive.promise;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

export async function getCompanyIndex(): Promise<CompanyListItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag("companies");

  const companies = await loadArchive();
  return [...companies.values()].map(toListItem).sort(byName);
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

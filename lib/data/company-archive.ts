import { gunzipSync } from "node:zlib";
import { parseCompanyFile, type CompanyProfile } from "./parse";
import { mergeDuplicateCompanies } from "./same-company";
import { readTar } from "./tar";

// All company data comes from remoteintech/remote-jobs. The whole repo is
// downloaded as one tarball (~2.6 MB, no token needed): one request instead of
// one per company.
const REPO = "remoteintech/remote-jobs";
const BRANCH = "main";
const TARBALL_URL = `https://codeload.github.com/${REPO}/tar.gz/${BRANCH}`;
export const UPSTREAM_REPO_URL = `https://github.com/${REPO}`;
export const upstreamFileUrl = (slug: string) => `${UPSTREAM_REPO_URL}/blob/${BRANCH}/src/companies/${slug}.md`;

const COMPANY_FILE = /^[^/]+\/src\/companies\/([^/]+)\.md$/;
const DOWNLOAD_ATTEMPTS = 3;

/**
 * The unzipped tarball, retried with backoff so a network blip doesn't fail a
 * refresh. It skips Next's fetch cache: every refresh gets today's list.
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

/** Every company profile, with duplicates merged (O'Reilly Media and O'Reilly Online Learning are one). */
export async function downloadCompanies(hasBoard: (slug: string) => boolean): Promise<Map<string, CompanyProfile>> {
  const tar = await fetchTarball();
  const companies = new Map<string, CompanyProfile>();
  readTar(tar, (path, content) => {
    const slug = COMPANY_FILE.exec(path)?.[1];
    if (!slug) return;
    const company = parseCompanyFile(slug, content.toString("utf8"));
    if (company) companies.set(slug, company);
  });
  if (companies.size === 0) throw new Error(`No company files found in ${TARBALL_URL}`);
  mergeDuplicateCompanies(companies, hasBoard);
  return companies;
}

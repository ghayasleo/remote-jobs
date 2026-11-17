import axios from "axios";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import { gunzipSync } from "node:zlib";
import { label, techLabels } from "./labels";

// Company data lives in remoteintech/remote-jobs as one Markdown file per
// company (src/companies/{slug}.md) with YAML frontmatter. See that repo's
// CONTRIBUTING.md for the fields and their allowed values.
const REPO = "remoteintech/remote-jobs";
const BRANCH = "main";
const TARBALL_URL = `https://codeload.github.com/${REPO}/tar.gz/${BRANCH}`;
const companyFileUrl = (slug: string) =>
  `https://raw.githubusercontent.com/${REPO}/${BRANCH}/src/companies/${slug}.md`;

const ONE_DAY = 60 * 60 * 24;
const COMPANY_FILE = /^[^/]+\/src\/companies\/([^/]+)\.md$/;
const VALID_SLUG = /^[a-z0-9-]+$/i;

export type Company = {
  id: number;
  slug: string;
  name: string;
  website: string;
  careersUrl: string | null;
  region: string;
  remotePolicy: string;
  companySize: string | null;
  technologies: string[];
  // Lowercased tech tags, their labels and the free-text "Company technologies"
  // section, so a search like "aws" or "laravel" still finds companies.
  searchTech: string;
  // Old slugs that should redirect to this company.
  aliases: string[];
};

export type CompanyProfile = { company: Company; body: string };

function parseCompany(slug: string, raw: string): CompanyProfile | null {
  // Passing an options object stops gray-matter from caching every file it has
  // ever parsed, which would grow forever on a long-running server.
  const { data, content } = matter(raw, {});
  if (!data.title || !data.website) return null;

  const technologies: string[] = Array.isArray(data.technologies)
    ? data.technologies.map(String)
    : [];
  const techSection =
    content.match(/##\s*Company technologies\s*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] ?? "";
  const aliases: string[] = Array.isArray(data.redirectFrom)
    ? data.redirectFrom.map((path: string) => String(path).split("/").pop() ?? "")
    : [];

  return {
    company: {
      id: 0,
      slug,
      name: String(data.title),
      website: String(data.website),
      careersUrl: data.careers_url ? String(data.careers_url) : null,
      region: String(data.region ?? "other"),
      remotePolicy: String(data.remote_policy ?? ""),
      companySize: data.company_size ? String(data.company_size) : null,
      technologies,
      searchTech: [...technologies, ...technologies.map((t) => label(techLabels, t)), techSection]
        .join(" ")
        .toLowerCase(),
      aliases: aliases.filter(Boolean),
    },
    body: content,
  };
}

// Calls onFile for every regular file in a tar archive (the ustar/pax format
// GitHub serves). It is synchronous on purpose: reading the archive as a stream
// takes thousands of awaits, which overflows the call stack in React's
// dev-only async tracking.
function readTar(archive: Buffer, onFile: (path: string, content: Buffer) => void) {
  let offset = 0;
  let paxPath: string | null = null;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break; // end-of-archive marker

    const field = (start: number, length: number) =>
      header.subarray(start, start + length).toString("utf8").replace(/\0[\s\S]*$/, "");
    const size = parseInt(field(124, 12).trim() || "0", 8);
    const type = field(156, 1) || "0";
    const prefix = field(345, 155);
    const name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);
    const body = archive.subarray(offset + 512, offset + 512 + size);

    if (type === "x") {
      // pax extended header: carries the full path when it is too long for `name`
      paxPath = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(body.toString("utf8"))?.[1] ?? null;
    } else {
      if (type === "0") onFile(paxPath ?? name, body);
      paxPath = null;
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
}

// Downloads the whole repo as one tarball (~2.6 MB) and returns the raw
// Markdown of every company file, keyed by slug. One request instead of one
// per company, and no GitHub token needed.
async function downloadCompanyFiles() {
  const { data } = await axios.get<ArrayBuffer>(TARBALL_URL, {
    responseType: "arraybuffer",
    timeout: 60_000,
  });

  const files = new Map<string, string>();
  readTar(gunzipSync(Buffer.from(data)), (path, content) => {
    const slug = COMPANY_FILE.exec(path)?.[1];
    if (slug) files.set(slug, content.toString("utf8"));
  });
  return files;
}

export const getCompanies = unstable_cache(
  async (): Promise<Company[]> => {
    const files = await downloadCompanyFiles();
    if (files.size === 0) {
      throw new Error(`No company files found in ${TARBALL_URL}`);
    }

    return [...files]
      .map(([slug, raw]) => parseCompany(slug, raw)?.company)
      .filter((company): company is Company => !!company)
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
      .map((company, index) => ({ ...company, id: index + 1 }));
  },
  ["remoteintech-companies"],
  { revalidate: ONE_DAY },
);

export async function getCompanyProfile(slug: string): Promise<CompanyProfile | null> {
  if (!VALID_SLUG.test(slug)) return null;

  const response = await fetch(companyFileUrl(slug), { next: { revalidate: ONE_DAY } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to load ${slug}: ${response.status} ${response.statusText}`);
  }
  return parseCompany(slug, await response.text());
}

// Finds the current slug for a company that was renamed upstream.
export async function findSlugByAlias(slug: string) {
  const companies = await getCompanies();
  return companies.find((company) => company.aliases.includes(slug))?.slug ?? null;
}

import axios from "axios";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import { pipeline, type Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { extract } from "tar-stream";
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

// Downloads the whole repo as one tarball (~2.6 MB) and returns the raw
// Markdown of every company file, keyed by slug. One request instead of one
// per company, and no GitHub token needed.
async function downloadCompanyFiles() {
  const response = await axios.get<Readable>(TARBALL_URL, {
    responseType: "stream",
    timeout: 60_000,
  });

  const extractor = extract();
  pipeline(response.data, createGunzip(), extractor, (error) => {
    if (error) extractor.destroy(error);
  });

  const files = new Map<string, string>();
  for await (const entry of extractor) {
    const match = entry.header.type === "file" ? COMPANY_FILE.exec(entry.header.name) : null;
    const chunks: Buffer[] = [];
    // Every entry has to be read to the end before the next one arrives.
    for await (const chunk of entry) if (match) chunks.push(chunk as Buffer);
    if (match) files.set(match[1], Buffer.concat(chunks).toString("utf8"));
  }
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

import { parse as parseYaml } from "yaml";
import { label, techLabels } from "./labels";

// One company file from remoteintech/remote-jobs: src/companies/{slug}.md,
// YAML frontmatter followed by "## Section" blocks of Markdown. See that
// repo's CONTRIBUTING.md for the fields and their allowed values.

export type SectionId =
  | "blurb"
  | "remoteStatus"
  | "region"
  | "companySize"
  | "technologies"
  | "officeLocations"
  | "howToApply"
  | "other";

export type ProfileSection = { id: SectionId; title: string; markdown: string };

export type Company = {
  slug: string;
  name: string;
  website: string;
  domain: string | null;
  careersUrl: string | null;
  region: string;
  remotePolicy: string;
  companySize: string | null;
  technologies: string[];
  /** ISO date (YYYY-MM-DD) the company was added upstream. */
  addedAt: string | null;
  updatedAt: string | null;
  /** Short plain-text summary from the "Company blurb" section. */
  blurb: string;
};

export type CompanyProfile = Company & {
  /** Old slugs that should redirect here. */
  aliases: string[];
  sections: ProfileSection[];
};

/** What the Explore list needs: no long Markdown. */
export type CompanyListItem = Company & {
  /**
   * Extra search words from the free-text "Company technologies" section
   * (e.g. "aws kafka laravel"), minus anything already in the other fields.
   * The browser builds the full search text from these, which keeps the page
   * payload small.
   */
  keywords: string;
};

const STOP_WORDS = new Set(
  "a an and are as at be but by etc for from in is it more of on or our the to us we with use uses using also other others".split(" "),
);

// Tech-style tokens: keeps "c#", "c++", ".net", "node.js"; drops sentence-ending dots.
const tokens = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/\.+$/, ""))
    .filter(Boolean);

/** Unique lowercase words in `text` that aren't in `known` or too common to help. */
export function extractKeywords(text: string, known: string) {
  const seen = new Set<string>();
  for (const token of tokens(known)) {
    seen.add(token);
    for (const part of token.split(".")) if (part) seen.add(part); // "wordpress.com" knows "wordpress"
  }
  const words: string[] = [];
  for (const word of tokens(text)) {
    if (word.length < 2 || STOP_WORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return words.join(" ");
}

const SECTION_IDS: Record<string, SectionId> = {
  "company blurb": "blurb",
  "remote status": "remoteStatus",
  region: "region",
  "company size": "companySize",
  "company technologies": "technologies",
  "office locations": "officeLocations",
  "how to apply": "howToApply",
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLURB_LENGTH = 160;

const text = (value: unknown) => (value == null ? "" : String(value).trim());
const optionalText = (value: unknown) => text(value) || null;
const isoDate = (value: unknown) => {
  const date = text(value);
  return ISO_DATE.test(date) ? date : null;
};

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function splitSections(markdown: string): ProfileSection[] {
  const sections: ProfileSection[] = [];
  const parts = markdown.split(/^##[ \t]+(.+?)[ \t]*$/m);
  // parts = [intro, title1, body1, title2, body2, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const body = (parts[i + 1] ?? "").trim();
    if (!body) continue;
    sections.push({ id: SECTION_IDS[title.toLowerCase()] ?? "other", title, markdown: body });
  }
  return sections;
}

/** Plain-text summary, cut at a sentence or word boundary. */
export function excerpt(markdown: string, maxLength = BLURB_LENGTH) {
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/<[^>]+>/g, "") // inline HTML
    .replace(/[*_`#>]/g, "")
    .replace(/\\\s*$/gm, "") // Markdown hard line breaks
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;

  const cut = plain.slice(0, maxLength);
  const sentenceEnd = cut.lastIndexOf(". ");
  if (sentenceEnd > maxLength * 0.5) return cut.slice(0, sentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

export function parseCompanyFile(slug: string, raw: string): CompanyProfile | null {
  const match = FRONTMATTER.exec(raw);
  if (!match) return null;

  let data: Record<string, unknown>;
  try {
    data = (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }

  const name = text(data.title);
  const website = text(data.website);
  if (!name || !website) return null;

  const sections = splitSections(match[2]);
  const blurbSection = sections.find((section) => section.id === "blurb") ?? sections[0];

  return {
    slug,
    name,
    website,
    domain: domainOf(website),
    careersUrl: optionalText(data.careers_url),
    region: text(data.region) || "other",
    remotePolicy: text(data.remote_policy),
    companySize: optionalText(data.company_size),
    technologies: Array.isArray(data.technologies) ? data.technologies.map(text).filter(Boolean) : [],
    addedAt: isoDate(data.addedAt),
    updatedAt: isoDate(data.updatedAt),
    blurb: blurbSection ? excerpt(blurbSection.markdown) : "",
    aliases: Array.isArray(data.redirectFrom)
      ? data.redirectFrom.map((path) => text(path).split("/").filter(Boolean).pop() ?? "").filter(Boolean)
      : [],
    sections,
  };
}

export function toListItem(profile: CompanyProfile): CompanyListItem {
  // Only the list fields: aliases and full sections stay out of the payload.
  const company: Company = {
    slug: profile.slug,
    name: profile.name,
    website: profile.website,
    domain: profile.domain,
    careersUrl: profile.careersUrl,
    region: profile.region,
    remotePolicy: profile.remotePolicy,
    companySize: profile.companySize,
    technologies: profile.technologies,
    addedAt: profile.addedAt,
    updatedAt: profile.updatedAt,
    blurb: profile.blurb,
  };
  const stackSection =
    profile.sections.find((section) => section.id === "technologies")?.markdown ?? "";
  const known = [company.name, company.blurb, ...company.technologies, ...company.technologies.map((tech) => label(techLabels, tech))].join(" ");
  return { ...company, keywords: extractKeywords(excerpt(stackSection, 400), known) };
}

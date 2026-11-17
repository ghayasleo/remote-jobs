import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDate } from "@/lib/format";
import { companySizeLabels, label, remotePolicyLabels } from "@/lib/data/labels";
import type { ProfileSection, SectionId } from "@/lib/data/parse";
import { RegionChip } from "./chips";

const UPSTREAM_SITE = "https://remoteintech.company";

export const SECTION_TITLES: Partial<Record<SectionId, string>> = {
  blurb: "About",
  remoteStatus: "How they work remotely",
  region: "Where they hire",
  companySize: "Team size",
  technologies: "Tech stack",
  officeLocations: "Offices",
  howToApply: "How to apply",
};

function MarkdownLink({ href = "", children }: { href?: string; children?: React.ReactNode }) {
  // Upstream profiles link to each other as /companies/{slug}.
  const profile = /^\/companies\/([a-z0-9-]+)\/?$/i.exec(href)?.[1];
  if (profile) return <Link href={`/company-profiles/${profile}`}>{children}</Link>;
  const url = href.startsWith("/") ? `${UPSTREAM_SITE}${href}` : href;
  if (!/^https?:\/\//.test(url)) return <a href={url}>{children}</a>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const MARKDOWN: Components = {
  a: MarkdownLink,
  // Keep the page's heading outline: sections are h2, anything inside is h3.
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
  img: () => null, // community images are often broken or huge
};

export function ProfileSectionView({ section }: { section: ProfileSection }) {
  const id = `section-${section.id === "other" ? section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : section.id}`;
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2 id={id} className="text-lg font-bold tracking-tight">
        {SECTION_TITLES[section.id] ?? section.title}
      </h2>
      <div className="prose-app prose mt-2 max-w-[36rem] prose-p:my-2.5 prose-ul:my-2.5">
        <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
          {section.markdown}
        </Markdown>
      </div>
    </section>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </div>
  );
}

export function CompanyFacts({
  region,
  remotePolicy,
  companySize,
  addedAt,
}: {
  region: string;
  remotePolicy: string;
  companySize: string | null;
  addedAt: string | null;
}) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
      <Fact term="Hires in">
        <RegionChip region={region} className="mt-0.5" />
      </Fact>
      <Fact term="Remote policy">{label(remotePolicyLabels, remotePolicy) || "Not stated"}</Fact>
      <Fact term="Team size">{companySize ? `${label(companySizeLabels, companySize)} people` : "Not stated"}</Fact>
      <Fact term="On the list since">{addedAt ? formatDate(addedAt) : "A while"}</Fact>
    </dl>
  );
}

import Link from "next/link";
import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import { CompanyRow } from "@/components/company/company-row";
import { FaqSection } from "@/components/faq-section";
import { Button } from "@/components/ui/button";
import type { ExploreData } from "@/lib/data/explore-data";
import { techLabels } from "@/lib/data/labels";
import { formatDate } from "@/lib/format";
import { REGION_FILTERS, isRecent, type ExploreCompany } from "@/lib/explore";
import { exploreHref, topicCopy, topicFaqs, topicPath, topicSummary, type Topic } from "@/lib/landing";
import { absoluteUrl, jsonLd } from "@/lib/site";

const SHOWN = 30;

type LandingLink = { topic: Topic; count: number; path: string };

function Breadcrumbs({ topic }: { topic: Topic }) {
  const crumbs = [
    { name: "Companies", href: "/" },
    { name: "Browse", href: "/remote" },
    ...(topic.region ? [{ name: REGION_FILTERS[topic.region].label, href: topicPath({ region: topic.region }) }] : []),
    ...(topic.stack ? [{ name: techLabels[topic.stack], href: topicPath(topic) }] : []),
  ];
  return (
    <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-3.5" aria-hidden />}
            {index === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-foreground">
                {crumb.name}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground hover:underline">
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function RelatedLinks({ title, links, name }: { title: string; links: LandingLink[]; name: (link: LandingLink) => string }) {
  if (links.length === 0) return null;
  return (
    <section className="px-4 sm:px-6">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              href={link.path}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {name(link)}
              <span className="text-muted-foreground tabular-nums">{link.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A landing page: what this slice of companies looks like, then the companies. */
export function LandingView({
  topic,
  companies,
  hiring,
  newSince,
  updatedAt,
  pages,
}: {
  topic: Topic;
  companies: ExploreCompany[];
  hiring: ExploreData["hiring"];
  newSince: string;
  updatedAt: string;
  pages: LandingLink[];
}) {
  const { heading, tech, place } = topicCopy(topic);
  const summary = topicSummary(topic, companies, hiring);
  const shown = companies.slice(0, SHOWN);
  const path = topicPath(topic);

  // Same stack elsewhere, and other stacks in the same place.
  const otherRegions = topic.stack
    ? pages.filter((page) => page.topic.stack === topic.stack && page.topic.region && page.topic.region !== topic.region)
    : pages.filter((page) => page.topic.region && !page.topic.stack && page.topic.region !== topic.region);
  const otherStacks = pages
    .filter((page) => page.topic.stack && page.topic.stack !== topic.stack && page.topic.region === topic.region)
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: heading,
        numberOfItems: companies.length,
        itemListElement: shown.map((company, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/company-profiles/${company.slug}`),
          name: company.name,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Companies", item: absoluteUrl("/companies") },
          { "@type": "ListItem", position: 2, name: "Browse", item: absoluteUrl("/remote") },
          { "@type": "ListItem", position: 3, name: heading, item: absoluteUrl(path) },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <Breadcrumbs topic={topic} />

      <header className="px-4 pt-4 pb-6 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">{summary.intro}</p>
        <dl className="mt-5 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border text-center">
          {[
            ["Companies", companies.length],
            ["Hiring now", summary.hiringCount],
            ["Remote roles", summary.remoteRoles],
          ].map(([term, value]) => (
            <div key={term} className="bg-card px-3 py-3">
              <dd className="text-xl font-bold tabular-nums">{value}</dd>
              <dt className="text-xs text-muted-foreground">{term}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          As of <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>; open roles refresh every hour.
        </p>
        <Button asChild className="mt-5 h-11 rounded-full px-5">
          <Link href={exploreHref(topic)}>
            Search and filter these
            <ArrowRightIcon aria-hidden />
          </Link>
        </Button>
      </header>

      <h2 className="sr-only">Companies</h2>
      <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
        {shown.map((company) => (
          <CompanyRow key={company.slug} company={company} hiring={hiring[company.slug]} isNew={isRecent(company, newSince)} />
        ))}
      </ul>
      {companies.length > shown.length && (
        <p className="px-4 pt-4 sm:px-6">
          <Link href={exploreHref(topic)} className="font-medium text-primary underline underline-offset-4">
            See all {companies.length} companies in Explore
          </Link>
        </p>
      )}

      <div className="mt-10 space-y-8">
        <FaqSection faqs={topicFaqs(topic, companies, hiring)} className="px-4 sm:px-6" />
        <RelatedLinks
          title={tech ? `${tech} companies in other places` : "Other places"}
          links={otherRegions}
          name={(link) => REGION_FILTERS[link.topic.region!].label}
        />
        <RelatedLinks
          title={place ? `Other stacks, ${place === "anywhere" ? "hiring worldwide" : `in ${place}`}` : "Other stacks"}
          links={otherStacks}
          name={(link) => techLabels[link.topic.stack!]}
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { FaqSection } from "@/components/faq-section";
import { JobRow } from "@/components/jobs/job-row";
import { countryFaqs, countryPath, regionName } from "@/lib/countries";
import type { CountryIndexEntry, CountryPage } from "@/lib/data/countries";
import { formatDate } from "@/lib/format";
import { DEFAULT_JOB_PARAMS, serializeJobParams, type JobListing, type JobRegion } from "@/lib/jobs";
import { absoluteUrl, jsonLd } from "@/lib/site";

const number = new Intl.NumberFormat("en");
const jobsHref = (where: JobRegion) => `/jobs${serializeJobParams({ ...DEFAULT_JOB_PARAMS, where: [where] })}`;

const pill =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-muted";

function Breadcrumbs({ name }: { name: string }) {
  const crumbs = [
    { name: "Browse", href: "/remote" },
    { name: "Countries", href: "/remote/in" },
  ];
  return (
    <nav aria-label="Breadcrumb" className="px-4 pt-4 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <Link href={crumb.href} className="hover:text-foreground hover:underline">
              {crumb.name}
            </Link>
            <ChevronRightIcon className="size-3.5" aria-hidden />
          </li>
        ))}
        <li aria-current="page" className="font-medium text-foreground">
          {name}
        </li>
      </ol>
    </nav>
  );
}

function RoleSection({
  id,
  title,
  hint,
  jobs,
  count,
  more,
}: {
  id: string;
  title: string;
  hint: string;
  jobs: JobListing[];
  count: number;
  more: { href: string; label: string };
}) {
  if (count === 0) return null;
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="px-4 pb-3 sm:px-6">
        <h2 id={id} className="text-lg font-bold tracking-tight">
          {title} <span className="font-semibold text-muted-foreground tabular-nums">{number.format(count)}</span>
        </h2>
        <p className="mt-0.5 max-w-[36rem] text-sm text-muted-foreground">{hint}</p>
      </div>
      <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
        {jobs.map((job) => (
          <JobRow key={`${job.company}-${job.id}`} job={job} />
        ))}
      </ul>
      {count > jobs.length && (
        <p className="px-4 pt-4 sm:px-6">
          <Link href={more.href} className="font-medium text-primary underline underline-offset-4">
            {more.label}
          </Link>
        </p>
      )}
    </section>
  );
}

/** "Remote jobs in <country>": the roles someone living there can apply to. */
export function CountryView({ page, neighbours }: { page: CountryPage; neighbours: CountryIndexEntry[] }) {
  const { country, counts, companyCount, topCompanies, categories, updatedAt } = page;
  const region = regionName(country);
  const asOf = formatDate(updatedAt);
  const faqs = countryFaqs({ country, counts, companyCount, topCompanies, categories, asOf });
  const path = countryPath(country);
  const shown = [...page.named, ...page.regional, ...page.worldwide];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `Remote jobs open to people in ${country.name}`,
        numberOfItems: counts.total,
        itemListElement: shown.slice(0, 50).map((job, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/jobs/${job.company}/${encodeURIComponent(job.id)}`),
          name: `${job.title} at ${job.companyName}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Browse", item: absoluteUrl("/remote") },
          { "@type": "ListItem", position: 2, name: "Countries", item: absoluteUrl("/remote/in") },
          { "@type": "ListItem", position: 3, name: country.name, item: absoluteUrl(path) },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <Breadcrumbs name={country.name} />

      <header className="px-4 pt-4 pb-2 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Remote jobs in {country.name}</h1>
        <p className="mt-2 max-w-[36rem] leading-relaxed text-foreground/85">{faqs[0].answer}</p>
        <dl className="mt-5 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border text-center">
          {[
            ["Open to you", counts.total],
            ["Companies", companyCount],
            [`Name ${country.name}`, counts.named],
          ].map(([term, value]) => (
            <div key={term} className="bg-card px-3 py-3">
              <dd className="text-xl font-bold tabular-nums">{number.format(Number(value))}</dd>
              <dt className="truncate text-xs text-muted-foreground">{term}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          As of <time dateTime={updatedAt}>{asOf}</time>; open roles refresh every hour.
        </p>
      </header>

      <RoleSection
        id="named"
        title={`Roles that name ${country.name}`}
        hint={`The posting lists ${country.name} among the places you can work from.`}
        jobs={page.named}
        count={counts.named}
        more={{ href: jobsHref(country.region), label: `See more roles in ${region}` }}
      />
      <RoleSection
        id="regional"
        title={`Open across ${region}`}
        hint={`The posting names the region (like “EMEA” or “APAC”) rather than countries, so check that ${country.name} is included.`}
        jobs={page.regional}
        count={counts.regional}
        more={{ href: jobsHref(country.region), label: `See all roles in ${region}` }}
      />
      <RoleSection
        id="worldwide"
        title="Open worldwide"
        hint="Open from anywhere, including roles listed only as “Remote” at companies that hire worldwide."
        jobs={page.worldwide}
        count={counts.worldwide}
        more={{ href: jobsHref("anywhere"), label: "See all worldwide roles" }}
      />

      <div className="mt-10 space-y-8 px-4 sm:px-6">
        {topCompanies.length > 0 && (
          <section aria-labelledby="companies">
            <h2 id="companies" className="text-base font-bold tracking-tight">
              Companies hiring from {country.name}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {topCompanies.map((company) => (
                <li key={company.slug}>
                  <Link href={`/company-profiles/${company.slug}`} className={pill}>
                    {company.name}
                    <span className="text-muted-foreground tabular-nums">{company.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <FaqSection faqs={faqs} />

        {neighbours.length > 0 && (
          <section aria-labelledby="neighbours">
            <h2 id="neighbours" className="text-base font-bold tracking-tight">
              Other countries in {region}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {neighbours.map((neighbour) => (
                <li key={neighbour.slug}>
                  <Link href={countryPath(neighbour)} className={pill}>
                    {neighbour.name}
                    <span className="text-muted-foreground tabular-nums">{neighbour.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

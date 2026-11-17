import type { Metadata } from "next";
import Link from "next/link";
import { RssIcon } from "lucide-react";
import { CompanyRow } from "@/components/company/company-row";
import { JobRow } from "@/components/jobs/job-row";
import { getNewThisWeek } from "@/lib/data/jobs";

const SHOWN = 50;

export async function generateMetadata(): Promise<Metadata> {
  const { jobs } = await getNewThisWeek();
  return {
    title: `New this week: ${jobs.length} fresh remote roles`,
    description: `${jobs.length} remote tech roles posted in the last 7 days, plus the newest remote-friendly companies on the list.`,
    alternates: { canonical: "/new" },
  };
}

function FeedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4">
      <RssIcon className="size-4" aria-hidden />
      {children}
    </a>
  );
}

export default async function NewThisWeekPage() {
  const { jobs, companies } = await getNewThisWeek();
  const byCompany = new Set(jobs.map((job) => job.company)).size;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <header className="px-4 pt-6 pb-5 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New this week</h1>
        <p className="mt-1.5 max-w-[36rem] text-muted-foreground">
          <span className="font-semibold text-foreground">{jobs.length} remote roles</span> posted in the last 7 days at{" "}
          {byCompany} companies. Follow along in any feed reader.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <FeedLink href="/feeds/jobs.xml">New roles feed</FeedLink>
          <FeedLink href="/feeds/companies.xml">New companies feed</FeedLink>
        </div>
      </header>

      <section aria-labelledby="new-roles">
        <h2 id="new-roles" className="px-4 pb-3 text-lg font-bold tracking-tight sm:px-6">
          Fresh remote roles
        </h2>
        {jobs.length === 0 ? (
          <p className="px-4 text-muted-foreground sm:px-6">Nothing new in the last week. Check back soon.</p>
        ) : (
          <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
            {jobs.slice(0, SHOWN).map((job) => (
              <JobRow key={`${job.company}-${job.id}`} job={job} />
            ))}
          </ul>
        )}
        {jobs.length > SHOWN && (
          <p className="px-4 pt-4 sm:px-6">
            <Link href="/jobs?posted=7d" className="font-medium text-primary underline underline-offset-4">
              See all {jobs.length} from this week
            </Link>
          </p>
        )}
      </section>

      <section aria-labelledby="new-companies" className="mt-10">
        <h2 id="new-companies" className="px-4 pb-3 text-lg font-bold tracking-tight sm:px-6">
          Newest companies on the list
        </h2>
        <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
          {companies.map((company) => (
            <CompanyRow key={company.slug} company={company} isNew={false} />
          ))}
        </ul>
      </section>
    </div>
  );
}

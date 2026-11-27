import { Suspense } from "react";
import { CV_CHECK_ENABLED } from "@/lib/features";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ArrowUpRightIcon, BriefcaseIcon, FileCheckIcon } from "lucide-react";
import { Tag } from "@/components/company/chips";
import { CompanyLogo } from "@/components/company/company-logo";
import { CompanySkeleton } from "@/components/company/company-skeleton";
import { ShareButton } from "@/components/company/share-button";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { JobActionBar } from "@/components/jobs/job-action-bar";
import { JobRow, RemoteBadge } from "@/components/jobs/job-row";
import { RelativeTime } from "@/components/relative-time";
import { BackButton } from "@/components/shell/navigation";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/data/job-boards";
import { postingText } from "@/lib/data/job-boards/sanitize";
import { getJob, getRemoteJobs, roleListing } from "@/lib/data/jobs";
import { JOB_CATEGORIES, jobCategory, jobPath, jobSlug } from "@/lib/jobs";
import { clip, jobPostingJsonLd } from "@/lib/seo";
import { similarRoles } from "@/lib/similar";
import { formatHours, hoursInPosting, roleHours } from "@/lib/timezones";
import { DEFAULT_OG_IMAGE, OG_BASE, absoluteUrl, jsonLd } from "@/lib/site";

type Props = PageProps<"/jobs/[company]/[id]/[[...slug]]">;

// The newest roles are prerendered; every other role page renders on its first
// visit and is then cached like the rest.
export async function generateStaticParams() {
  const jobs = await getRemoteJobs();
  return jobs.slice(0, 30).map((job) => ({ company: job.company, id: job.id, slug: [jobSlug(job.title)] }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company, id } = await params;
  const job = await getJob(company, decodeURIComponent(id));
  if (!job) return { title: "Role not found", robots: { index: false } };
  // The page redirects to the posting this one repeats.
  if (job.status === "repost") return { title: `${job.role.title} at ${job.company.name}`, robots: { index: false } };
  if (job.status !== "open") return { title: `Role closed · ${job.company.name}`, robots: { index: false } };

  const { role } = job;
  const title = `${role.title} at ${job.company.name} (Remote)`;
  const where = role.location ? ` (${role.location})` : "";
  const description = clip(
    `${job.company.name} is hiring a remote ${role.title}${where}. ${job.detail ? postingText(job.detail.html) : job.company.blurb}`,
  );
  const url = jobPath({ company, id: role.id, title: role.title });
  // The same role posted for another location points search engines at the main posting.
  const canonical = jobPath({ company, id: job.canonicalId, title: role.title });
  return { title, description, alternates: { canonical }, openGraph: { ...OG_BASE, title, description, url, images: [DEFAULT_OG_IMAGE] } };
}

export default function JobPage({ params }: Props) {
  return (
    <Suspense fallback={<CompanySkeleton />}>
      <JobView params={params} />
    </Suspense>
  );
}

/** A company's other remote roles, as list items for this page. */
const toListings = (company: { slug: string; name: string; domain: string | null }, roles: Role[]) =>
  roles.slice(0, 5).map((role) => roleListing(company, role));

async function JobView({ params }: Pick<Props, "params">) {
  const { company: companySlug, id: rawId, slug } = await params;
  const job = await getJob(companySlug, decodeURIComponent(rawId));
  if (!job) notFound();
  const { company } = job;
  // A repost of a posting that's listed under another id: show that one.
  if (job.status === "repost") redirect(jobPath({ company: company.slug, id: job.role.id, title: job.role.title }));
  const companyLink = (
    <Link href={`/company-profiles/${company.slug}`} className="font-semibold hover:underline">
      {company.name}
    </Link>
  );

  if (job.status !== "open") {
    const others = job.status === "closed" ? toListings(company, job.others) : [];
    return (
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-6">
        <BackButton label="All jobs" fallbackHref="/jobs" />
        <div className="mt-4 rounded-2xl border border-dashed p-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-hiring text-hiring-foreground">
            <BriefcaseIcon className="size-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-bold">
            {job.status === "closed" ? "This role has closed" : "We couldn’t load this role just now"}
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            {job.status === "closed"
              ? `${company.name} no longer lists it. Here’s what they’re hiring for instead.`
              : `${company.name}’s job board didn’t answer. Try again in a few minutes.`}
          </p>
        </div>
        {others.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold tracking-tight">Open remote roles at {company.name}</h2>
            <ul className="divide-y rounded-2xl border">
              {others.map((other) => (
                <JobRow key={other.id} job={other} showCompany={false} />
              ))}
            </ul>
          </section>
        )}
        <p className="mt-6 text-sm">
          <Link href="/jobs" className="font-medium text-primary underline underline-offset-4">
            Browse every remote role
          </Link>
        </p>
      </div>
    );
  }

  const { role, detail } = job;
  const path = jobPath({ company: company.slug, id: role.id, title: role.title });
  // Links without the title, or with an old one, go to the current address.
  if (companySlug !== company.slug || slug?.length !== 1 || slug[0] !== jobSlug(role.title)) permanentRedirect(path);
  const facts = [role.location, role.team, role.employmentType].filter(Boolean);
  // Working hours: what the description asks for, else what the title and locations say.
  const statedInPosting = detail ? hoursInPosting(postingText(detail.html)) : null;
  const hours = statedInPosting ?? roleHours(job.locations.length ? job.locations : [role.location], role.title);
  const cvCheckHref = `/cv-check?role=${company.slug}/${encodeURIComponent(role.id)}`;
  const savable = { company: company.slug, companyName: company.name, domain: company.domain, id: role.id, title: role.title, location: role.location };
  const pay = detail?.payText ?? role.salary;
  const others = toListings(company, job.others);
  const similar = similarRoles(
    { company: company.slug, id: role.id, title: role.title, category: jobCategory(role.title, role.team), postedAt: role.postedAt },
    await getRemoteJobs(),
  );
  // Only the main posting carries Google Jobs markup, listing every location the role is open in.
  const isMain = role.id === job.canonicalId;
  const posting =
    isMain &&
    detail &&
    jobPostingJsonLd({ company, role, html: detail.html, url: absoluteUrl(path), fallbackDate: job.fetchedAt, locations: job.locations });

  return (
    <article className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-6">
      {posting && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(posting)} />}
      <BackButton label="All jobs" fallbackHref="/jobs" />

      <header className="mt-3">
        <div className="flex items-center gap-3">
          <CompanyLogo name={company.name} domain={company.domain} />
          <p>
            {companyLink}
            {company.domain && <span className="block text-sm text-muted-foreground">{company.domain}</span>}
          </p>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{role.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <RemoteBadge />
          <Tag>{JOB_CATEGORIES[jobCategory(role.title, role.team)]}</Tag>
          {facts.map((fact) => (
            <Tag key={fact}>{fact}</Tag>
          ))}
          {hours && <Tag>Hours: {formatHours(hours)}</Tag>}
        </div>
        {(pay || role.postedAt) && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {pay && <span className="font-semibold">{pay}</span>}
            {role.postedAt && (
              <span className="text-muted-foreground">
                Posted <RelativeTime iso={role.postedAt} />
              </span>
            )}
          </p>
        )}
        {job.siblings.length > 0 && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Also posted for </span>
            {job.siblings.map((sibling, index) => (
              <span key={sibling.id}>
                {index > 0 && <span className="text-muted-foreground">, </span>}
                <Link
                  href={jobPath({ company: company.slug, id: sibling.id, title: sibling.title })}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {sibling.location || "another location"}
                </Link>
              </span>
            ))}
          </p>
        )}
        <div className="mt-5 hidden gap-2 md:flex">
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <a href={role.url} target="_blank" rel="noopener noreferrer">
              Apply on {company.name}’s site
              <ArrowUpRightIcon aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
          <SaveJobButton job={savable} withLabel />
          {CV_CHECK_ENABLED && (
            <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-4">
              <Link href={cvCheckHref}>
                <FileCheckIcon aria-hidden />
                Check my CV
              </Link>
            </Button>
          )}
          <ShareButton name={`${role.title} at ${company.name}`} withLabel />
        </div>
      </header>

      <section aria-labelledby="description" className="mt-8">
        <h2 id="description" className="text-lg font-bold tracking-tight">
          About the role
        </h2>
        {detail ? (
          <div className="prose-app prose mt-2 max-w-[36rem] prose-p:my-2.5 prose-ul:my-2.5" dangerouslySetInnerHTML={{ __html: detail.html }} />
        ) : (
          <p className="mt-2 text-muted-foreground">
            The full description is on{" "}
            <a href={role.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
              {company.name}’s job board
            </a>
            .
          </p>
        )}
      </section>

      {CV_CHECK_ENABLED && (
        <Link
          href={cvCheckHref}
          className="mt-8 flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <FileCheckIcon className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Check my CV against this role</span>
            <span className="block text-sm text-muted-foreground">Free, and your CV stays on your device</span>
          </span>
        </Link>
      )}

      <section aria-labelledby="about-company" className="mt-10 rounded-2xl border p-5">
        <h2 id="about-company" className="text-lg font-bold tracking-tight">
          About {company.name}
        </h2>
        {company.blurb && <p className="mt-2 max-w-[36rem] text-foreground/85">{company.blurb}</p>}
        <Link href={`/company-profiles/${company.slug}`} className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4">
          How {company.name} works remotely
        </Link>
      </section>

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold tracking-tight">More remote roles at {company.name}</h2>
          <ul className="divide-y rounded-2xl border">
            {others.map((other) => (
              <JobRow key={other.id} job={other} showCompany={false} />
            ))}
          </ul>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Similar roles at other companies</h2>
          <ul className="divide-y rounded-2xl border">
            {similar.map((other) => (
              <JobRow key={`${other.company}:${other.id}`} job={other} />
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 border-t pt-5 text-sm text-muted-foreground">
        Listing from {company.name}’s {job.providerLabel} job board, checked <RelativeTime iso={job.fetchedAt} />. You
        apply on their site.
      </p>

      <JobActionBar job={savable} applyUrl={role.url} />
    </article>
  );
}

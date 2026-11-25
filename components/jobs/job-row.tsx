import Link from "next/link";
import { Tag } from "@/components/company/chips";
import { CompanyLogo } from "@/components/company/company-logo";
import { RelativeTime } from "@/components/relative-time";
import { JOB_CATEGORIES, jobLocations, jobPath, type JobListing } from "@/lib/jobs";

/** "Remote Canada +2 more" for a role posted once per location. */
export function locationSummary(locations: string[]) {
  const [first = "", ...rest] = locations.filter(Boolean);
  return rest.length ? `${first} +${rest.length} more` : first;
}

export function RemoteBadge() {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-region-worldwide px-2.5 text-xs font-semibold text-region-worldwide-foreground">
      Remote
    </span>
  );
}

/** One remote role in a list. The whole row opens its page. */
export function JobRow({ job, showCompany = true }: { job: JobListing; showCompany?: boolean }) {
  const meta = [showCompany ? job.companyName : null, locationSummary(jobLocations(job))].filter(Boolean).join(" · ");
  return (
    <li className="relative flex gap-3.5 px-4 py-4 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5">
      {showCompany && <CompanyLogo name={job.companyName} domain={job.domain} className="mt-0.5" />}
      <div className="min-w-0 flex-1">
        <h3 className="leading-6 font-semibold">
          <Link
            href={jobPath(job)}
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
          >
            {job.title}
          </Link>
        </h3>
        {meta && <p className="truncate text-sm text-muted-foreground">{meta}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <RemoteBadge />
          <Tag>{JOB_CATEGORIES[job.category]}</Tag>
          {job.employmentType && <Tag>{job.employmentType}</Tag>}
          {job.salary && <span className="px-1 text-xs font-semibold">{job.salary}</span>}
          {job.postedAt && (
            <span className="px-1 text-xs text-muted-foreground">
              <RelativeTime iso={job.postedAt} />
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

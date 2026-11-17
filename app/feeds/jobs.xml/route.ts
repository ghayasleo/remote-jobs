import { getRemoteJobs } from "@/lib/data/jobs";
import { JOB_CATEGORIES, jobPath } from "@/lib/jobs";
import { rssFeed, rssResponse } from "@/lib/rss";
import { absoluteUrl } from "@/lib/site";

// The newest remote roles, for feed readers. Refreshed with the hourly role data.
export async function GET() {
  const jobs = (await getRemoteJobs()).slice(0, 60);
  return rssResponse(
    rssFeed({
      title: "Remote Jobs: new remote roles",
      description: "The newest remote roles at remote-friendly tech companies, straight from their job boards.",
      siteUrl: absoluteUrl("/jobs"),
      feedUrl: absoluteUrl("/feeds/jobs.xml"),
      items: jobs.map((job) => ({
        title: `${job.title} at ${job.companyName}`,
        url: absoluteUrl(jobPath(job)),
        description: [job.location || "Remote", job.employmentType, job.salary].filter(Boolean).join(" · "),
        date: job.postedAt,
        categories: [JOB_CATEGORIES[job.category]],
      })),
    }),
  );
}

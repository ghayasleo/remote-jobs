import { getRemoteJobs } from "@/lib/data/jobs";
import { techLabels } from "@/lib/data/labels";
import { JOB_CATEGORIES, JOB_REGIONS, countryFromSlug, filterJobs, jobPath, parseJobParams, serializeJobParams } from "@/lib/jobs";
import { RSS_CACHE_CONTROL, rssFeed, rssResponse } from "@/lib/rss";
import { SITE_BRAND, absoluteUrl } from "@/lib/site";

const ITEMS = 60;

/**
 * The newest remote roles, for feed readers. Takes the same filters as the
 * Jobs page (?category=engineering&where=europe&q=python&pay=true) plus
 * ?country=<slug> for the roles open to people living there, so any search
 * can be followed. Each address is cached at the edge for an hour.
 */
export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const params = { ...parseJobParams(search.toString()), sort: "newest" as const };
  const country = countryFromSlug(params.country);
  const items = filterJobs(await getRemoteJobs(), params, Date.now()).slice(0, ITEMS);

  const about = [
    params.q.trim() && `“${params.q.trim()}”`,
    ...params.category.map((key) => JOB_CATEGORIES[key]),
    ...params.stack.map((key) => techLabels[key]),
    ...params.where.map((key) => JOB_REGIONS[key]),
    country && `open to people in ${country.name}`,
    params.pay && "pay listed",
  ].filter(Boolean);
  const query = serializeJobParams(params);

  const response = rssResponse(
    rssFeed({
      title: about.length ? `${SITE_BRAND}: remote roles · ${about.join(" · ")}` : `${SITE_BRAND}: new remote roles`,
      description: "The newest remote roles at remote-friendly tech companies, straight from their job boards.",
      siteUrl: absoluteUrl(`/jobs${query}`),
      feedUrl: absoluteUrl(`/feeds/jobs.xml${query}`),
      items: items.map((job) => ({
        title: `${job.title} at ${job.companyName}`,
        url: absoluteUrl(jobPath(job)),
        description: [job.location || "Remote", job.employmentType, job.salary].filter(Boolean).join(" · "),
        date: job.postedAt,
        categories: [JOB_CATEGORIES[job.category]],
      })),
    }),
  );
  response.headers.set("cache-control", RSS_CACHE_CONTROL);
  return response;
}

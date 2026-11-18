// IndexNow (indexnow.org) tells Bing, Yandex, Naver, Seznam and Yep about new
// pages the day they appear, instead of waiting for a crawl. The key isn't a
// secret: it's served at /<key>.txt so the engines know the pings are ours.

import { jobPath, type JobListing } from "@/lib/jobs";

export const INDEXNOW_KEY = "2d73ad98f6f79bee4003002339dd90c1";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const DAY_MS = 86_400_000;
// The cron runs daily; two days of overlap covers a late or missed run.
const WINDOW_MS = 2 * DAY_MS;

// Pages that change every hour, so they're worth a recrawl every day.
const LIVE_PAGES = ["/", "/jobs", "/new", "/insights"];

/** The pages to submit: the live ones, plus roles and companies new in the last two days. */
export function indexNowPaths({
  jobs,
  companies,
  now,
}: {
  jobs: Pick<JobListing, "company" | "id" | "title" | "postedAt">[];
  companies: { slug: string; addedAt: string | null }[];
  now: number;
}) {
  const since = now - WINDOW_MS;
  const isNew = (date: string | null) => date !== null && Date.parse(date) >= since;
  return [
    ...LIVE_PAGES,
    ...companies.filter((company) => isNew(company.addedAt)).map((company) => `/company-profiles/${company.slug}`),
    ...jobs.filter((job) => isNew(job.postedAt)).map((job) => jobPath(job)),
  ];
}

/** Submits up to 10,000 URLs of one host; returns IndexNow's HTTP status. */
export async function submitToIndexNow(siteUrl: string, urls: string[]) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key: INDEXNOW_KEY,
      keyLocation: new URL(`/${INDEXNOW_KEY}.txt`, siteUrl).toString(),
      urlList: urls.slice(0, 10_000),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  return response.status;
}

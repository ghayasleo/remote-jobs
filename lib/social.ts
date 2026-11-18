import type { JobListing } from "@/lib/jobs";

// The daily "new remote roles" post on Bluesky. Pure formatting here;
// sending lives in app/api/cron/social/route.ts.

const DAY_MS = 86_400_000;

/** Roles posted in the last day, newest first, at most one per company. */
export function pickDailyRoles(jobs: JobListing[], now: number, limit = 10) {
  const since = new Date(now - DAY_MS).toISOString();
  const seen = new Set<string>();
  const picked: JobListing[] = [];
  for (const job of jobs) {
    if (!job.postedAt || job.postedAt < since || seen.has(job.company)) continue;
    seen.add(job.company);
    picked.push(job);
    if (picked.length === limit) break;
  }
  return { picked, total: jobs.filter((job) => job.postedAt && job.postedAt >= since).length };
}

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const graphemes = (text: string) => [...segmenter.segment(text)].length;
const BLUESKY_LIMIT = 300;

/**
 * A Bluesky post (max 300 graphemes) with the link as a rich-text facet,
 * whose positions Bluesky counts in UTF-8 bytes.
 */
export function blueskyPost(picked: JobListing[], total: number, linkUrl: string) {
  const intro = `${total} new remote tech ${total === 1 ? "role" : "roles"} today`;
  const link = linkUrl.replace(/^https?:\/\//, "");
  const highlights: string[] = [];
  const build = () =>
    `${intro}${highlights.length ? `, including ${highlights.join(", ")}` : ""}.\n\n${link}`;
  for (const job of picked) {
    highlights.push(`${job.title} at ${job.companyName}`);
    if (graphemes(build()) > BLUESKY_LIMIT) {
      highlights.pop();
      break;
    }
  }
  const text = build();
  const bytes = new TextEncoder();
  const byteStart = bytes.encode(text.slice(0, text.lastIndexOf(link))).length;
  return {
    text,
    facets: [
      {
        index: { byteStart, byteEnd: byteStart + bytes.encode(link).length },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: linkUrl }],
      },
    ],
  };
}

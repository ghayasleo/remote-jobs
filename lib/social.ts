import type { JobListing } from "@/lib/jobs";

// The daily "new remote roles" post on Bluesky. Pure formatting here;
// sending (and the link card's image) lives in app/api/cron/social/route.ts.

const DAY_MS = 86_400_000;

/** Roles posted in the last day, newest first, at most one per company. */
export function pickDailyRoles(jobs: JobListing[], now: number, limit = 20) {
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
const TITLE_MAX = 60;
export const HASHTAGS = ["RemoteJobs", "TechJobs"];

// Latin letters plus the digits, punctuation and symbols every script shares.
const LATIN = /^[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]+$/u;
/** Whether a role's title and company read in English (well, Latin script), for an English-speaking feed. */
export const readsInEnglish = (job: Pick<JobListing, "title" | "companyName">) => LATIN.test(job.title) && LATIN.test(job.companyName);

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

/**
 * The post: the day's count, one role per line (as many as fit Bluesky's 300
 * graphemes) and hashtags. Facets mark the hashtags, at UTF-8 byte offsets,
 * which is how Bluesky counts them.
 */
export function blueskyPost(picked: JobListing[], total: number) {
  const head = `${total} new remote tech ${total === 1 ? "role" : "roles"} today`;
  const tags = HASHTAGS.map((tag) => `#${tag}`).join(" ");
  const lines: string[] = [];
  const build = () => [head, lines.join("\n"), tags].filter(Boolean).join("\n\n");
  for (const job of picked.filter(readsInEnglish)) {
    lines.push(`• ${clip(job.title, TITLE_MAX)} at ${job.companyName}`);
    if (graphemes(build()) > BLUESKY_LIMIT) {
      lines.pop();
      break;
    }
  }
  const text = build();
  const bytes = new TextEncoder();
  const facets = HASHTAGS.map((tag) => {
    const byteStart = bytes.encode(text.slice(0, text.lastIndexOf(`#${tag}`))).length;
    return {
      index: { byteStart, byteEnd: byteStart + bytes.encode(`#${tag}`).length },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag }],
    };
  });
  return { text, facets };
}

/** The link card under the post. Its image (thumb) is uploaded separately and added when it's there. */
export function blueskyLinkCard({ url, title, description }: { url: string; title: string; description: string }) {
  return { $type: "app.bsky.embed.external", external: { uri: url, title, description } };
}

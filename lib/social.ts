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

/* ---------- rich text and the weekly schedule of extra posts ---------- */

export type Segment = string | { link: string; text?: string } | { tag: string };

/** Text with link and hashtag facets, at the UTF-8 byte offsets Bluesky counts in. */
export function richText(segments: Segment[]) {
  const bytes = new TextEncoder();
  let text = "";
  const facets: { index: { byteStart: number; byteEnd: number }; features: Record<string, string>[] }[] = [];
  for (const segment of segments) {
    if (typeof segment === "string") {
      text += segment;
      continue;
    }
    const label = "link" in segment ? (segment.text ?? segment.link.replace(/^https?:\/\//, "")) : `#${segment.tag}`;
    const byteStart = bytes.encode(text).length;
    text += label;
    facets.push({
      index: { byteStart, byteEnd: byteStart + bytes.encode(label).length },
      features: [
        "link" in segment
          ? { $type: "app.bsky.richtext.facet#link", uri: segment.link }
          : { $type: "app.bsky.richtext.facet#tag", tag: segment.tag },
      ],
    });
  }
  return { text, facets };
}

/** What an image card shows; app/api/cron/social renders it. */
export type CardSpec =
  | { type: "insight"; number: string; caption: string; label: string }
  | { type: "weekly"; title: string; stats: [string, string][]; bars: { label: string; value: number }[] };

export type PlannedPost = { kind: string; segments: Segment[]; image?: { card: CardSpec; alt: string } };

export type SocialData = {
  /** The latest finished weekly report, if any. */
  weekly: {
    key: string;
    start: string;
    end: string;
    label: string;
    opened: number;
    closed: number;
    openAtEnd: number | null;
    topCompanies: { name: string; count: number }[];
  } | null;
  remoteRoles: number;
  companies: number;
  paySharePercent: number;
  topHirer: { name: string; slug: string; remote: number } | null;
  biggestKind: { label: string; sharePercent: number } | null;
  worldwideCompanies: number;
  salaries: { key: string; label: string; min: string; max: string }[];
  countries: { name: string; slug: string; total: number }[];
  newCompanies: { name: string; slug: string }[];
};

const number = new Intl.NumberFormat("en");
const and = new Intl.ListFormat("en", { type: "conjunction" });

/** Insight topics that have data, in rotation order. `pick` chooses within a topic (a salary, a country). */
function insightTopics(data: SocialData, pick: number, url: (path: string) => string): PlannedPost[] {
  const topics: PlannedPost[] = [];
  topics.push({
    kind: "insight:pay",
    segments: [
      `Only ${data.paySharePercent}% of remote tech job listings show the pay.\n\nSee what the ones that do pay: `,
      { link: url("/salaries") },
      "\n\n",
      { tag: "RemoteJobs" },
      " ",
      { tag: "PayTransparency" },
    ],
    image: {
      card: { type: "insight", label: "Pay transparency", number: `${data.paySharePercent}%`, caption: "of remote tech job listings show the pay" },
      alt: `${data.paySharePercent}% of remote tech job listings show the pay.`,
    },
  });
  const salary = data.salaries[pick % Math.max(data.salaries.length, 1)];
  if (salary) {
    topics.push({
      kind: `insight:salary:${salary.key}`,
      segments: [
        `Remote ${salary.label.toLowerCase()} roles that publish pay: the median range is ${salary.min}–${salary.max} a year.\n\n`,
        { link: url(`/salaries/${salary.key}`) },
        "\n\n",
        { tag: "RemoteJobs" },
        " ",
        { tag: "Salaries" },
      ],
      image: {
        card: { type: "insight", label: `Remote ${salary.label.toLowerCase()} salaries`, number: `${salary.min}–${salary.max}`, caption: "median range a year, from published pay" },
        alt: `Remote ${salary.label.toLowerCase()} salaries: median range ${salary.min} to ${salary.max} a year.`,
      },
    });
  }
  const country = data.countries[pick % Math.max(data.countries.length, 1)];
  if (country) {
    topics.push({
      kind: `insight:country:${country.slug}`,
      segments: [
        `${number.format(country.total)} remote tech roles are open to people living in ${country.name} right now.\n\n`,
        { link: url(`/remote/in/${country.slug}`) },
        "\n\n",
        { tag: "RemoteJobs" },
      ],
      image: {
        card: { type: "insight", label: `Living in ${country.name}?`, number: number.format(country.total), caption: `remote roles are open to you right now` },
        alt: `${number.format(country.total)} remote tech roles are open to people living in ${country.name}.`,
      },
    });
  }
  if (data.topHirer) {
    topics.push({
      kind: "insight:top-hirer",
      segments: [
        `${data.topHirer.name} has ${number.format(data.topHirer.remote)} open remote roles, more than any other company we track.\n\n`,
        { link: url(`/company-profiles/${data.topHirer.slug}`) },
        "\n\n",
        { tag: "RemoteJobs" },
        " ",
        { tag: "Hiring" },
      ],
      image: {
        card: { type: "insight", label: "Hiring the most right now", number: number.format(data.topHirer.remote), caption: `open remote roles at ${data.topHirer.name}` },
        alt: `${data.topHirer.name} has ${number.format(data.topHirer.remote)} open remote roles, the most of any company tracked.`,
      },
    });
  }
  if (data.biggestKind) {
    topics.push({
      kind: "insight:kind",
      segments: [
        `${data.biggestKind.sharePercent}% of open remote tech roles are in ${data.biggestKind.label.toLowerCase()}.\n\nThe full picture: `,
        { link: url("/insights") },
        "\n\n",
        { tag: "RemoteJobs" },
        " ",
        { tag: "TechJobs" },
      ],
      image: {
        card: { type: "insight", label: "What kind of work is remote", number: `${data.biggestKind.sharePercent}%`, caption: `of open remote roles are in ${data.biggestKind.label.toLowerCase()}` },
        alt: `${data.biggestKind.sharePercent}% of open remote tech roles are in ${data.biggestKind.label.toLowerCase()}.`,
      },
    });
  }
  topics.push({
    kind: "insight:worldwide",
    segments: [
      `${number.format(data.worldwideCompanies)} remote-friendly tech companies hire from anywhere in the world.\n\n`,
      { link: url("/remote/worldwide") },
      "\n\n",
      { tag: "RemoteJobs" },
      " ",
      { tag: "WorkFromAnywhere" },
    ],
    image: {
      card: { type: "insight", label: "Work from anywhere", number: number.format(data.worldwideCompanies), caption: "remote-friendly companies hire worldwide" },
      alt: `${number.format(data.worldwideCompanies)} remote-friendly tech companies hire worldwide.`,
    },
  });
  return topics;
}

/** The ISO week number of a date ("2026-11-18" → 47). */
export function isoWeek(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  const thursday = new Date(day.getTime() + (3 - ((day.getUTCDay() + 6) % 7)) * 86_400_000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/**
 * The extra posts for a day, on top of the daily new-roles post: Monday the
 * weekly report, Wednesday and Friday an insight card (topics rotate weekly),
 * Saturday the companies new to the list. Days without data post nothing.
 */
export function planExtraPosts(date: string, data: SocialData, url: (path: string) => string): PlannedPost[] {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const week = isoWeek(date);
  const yesterday = new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

  if (weekday === 1 && data.weekly && data.weekly.end === yesterday) {
    const report = data.weekly;
    const top = report.topCompanies.slice(0, 3);
    const build = (withTop: boolean): Segment[] => [
      `This week in remote hiring (${report.label}): ${number.format(report.opened)} roles opened and ${number.format(report.closed)} closed.`,
      withTop && top.length ? ` Most active: ${and.format(top.map((company) => `${company.name} (${company.count})`))}.` : "",
      "\n\nFull report: ",
      { link: url(`/weekly/${report.key}`) },
      "\n\n",
      { tag: "RemoteJobs" },
      " ",
      { tag: "HiringTrends" },
    ];
    // Long company names can push it past Bluesky's limit; the chart still names them.
    const segments = graphemes(richText(build(true)).text) <= BLUESKY_LIMIT ? build(true) : build(false);
    const stats: [string, string][] = [
      ["Opened", number.format(report.opened)],
      ["Closed", number.format(report.closed)],
      ["Open now", report.openAtEnd === null ? "–" : number.format(report.openAtEnd)],
    ];
    const bars = report.topCompanies.slice(0, 5).map((company) => ({ label: company.name, value: company.count }));
    return [
      {
        kind: "weekly",
        segments,
        image: {
          card: { type: "weekly", title: `Remote hiring, ${report.label}`, stats, bars },
          alt: `Remote hiring, ${report.label}: ${number.format(report.opened)} roles opened, ${number.format(report.closed)} closed${
            report.openAtEnd === null ? "" : `, ${number.format(report.openAtEnd)} open at the end of the week`
          }. Most roles opened: ${bars.map((bar) => `${bar.label} ${bar.value}`).join(", ")}.`,
        },
      },
    ];
  }

  if (weekday === 3 || weekday === 5) {
    const slot = weekday === 3 ? 0 : 1;
    const topics = insightTopics(data, week, url);
    return [topics[(week * 2 + slot) % topics.length]];
  }

  if (weekday === 6 && data.newCompanies.length > 0) {
    const named = data.newCompanies.slice(0, 4).map((company) => company.name);
    const more = data.newCompanies.length - named.length;
    return [
      {
        kind: "new-companies",
        segments: [
          `New on remotejobs this week: ${and.format(more > 0 ? [...named, `${more} more`] : named)}, ${
            data.newCompanies.length === 1 ? "a remote-friendly tech company" : "remote-friendly tech companies"
          } now on the list.\n\n`,
          { link: url("/new") },
          "\n\n",
          { tag: "RemoteJobs" },
        ],
      },
    ];
  }
  return [];
}

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import feedsFile from "@/data/company-feeds.json";
import { parseFeed } from "@/lib/feeds";
import { distinctiveName, isCompanyUrl, mentions, newsTags, type NewsTag } from "@/lib/news";

// "In the news" for a company: its own blog or newsroom feed (found by
// scripts/find-company-feeds.mts) and what Hacker News discussed about it.
// Only the headline, source, date and link are shown.

const FEEDS = (feedsFile as { feeds: Record<string, string> }).feeds;
const DAY_MS = 86_400_000;
const MAX_AGE_DAYS = 365;
const SHOWN = 8;
const HN_MIN_POINTS = 10;
const HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; RemoteJobs/1.0; +https://remotejobs.ghayasuddin.net)",
  accept: "application/rss+xml,application/atom+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
};

export type NewsItem = {
  title: string;
  url: string;
  date: string | null;
  source: "blog" | "hn";
  /** The site the headline is on ("stripe.com", "theverge.com"). */
  site: string;
  tags: NewsTag[];
  hn?: { points: number; comments: number; discussion: string };
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// "no-store" skips Next's fetch cache, which getCompanyNews already covers. That
// cache keeps reading a response to the end even after the timeout gives up on
// it, so one slow feed (hudl's trickles in over ~50 s) stalls the build.
async function fetchText(url: string) {
  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8_000), cache: "no-store" });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

async function blogNews(feedUrl: string, since: number): Promise<NewsItem[]> {
  const xml = await fetchText(feedUrl);
  return (xml ? (parseFeed(xml) ?? []) : [])
    .filter((item) => !item.date || Date.parse(item.date) >= since)
    .slice(0, 12)
    .map((item) => ({ title: item.title, url: item.url, date: item.date, source: "blog", site: host(item.url), tags: newsTags(item.title) }));
}

type Hit = { objectID: string; title: string | null; url: string | null; created_at: string; points: number | null; num_comments: number | null };

async function hackerNews(name: string, domain: string | null, since: number): Promise<NewsItem[]> {
  const filters = encodeURIComponent(`created_at_i>${Math.floor(since / 1000)},points>=${HN_MIN_POINTS}`);
  const search = (query: string, attribute: "url" | "title") =>
    `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&restrictSearchableAttributes=${attribute}&tags=story&hitsPerPage=40&numericFilters=${filters}`;
  const load = async (url: string) => {
    const body = await fetchText(url);
    try {
      return body ? ((JSON.parse(body) as { hits: Hit[] }).hits ?? []) : [];
    } catch {
      return [];
    }
  };
  const [byUrl, byTitle] = await Promise.all([
    domain ? load(search(domain, "url")) : Promise.resolve([] as Hit[]),
    distinctiveName(name) ? load(search(`"${name}"`, "title")) : Promise.resolve([] as Hit[]),
  ]);
  const hits = [
    ...byUrl.filter((hit) => hit.url && domain && isCompanyUrl(hit.url, domain)),
    ...byTitle.filter((hit) => hit.title && mentions(hit.title, name)),
  ];
  return hits
    .filter((hit) => hit.title)
    .map((hit) => {
      const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
      const url = hit.url ?? discussion;
      return {
        title: hit.title!,
        url,
        date: hit.created_at,
        source: "hn" as const,
        site: hit.url ? host(hit.url) : "news.ycombinator.com",
        tags: newsTags(hit.title!),
        hn: { points: hit.points ?? 0, comments: hit.num_comments ?? 0, discussion },
      };
    });
}

const sameStory = (url: string) => url.replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/^https?:\/\/(www\.)?/, "");

/** A company's latest news, newest first: its own posts and the Hacker News stories about it. */
export async function getCompanyNews(slug: string, name: string, domain: string | null): Promise<NewsItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("news", `news:${slug}`);

  const since = Date.now() - MAX_AGE_DAYS * DAY_MS;
  const [blog, hn] = await Promise.all([FEEDS[slug] ? blogNews(FEEDS[slug], since) : Promise.resolve([]), hackerNews(name, domain, since)]);
  // A blog post that was also discussed on Hacker News shows once, with the discussion.
  const byStory = new Map<string, NewsItem>();
  for (const item of [...blog, ...hn]) byStory.set(sameStory(item.url), { ...byStory.get(sameStory(item.url)), ...item });
  return [...byStory.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, SHOWN);
}

/** Whether a company has a feed of its own. */
export const hasCompanyFeed = (slug: string) => slug in FEEDS;

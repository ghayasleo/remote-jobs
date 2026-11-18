// Finds each company's own news feed (its blog, newsroom or press releases)
// and writes data/company-feeds.json, for "In the news" on company pages.
//
// For every company it reads the homepage's advertised feeds
// (<link rel="alternate" type="application/rss+xml">), then tries the usual
// addresses (/blog/feed, /rss.xml, ...), and keeps the first one that parses
// and has posted in the last two years. Comment feeds are skipped.
//
// Run with: npm run feeds:scan
// Try a few companies without writing anything: npm run feeds:scan -- --only slug-a,slug-b

import { writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parse as parseYaml } from "yaml";
import { parseFeed } from "../lib/feeds.ts";
import { readTar } from "../lib/data/tar.ts";

const TARBALL_URL = "https://codeload.github.com/remoteintech/remote-jobs/tar.gz/main";
const OUTPUT = new URL("../data/company-feeds.json", import.meta.url);
const CONCURRENCY = 16;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3_000_000;
const FRESH_MS = 2 * 365 * 86_400_000;
const HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; RemoteJobsFeedFinder/1.0)",
  accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,text/html;q=0.9,*/*;q=0.8",
};
// Pages that often advertise the feed when the homepage doesn't.
const NEWS_PAGES = ["/blog", "/news", "/newsroom"];
const COMMON_PATHS = [
  "/blog/feed", "/blog/rss.xml", "/blog/feed.xml", "/blog/feed.rss", "/blog/atom.xml", "/blog/rss", "/blog/index.xml",
  "/blog.rss", "/news/feed", "/news/rss.xml", "/newsroom/feed", "/press/feed", "/resources/feed",
  "/feed", "/rss.xml", "/feed.xml", "/atom.xml", "/rss", "/index.xml",
];

const only = (() => {
  const index = process.argv.indexOf("--only");
  return index > -1 ? new Set(process.argv[index + 1]?.split(",")) : null;
})();

type Company = { slug: string; website: string };

async function loadCompanies(): Promise<Company[]> {
  const response = await fetch(TARBALL_URL);
  if (!response.ok) throw new Error(`Downloading ${TARBALL_URL} failed: ${response.status}`);
  const companies: Company[] = [];
  readTar(gunzipSync(Buffer.from(await response.arrayBuffer())), (path, content) => {
    const slug = /^[^/]+\/src\/companies\/([^/]+)\.md$/.exec(path)?.[1];
    if (!slug || (only && !only.has(slug))) return;
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content.toString("utf8"));
    if (!match) return;
    try {
      const website = String((parseYaml(match[1]) ?? {}).website ?? "");
      if (/^https?:\/\//.test(website)) companies.push({ slug, website });
    } catch {
      // A profile whose front matter doesn't parse has no website to scan.
    }
  });
  return companies;
}

async function get(url: string): Promise<{ finalUrl: string; body: string } | null> {
  try {
    const response = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const body = await response.text();
    return body.length > MAX_BYTES ? null : { finalUrl: response.url || url, body };
  } catch {
    return null;
  }
}

/** Feeds a page advertises, blog and news ones first. */
function advertisedFeeds(html: string, base: string): string[] {
  const feeds: { url: string; score: number }[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/rel=["']?alternate/i.test(tag) || !/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    try {
      const url = new URL(href, base).toString();
      if (/comment/i.test(url) || /comment/i.test(tag)) continue;
      // Blog and news first; release notes, changelogs and podcasts aren't company news.
      const kind = url + tag;
      feeds.push({ url, score: /release|changelog|status|podcast|jobs|careers|docs/i.test(kind) ? 2 : /blog|news|press|engineering/i.test(kind) ? 0 : 1 });
    } catch {
      // An href that isn't a URL isn't a feed.
    }
  }
  return feeds.sort((a, b) => a.score - b.score).map((feed) => feed.url);
}

async function isLiveFeed(url: string) {
  const page = await get(url);
  const items = page ? parseFeed(page.body) : null;
  return Boolean(items?.some((item) => item.date && Date.now() - Date.parse(item.date) < FRESH_MS));
}

async function findFeed(company: Company): Promise<string | null> {
  const home = await get(company.website);
  const origin = home ? new URL(home.finalUrl).origin : new URL(company.website).origin;
  const advertised = home ? advertisedFeeds(home.body, home.finalUrl) : [];
  const tryAll = async (urls: string[]) => {
    for (const url of urls) if (await isLiveFeed(url)) return url;
    return null;
  };
  // The homepage's own blog or news feed, if it advertises one.
  const homeNews = advertised.filter((url) => /blog|news|press|engineering/i.test(url));
  const found = (await tryAll(homeNews)) ?? (await tryAll(await newsPageFeeds(origin)));
  // Then any other advertised feed and the usual addresses; release notes and changelogs only as a last resort.
  const notNews = (url: string) => /release|changelog|status|podcast/i.test(url);
  return (
    found ??
    (await tryAll([
      ...new Set([
        ...advertised.filter((url) => !notNews(url)),
        ...COMMON_PATHS.map((path) => `${origin}${path}`),
        ...advertised.filter(notNews),
      ]),
    ]))
  );
}

/** Feeds advertised on the company's blog or news page. */
async function newsPageFeeds(origin: string) {
  const feeds: string[] = [];
  for (const path of NEWS_PAGES) {
    const page = await get(`${origin}${path}`);
    if (page) feeds.push(...advertisedFeeds(page.body, page.finalUrl).filter((url) => !/release|changelog|podcast/i.test(url)));
  }
  return [...new Set(feeds)];
}

const companies = await loadCompanies();
console.log(`Scanning ${companies.length} companies…`);
const feeds: Record<string, string> = {};
let done = 0;
const queue = [...companies];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let company = queue.shift(); company; company = queue.shift()) {
      const feed = await findFeed(company);
      if (feed) feeds[company.slug] = feed;
      if (++done % 50 === 0) console.log(`  ${done}/${companies.length}, ${Object.keys(feeds).length} feeds`);
    }
  }),
);

const sorted = Object.fromEntries(Object.entries(feeds).sort(([a], [b]) => a.localeCompare(b)));
console.log(`Found ${Object.keys(sorted).length} feeds for ${companies.length} companies.`);
if (only) console.log(sorted);
else writeFileSync(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), feeds: sorted }, null, 2)}\n`);

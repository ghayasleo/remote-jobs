// A small RSS 2.0 writer for the job and company feeds.

export type FeedItem = {
  title: string;
  url: string;
  description: string;
  /** ISO timestamp. */
  date: string | null;
  categories?: string[];
};

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters XML 1.0 doesn't allow at all.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

export function rssFeed({
  title,
  description,
  siteUrl,
  feedUrl,
  items,
}: {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  items: FeedItem[];
}) {
  const latest = items.find((item) => item.date)?.date;
  const entries = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <description>${escapeXml(item.description)}</description>${item.date ? `
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>` : ""}${(item.categories ?? [])
        .map((category) => `
      <category>${escapeXml(category)}</category>`)
        .join("")}
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>${latest ? `
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ""}
${entries}
  </channel>
</rss>
`;
}

/** Feeds that read the request are cached at the edge per address: an hour fresh, a day stale. */
export const RSS_CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export const rssResponse = (xml: string) =>
  new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });

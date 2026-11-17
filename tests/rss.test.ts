import { describe, expect, it } from "vitest";
import { rssFeed } from "@/lib/rss";

describe("rssFeed", () => {
  const xml = rssFeed({
    title: "Jobs & more",
    description: "New <remote> roles",
    siteUrl: "https://example.com",
    feedUrl: "https://example.com/feeds/jobs.xml",
    items: [
      {
        title: `Engineer at "Acme" & Co`,
        url: "https://example.com/jobs/acme/1?a=1&b=2",
        description: "Remote \u0001 · <b>bold</b>",
        date: "2026-11-17T10:00:00.000Z",
        categories: ["Engineering"],
      },
      { title: "Undated", url: "https://example.com/x", description: "", date: null },
    ],
  });

  it("escapes text and URLs", () => {
    expect(xml).toContain("<title>Jobs &amp; more</title>");
    expect(xml).toContain("<title>Engineer at &quot;Acme&quot; &amp; Co</title>");
    expect(xml).toContain("<link>https://example.com/jobs/acme/1?a=1&amp;b=2</link>");
    expect(xml).toContain("<description>Remote  · &lt;b&gt;bold&lt;/b&gt;</description>");
  });

  it("dates items and the channel, and skips missing dates", () => {
    expect(xml).toContain("<pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate>");
    expect(xml).toContain("<lastBuildDate>Tue, 17 Nov 2026 10:00:00 GMT</lastBuildDate>");
    expect(xml.match(/<pubDate>/g)).toHaveLength(1);
    expect(xml).toContain("<category>Engineering</category>");
  });

  it("is well-formed enough to have one channel and two items", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.match(/<item>/g)).toHaveLength(2);
  });
});

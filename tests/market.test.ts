import { describe, expect, it } from "vitest";
import { parseFeed } from "@/lib/feeds";
import { marketFaqs } from "@/lib/market-faqs";
import { carryForward, momentum } from "@/lib/momentum";
import { distinctiveName, isCompanyUrl, mentions, newsTags } from "@/lib/news";
import { datesBetween } from "@/lib/weekly";

const DATES = datesBetween("2026-11-18", "2026-12-20");
const flat = (value: number) => DATES.map(() => value);
const ramp = (from: number, to: number) => DATES.map((_, i) => Math.round(from + ((to - from) * i) / (DATES.length - 1)));

describe("momentum", () => {
  it("waits for a week of history", () => {
    expect(momentum(DATES.slice(0, 5), flat(10).slice(0, 5))).toBeNull();
  });

  it("labels growth, slowdowns and steady hiring", () => {
    expect(momentum(DATES, ramp(10, 20))?.label).toBe("growing");
    expect(momentum(DATES, ramp(20, 10))?.label).toBe("slowing");
    expect(momentum(DATES, flat(12))?.label).toBe("steady");
    expect(momentum(DATES, ramp(10, 12))?.label).toBe("steady");
  });

  it("calls a company paused only after three quiet days", () => {
    const quiet = [...flat(8).slice(0, -3), null, 0, null];
    expect(momentum(DATES, quiet)).toMatchObject({ label: "paused", now: 0 });
    const blip = [...flat(8).slice(0, -1), null];
    expect(momentum(DATES, blip)?.label).toBe("steady");
  });

  it("spots a company that started hiring", () => {
    expect(momentum(DATES, [...flat(0).slice(0, 20), ...flat(5).slice(20)])?.label).toBe("started");
  });

  it("carries the last known count over missing days", () => {
    expect(carryForward([null, 3, null, 5])).toEqual([0, 3, 3, 5]);
  });
});

describe("news helpers", () => {
  it("tags headlines by topic", () => {
    expect(newsTags("Acme lays off 10% of staff")).toEqual(["layoffs"]);
    expect(newsTags("Acme raises $50M Series B")).toEqual(["funding"]);
    expect(newsTags("Acme acquires Beta")).toEqual(["acquisition"]);
    expect(newsTags("Acme ends remote work, orders return to office")).toEqual(["remote"]);
    expect(newsTags("We're hiring engineers")).toEqual(["hiring"]);
    expect(newsTags("Shipping a faster editor")).toEqual([]);
  });

  it("only searches headlines for distinctive names", () => {
    expect(distinctiveName("Coinbase")).toBe(true);
    expect(distinctiveName("GitLab")).toBe(true);
    expect(distinctiveName("Help Scout")).toBe(true);
    expect(distinctiveName("Stripe")).toBe(false);
    expect(distinctiveName("Buffer")).toBe(false);
  });

  it("matches the company as a whole word", () => {
    expect(mentions("GitLab 18.0 released", "GitLab")).toBe(true);
    expect(mentions("Using gitlabber tools", "GitLab")).toBe(false);
  });

  it("keeps only links on the company's own site", () => {
    expect(isCompanyUrl("https://stripe.com/blog/x", "stripe.com")).toBe(true);
    expect(isCompanyUrl("https://www.stripe.com/x", "stripe.com")).toBe(true);
    expect(isCompanyUrl("https://notstripe.com/x", "stripe.com")).toBe(false);
    // On code hosts, only the company's own subdomains count, not users' repos.
    expect(isCompanyUrl("https://about.gitlab.com/blog/x", "gitlab.com")).toBe(true);
    expect(isCompanyUrl("https://gitlab.com/someone/project", "gitlab.com")).toBe(false);
  });
});

describe("parseFeed", () => {
  it("reads RSS 2.0", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>
      <item><title>Older &amp; wiser</title><link>https://x.dev/a</link><pubDate>Mon, 10 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title><![CDATA[New <b>post</b>]]></title><link>https://x.dev/b</link><pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate></item>
    </channel></rss>`;
    expect(parseFeed(xml)).toEqual([
      { title: "New post", url: "https://x.dev/b", date: "2026-11-17T10:00:00.000Z" },
      { title: "Older & wiser", url: "https://x.dev/a", date: "2026-11-10T10:00:00.000Z" },
    ]);
  });

  it("reads Atom, taking the alternate link", () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Blog</title>
      <entry><title>Launch</title><link rel="self" href="https://x.dev/self"/><link rel="alternate" href="https://x.dev/launch"/><updated>2026-11-15T08:00:00Z</updated></entry>
    </feed>`;
    expect(parseFeed(xml)).toEqual([{ title: "Launch", url: "https://x.dev/launch", date: "2026-11-15T08:00:00.000Z" }]);
  });

  it("returns null for something that isn't a feed", () => {
    expect(parseFeed("<html><body>Not a feed</body></html>")).toBeNull();
  });
});

describe("marketFaqs", () => {
  it("answers whether hiring is growing, from the numbers", () => {
    const [first] = marketFaqs(
      { remoteRoles: 2700, hiringCompanies: 140, posted7: 300, opened7: null, closed7: null, hasTrends: false, counts: {}, postingMost: [], paused: [] },
      "Nov 18, 2026",
    );
    expect(first.answer).toBe("2,700 remote roles are open at 140 companies as of Nov 18, 2026. 300 were posted in the last 7 days.");
  });
});

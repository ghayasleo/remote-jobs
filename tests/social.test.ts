import { describe, expect, it } from "vitest";
import type { JobListing } from "@/lib/jobs";
import { HASHTAGS, blueskyLinkCard, blueskyPost, pickDailyRoles, readsInEnglish } from "@/lib/social";

const job = (id: string, company: string, postedAt: string | null, title = `Role ${id}`, companyName = company.toUpperCase()): JobListing => ({
  id,
  company,
  companyName,
  domain: null,
  title,
  location: "Remote",
  team: null,
  employmentType: null,
  salary: null,
  postedAt,
  category: "engineering",
});
const NOW = Date.parse("2026-11-17T09:00:00Z");
const JOBS = [
  job("1", "a", "2026-11-17T08:00:00Z", "Lead Engineer"),
  job("2", "a", "2026-11-17T07:00:00Z"),
  job("3", "b", "2026-11-16T10:00:00Z"),
  job("4", "c", "2026-11-15T10:00:00Z"),
];
const graphemes = (text: string) => [...new Intl.Segmenter().segment(text)].length;

describe("pickDailyRoles", () => {
  it("takes the last day's roles, one per company", () => {
    const { picked, total } = pickDailyRoles(JOBS, NOW);
    expect(picked.map((j) => j.id)).toEqual(["1", "3"]);
    expect(total).toBe(3);
  });
});

describe("blueskyPost", () => {
  it("lists one role per line under the count, with hashtags", () => {
    const { picked, total } = pickDailyRoles(JOBS, NOW);
    expect(blueskyPost(picked, total).text).toBe(
      "3 new remote tech roles today\n\n• Lead Engineer at A\n• Role 3 at B\n\n#RemoteJobs #TechJobs",
    );
  });

  it("leaves out titles that aren't in Latin script", () => {
    expect(readsInEnglish({ title: "Senior Engineer (Backend) – Café", companyName: "Acme" })).toBe(true);
    expect(readsInEnglish({ title: "HRシステムエンジニア（AI駆動開発）", companyName: "PayPay" })).toBe(false);
    const post = blueskyPost([job("1", "a", null, "HRシステムエンジニア"), job("2", "b", null, "Designer")], 2);
    expect(post.text).not.toContain("システム");
    expect(post.text).toContain("• Designer at B");
  });

  it("fits 300 graphemes and points each hashtag facet at its UTF-8 bytes", () => {
    const many = Array.from({ length: 30 }, (_, i) => job(String(i), `c${i}`, null, `Senior Platform Engineer ${i} — café`));
    const post = blueskyPost(many, 30);
    expect(graphemes(post.text)).toBeLessThanOrEqual(300);
    const bytes = new TextEncoder().encode(post.text);
    expect(post.facets.map(({ index }) => new TextDecoder().decode(bytes.slice(index.byteStart, index.byteEnd)))).toEqual(
      HASHTAGS.map((tag) => `#${tag}`),
    );
  });

  it("clips very long titles", () => {
    const long = "Principal Software Engineer, Distributed Systems and Infrastructure Reliability";
    expect(blueskyPost([job("1", "a", null, long)], 1).text).toContain("…");
  });
});

describe("blueskyLinkCard", () => {
  it("makes an external embed", () => {
    expect(blueskyLinkCard({ url: "https://x.dev/new", title: "New", description: "Fresh roles" })).toEqual({
      $type: "app.bsky.embed.external",
      external: { uri: "https://x.dev/new", title: "New", description: "Fresh roles" },
    });
  });
});

import { describe, expect, it } from "vitest";
import type { JobListing } from "@/lib/jobs";
import {
  HASHTAGS,
  blueskyLinkCard,
  blueskyPost,
  isoWeek,
  pickDailyRoles,
  planExtraPosts,
  readsInEnglish,
  richText,
  type SocialData,
} from "@/lib/social";

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


const url = (path: string) => `https://x.dev${path}`;
const DATA: SocialData = {
  weekly: {
    key: "2026-w47",
    start: "2026-11-16",
    end: "2026-11-22",
    label: "Nov 16 – 22, 2026",
    opened: 412,
    closed: 380,
    openAtEnd: 2790,
    topCompanies: [
      { name: "GitLab", count: 40 },
      { name: "Stripe", count: 25 },
      { name: "Kraken", count: 18 },
    ],
  },
  remoteRoles: 2700,
  companies: 876,
  paySharePercent: 12,
  topHirer: { name: "GitLab", slug: "gitlab", remote: 226 },
  biggestKind: { label: "Engineering", sharePercent: 32 },
  worldwideCompanies: 397,
  salaries: [{ key: "engineering", label: "Engineering", min: "$180K", max: "$280K" }],
  countries: [{ name: "Pakistan", slug: "pakistan", total: 135 }],
  newCompanies: [{ name: "Acme", slug: "acme" }],
};
const text = (post: { segments: Parameters<typeof richText>[0] }) => richText(post.segments).text;

describe("richText", () => {
  it("marks links and hashtags at their UTF-8 bytes", () => {
    const { text: body, facets } = richText(["Café → ", { link: "https://x.dev/new" }, " ", { tag: "RemoteJobs" }]);
    expect(body).toBe("Café → x.dev/new #RemoteJobs");
    const bytes = new TextEncoder().encode(body);
    const slice = (i: number) => new TextDecoder().decode(bytes.slice(facets[i].index.byteStart, facets[i].index.byteEnd));
    expect(slice(0)).toBe("x.dev/new");
    expect(facets[0].features[0].uri).toBe("https://x.dev/new");
    expect(slice(1)).toBe("#RemoteJobs");
  });
});

describe("planExtraPosts", () => {
  it("posts the weekly report on the Monday after the week", () => {
    const [post] = planExtraPosts("2026-11-23", DATA, url);
    expect(post.kind).toBe("weekly");
    expect(text(post)).toContain("412 roles opened and 380 closed");
    expect(text(post)).toContain("x.dev/weekly/2026-w47");
    expect(post.image?.alt).toContain("GitLab 40");
  });

  it("skips Monday when the latest report isn't last week's", () => {
    expect(planExtraPosts("2026-11-30", DATA, url)).toEqual([]);
  });

  it("rotates insight cards on Wednesday and Friday", () => {
    const wednesday = planExtraPosts("2026-11-25", DATA, url);
    const friday = planExtraPosts("2026-11-27", DATA, url);
    expect(wednesday).toHaveLength(1);
    expect(friday).toHaveLength(1);
    expect(wednesday[0].kind).not.toBe(friday[0].kind);
    expect(wednesday[0].image?.alt).toBeTruthy();
  });

  it("names the week's new companies on Saturday, and stays quiet otherwise", () => {
    expect(text(planExtraPosts("2026-11-28", DATA, url)[0])).toContain("New on RemoteJobs this week: Acme");
    expect(planExtraPosts("2026-11-28", { ...DATA, newCompanies: [] }, url)).toEqual([]);
    expect(planExtraPosts("2026-11-24", DATA, url)).toEqual([]);
  });

  it("keeps every post within 300 graphemes", () => {
    const days = ["2026-11-23", "2026-11-25", "2026-11-27", "2026-11-28", "2026-12-02", "2026-12-04", "2026-12-09"];
    for (const day of days) {
      for (const post of planExtraPosts(day, DATA, (path) => `https://remotejobs.ghayasuddin.net${path}`)) {
        expect([...new Intl.Segmenter().segment(text(post))].length).toBeLessThanOrEqual(300);
      }
    }
  });

  it("counts ISO weeks", () => {
    expect(isoWeek("2026-11-18")).toBe(47);
    expect(isoWeek("2027-01-01")).toBe(53);
  });
});

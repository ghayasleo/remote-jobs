import { describe, expect, it } from "vitest";
import type { JobListing } from "@/lib/jobs";
import { blueskyPost, pickDailyRoles } from "@/lib/social";

const job = (id: string, company: string, postedAt: string | null, title = `Role ${id}`): JobListing => ({
  id,
  company,
  companyName: company.toUpperCase(),
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

describe("pickDailyRoles", () => {
  it("takes the last day's roles, one per company", () => {
    const { picked, total } = pickDailyRoles(JOBS, NOW);
    expect(picked.map((j) => j.id)).toEqual(["1", "3"]);
    expect(total).toBe(3);
  });
});

describe("blueskyPost", () => {
  it("fits 300 graphemes and points the facet at the link's UTF-8 bytes", () => {
    const many = Array.from({ length: 30 }, (_, i) => job(String(i), `c${i}`, "2026-11-17T08:00:00Z", `Senior Platform Engineer ${i} — café`));
    const post = blueskyPost(many, 30, "https://remotejobs.example/new");
    expect([...new Intl.Segmenter().segment(post.text)].length).toBeLessThanOrEqual(300);
    const { byteStart, byteEnd } = post.facets[0].index;
    const bytes = new TextEncoder().encode(post.text);
    expect(new TextDecoder().decode(bytes.slice(byteStart, byteEnd))).toBe("remotejobs.example/new");
  });
});

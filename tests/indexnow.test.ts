import { describe, expect, it } from "vitest";
import { indexNowPaths } from "@/lib/indexnow";

const NOW = Date.parse("2026-11-18T07:00:00Z");

describe("indexNowPaths", () => {
  it("submits the live pages plus roles and companies from the last two days", () => {
    const paths = indexNowPaths({
      now: NOW,
      jobs: [
        { company: "acme", id: "1", title: "Staff Engineer", postedAt: "2026-11-17T12:00:00Z" },
        { company: "acme", id: "2", title: "Old Role", postedAt: "2026-11-01T12:00:00Z" },
        { company: "acme", id: "3", title: "No Date", postedAt: null },
      ],
      companies: [
        { slug: "new-co", addedAt: "2026-11-17" },
        { slug: "old-co", addedAt: "2025-01-01" },
      ],
    });
    expect(paths).toEqual(["/", "/jobs", "/new", "/insights", "/company-profiles/new-co", "/jobs/acme/1/staff-engineer"]);
  });
});

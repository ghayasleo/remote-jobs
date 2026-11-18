import { describe, expect, it } from "vitest";
import { countryBySlug, countryFaqs, countryRoles, countrySlug, hasCountryPage } from "@/lib/countries";

const job = (company: string, location: string) => ({ company, location });
const regions: Record<string, string> = { everywhere: "worldwide", usco: "americas" };
const region = (slug: string) => regions[slug];

describe("country slugs", () => {
  it("makes readable slugs and finds countries by them", () => {
    expect(countrySlug("United Arab Emirates")).toBe("united-arab-emirates");
    expect(countryBySlug("pakistan")?.region).toBe("asia-pacific");
    expect(countryBySlug("atlantis")).toBeNull();
  });
});

describe("countryRoles", () => {
  const germany = countryBySlug("germany")!;
  const jobs = [
    job("a", "Remote - Germany"),
    job("b", "Remote, Poland"),
    job("c", "EMEA"),
    job("d", "Anywhere"),
    job("everywhere", "Remote"),
    job("usco", "Remote"),
    job("e", "Remote - US"),
  ];

  it("sorts roles into named, regional and worldwide", () => {
    const roles = countryRoles(jobs, germany, region);
    expect(roles.named.map((r) => r.company)).toEqual(["a"]);
    expect(roles.regional.map((r) => r.company)).toEqual(["c"]);
    expect(roles.worldwide.map((r) => r.company)).toEqual(["d", "everywhere"]);
  });

  it("needs enough roles of its own for a page", () => {
    expect(hasCountryPage(countryRoles(jobs, germany, region))).toBe(false);
    expect(hasCountryPage(countryRoles(Array(5).fill(job("x", "EMEA")), germany, region))).toBe(true);
  });
});

describe("countryFaqs", () => {
  it("answers how many roles are open, from the numbers", () => {
    const [first] = countryFaqs({
      country: countryBySlug("pakistan")!,
      counts: { named: 4, regional: 11, worldwide: 120, total: 135 },
      companyCount: 60,
      topCompanies: [],
      categories: [],
      asOf: "Nov 18, 2026",
    });
    expect(first.question).toBe("How many remote jobs can I apply to from Pakistan?");
    expect(first.answer).toBe(
      "135 remote roles at 60 companies, as of Nov 18, 2026: 4 name Pakistan, 11 are open across Asia Pacific, and 120 are open worldwide.",
    );
  });
});

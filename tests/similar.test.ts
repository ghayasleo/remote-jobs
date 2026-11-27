import { describe, expect, it } from "vitest";
import type { ExploreCompany } from "@/lib/explore";
import { roleWords, similarCompanies, similarRoles } from "@/lib/similar";

const company = (slug: string, technologies: string[], region = "europe", remotePolicy = "fully-remote"): ExploreCompany => ({
  slug,
  name: slug.toUpperCase(),
  domain: null,
  region,
  remotePolicy,
  companySize: "small",
  technologies,
  addedAt: null,
  blurb: "",
  keywords: "",
});

describe("similarCompanies", () => {
  const me = company("me", ["python", "go"]);
  const all = [
    me,
    company("both", ["python", "go"], "americas"),
    company("one", ["python"]),
    company("place", ["rust"]),
    company("none", ["rust"], "asia-pacific"),
  ];

  it("ranks shared stack first, then region and policy, and leaves out unrelated ones", () => {
    expect(similarCompanies(me, all, {}).map((c) => c.slug)).toEqual(["both", "one", "place"]);
  });

  it("lets companies hiring now break ties", () => {
    const twins = [me, company("a", ["python"]), company("b", ["python"])];
    expect(similarCompanies(me, twins, { b: { total: 3, remote: 2 } }).map((c) => c.slug)).toEqual(["b", "a"]);
  });
});

describe("similarRoles", () => {
  const role = (company: string, title: string, category = "engineering", postedAt = "2026-11-20") => ({
    company,
    id: `${company}-${title}`,
    title,
    category,
    postedAt,
  });
  const me = role("acme", "Senior Backend Engineer (Go)");

  it("finds roles with the same work at other companies, best match first", () => {
    const roles = [
      role("acme", "Backend Engineer, Go"),
      role("beta", "Staff Backend Engineer"),
      role("gamma", "Backend Engineer - Go Platform"),
      role("delta", "Frontend Engineer"),
      role("eps", "Backend Engineer", "data"),
    ];
    expect(similarRoles(me, roles).map((r) => r.company)).toEqual(["gamma", "beta"]);
  });

  it("shows at most one role per company and skips weak matches", () => {
    const roles = [role("beta", "Backend Engineer"), role("beta", "Backend Engineer, Payments"), role("zeta", "Sales Engineer", "sales")];
    expect(similarRoles(me, roles)).toHaveLength(1);
  });

  it("ignores seniority words when matching", () => {
    expect(roleWords("Senior Staff Backend Engineer II")).toEqual(new Set(["backend", "engineer"]));
  });
});

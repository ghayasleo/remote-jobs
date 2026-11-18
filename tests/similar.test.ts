import { describe, expect, it } from "vitest";
import type { ExploreCompany } from "@/lib/explore";
import { similarCompanies } from "@/lib/similar";

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

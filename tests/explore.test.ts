import { describe, expect, it } from "vitest";
import type { CompanyListItem } from "@/lib/data/parse";
import {
  DEFAULT_PARAMS,
  activeFilterCount,
  filterCompanies,
  newSinceDate,
  parseParams,
  serializeParams,
  type ExploreParams,
} from "@/lib/explore";

const company = (overrides: Partial<CompanyListItem>): CompanyListItem => ({
  slug: "x",
  name: "X",
  website: "https://x.dev",
  domain: "x.dev",
  careersUrl: null,
  region: "worldwide",
  remotePolicy: "fully-remote",
  companySize: "small",
  technologies: [],
  addedAt: "2020-01-01",
  updatedAt: null,
  blurb: "",
  keywords: "",
  ...overrides,
});

const COMPANIES = [
  company({ slug: "acme", name: "Acme", region: "europe", technologies: ["python"], keywords: "data" }),
  company({ slug: "globex", name: "Globex", region: "worldwide", remotePolicy: "remote-first", keywords: "react" }),
  company({ slug: "initech", name: "Initech", region: "americas", companySize: "large", addedAt: "2026-06-01", keywords: "" }),
  company({ slug: "umbrella", name: "Umbrella", region: "americas-europe", technologies: ["go", "rust"], blurb: "Partner of Acme" }),
  company({ slug: "hooli", name: "Hooli", region: "other", remotePolicy: "hybrid", keywords: "" }),
];
const HIRING = { globex: { total: 3, remote: 0 }, umbrella: { total: 10, remote: 4 } };
const NEW_SINCE = "2025-11-17";

const run = (params: Partial<ExploreParams>) =>
  filterCompanies(COMPANIES, { ...DEFAULT_PARAMS, ...params }, HIRING, NEW_SINCE).map((c) => c.slug);

describe("filterCompanies", () => {
  it("recommends hiring companies first (most remote roles), then A–Z", () => {
    expect(run({})).toEqual(["umbrella", "globex", "acme", "hooli", "initech"]);
  });

  it("region means where you're based: wider-hiring companies count", () => {
    expect(run({ region: ["europe"], sort: "name" })).toEqual(["acme", "globex", "umbrella"]);
    expect(run({ region: ["worldwide"] })).toEqual(["globex"]);
    expect(run({ region: ["americas", "europe"], sort: "name" })).toEqual(["acme", "globex", "initech", "umbrella"]);
  });

  it("matches any chosen stack and policy", () => {
    expect(run({ stack: ["python", "rust"], sort: "name" })).toEqual(["acme", "umbrella"]);
    expect(run({ policy: ["hybrid", "remote-first"], sort: "name" })).toEqual(["globex", "hooli"]);
  });

  it("filters to hiring now and recently added", () => {
    expect(run({ hiring: true, sort: "name" })).toEqual(["globex", "umbrella"]);
    expect(run({ recent: true })).toEqual(["initech"]);
  });

  it("search needs every word and ranks name matches first", () => {
    expect(run({ q: "acme" })).toEqual(["acme", "umbrella"]); // umbrella only mentions acme
    expect(run({ q: "umbrella go" })).toEqual(["umbrella"]); // Go is in its stack
    expect(run({ q: "umbrella python" })).toEqual([]);
    expect(run({ q: "ACME python" })).toEqual(["acme"]);
  });

  it("sorts by newest and by most open roles", () => {
    expect(run({ sort: "newest" })[0]).toBe("initech");
    expect(run({ sort: "roles" }).slice(0, 2)).toEqual(["umbrella", "globex"]);
  });
});

describe("URL params", () => {
  it("round-trips non-default values in a canonical order", () => {
    const params = parseParams("?stack=rust,python&region=europe&hiring=true&sort=newest&q=data");
    expect(params).toEqual({
      ...DEFAULT_PARAMS,
      q: "data",
      region: ["europe"],
      stack: ["python", "rust"],
      hiring: true,
      sort: "newest",
    });
    expect(serializeParams(params)).toBe("?q=data&region=europe&stack=python,rust&hiring=true&sort=newest");
  });

  it("drops unknown values and defaults", () => {
    expect(parseParams("?region=mars,europe&policy=nope&sort=chaos&hiring=yes")).toEqual({
      ...DEFAULT_PARAMS,
      region: ["europe"],
    });
    expect(serializeParams(DEFAULT_PARAMS)).toBe("");
  });

  it("counts active filters", () => {
    expect(activeFilterCount({ ...DEFAULT_PARAMS, region: ["europe"], stack: ["go", "rust"], hiring: true })).toBe(4);
  });
});

describe("newSinceDate", () => {
  it("is a year before the given time", () => {
    expect(newSinceDate(Date.parse("2026-11-17T12:00:00Z"))).toBe("2025-11-17");
  });
});

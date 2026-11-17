import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_PARAMS,
  filterJobs,
  isPlaceholderRole,
  jobCategory,
  jobPath,
  locationCountries,
  parseJobParams,
  schemaEmploymentType,
  serializeJobParams,
  type JobListing,
} from "@/lib/jobs";

describe("jobCategory", () => {
  it.each([
    ["Senior Backend Engineer", null, "engineering"],
    ["Machine Learning Engineer", null, "data"],
    ["Product Designer", null, "design"],
    ["Senior Product Manager", null, "product"],
    ["Account Executive, Mid-Market", null, "sales"],
    ["Customer Success Manager", null, "support"],
    ["Customer Success Architect - West", null, "support"],
    ["Solutions Architect - Federal", null, "support"],
    ["Technical Recruiter", null, "operations"],
    ["Growth Marketing Lead", null, "marketing"],
    ["Chief of Staff", null, "other"],
    ["Staff, Platform", "Engineering", "engineering"],
  ])("%s → %s", (title, team, category) => {
    expect(jobCategory(title, team)).toBe(category);
  });
});

const job = (overrides: Partial<JobListing>): JobListing => ({
  id: "1",
  company: "acme",
  companyName: "Acme",
  domain: "acme.dev",
  title: "Engineer",
  location: "Remote",
  team: null,
  employmentType: null,
  salary: null,
  postedAt: "2026-11-10T00:00:00.000Z",
  category: "engineering",
  ...overrides,
});

const JOBS = [
  job({ id: "1", title: "Backend Engineer", postedAt: "2026-11-16T12:00:00.000Z" }),
  job({ id: "2", company: "zeta", companyName: "Zeta", title: "Product Designer", category: "design", location: "Remote - Europe" }),
  job({ id: "3", company: "beta", companyName: "Beta", title: "Data Scientist", category: "data", postedAt: null }),
];
const NOW = Date.parse("2026-11-17T12:00:00Z");

describe("filterJobs", () => {
  it("sorts newest first, undated last", () => {
    expect(filterJobs(JOBS, DEFAULT_JOB_PARAMS, NOW).map((j) => j.id)).toEqual(["1", "2", "3"]);
  });

  it("filters by words, category and posting date", () => {
    expect(filterJobs(JOBS, { ...DEFAULT_JOB_PARAMS, q: "europe design" }, NOW).map((j) => j.id)).toEqual(["2"]);
    expect(filterJobs(JOBS, { ...DEFAULT_JOB_PARAMS, category: ["data", "design"] }, NOW).map((j) => j.id)).toEqual(["2", "3"]);
    expect(filterJobs(JOBS, { ...DEFAULT_JOB_PARAMS, posted: "1d" }, NOW).map((j) => j.id)).toEqual(["1"]);
  });

  it("sorts by company", () => {
    expect(filterJobs(JOBS, { ...DEFAULT_JOB_PARAMS, sort: "company" }, NOW).map((j) => j.companyName)).toEqual(["Acme", "Beta", "Zeta"]);
  });
});

describe("job params", () => {
  it("round-trips and drops junk", () => {
    const params = parseJobParams("?category=design,nope,data&posted=7d&sort=company&q=go");
    expect(params).toEqual({ q: "go", category: ["data", "design"], posted: "7d", sort: "company" });
    expect(serializeJobParams(params)).toBe("?q=go&category=data,design&posted=7d&sort=company");
    expect(parseJobParams("?posted=forever&sort=random")).toEqual(DEFAULT_JOB_PARAMS);
  });
});

describe("isPlaceholderRole", () => {
  it.each([
    "Don’t see what you’re looking for?",
    "Talent Community - General Application",
    "Growth Marketing Manager, Cloud Native (Talent Pool)",
    "Account Executive (SMB) - EMEA - Future opportunities",
    "Join Netguru - open application",
  ])("%s is a placeholder", (title) => {
    expect(isPlaceholderRole(title)).toBe(true);
  });

  it.each(["Senior Backend Engineer", "Head of Talent", "Community Manager", "Talent Acquisition Partner"])(
    "%s is a real role",
    (title) => {
      expect(isPlaceholderRole(title)).toBe(false);
    },
  );
});

describe("Google Jobs helpers", () => {
  it("builds role paths", () => {
    expect(jobPath({ company: "gitlab", id: "8801094002" })).toBe("/jobs/gitlab/8801094002");
  });

  it("maps employment types", () => {
    expect(schemaEmploymentType("Full-time")).toBe("FULL_TIME");
    expect(schemaEmploymentType("Contract")).toBe("CONTRACTOR");
    expect(schemaEmploymentType("Seasonal")).toBeUndefined();
  });

  it("finds countries in location text", () => {
    expect(locationCountries("Remote - US or Canada")).toEqual(["United States", "Canada"]);
    expect(locationCountries("Remote (UK)")).toEqual(["United Kingdom"]);
    expect(locationCountries("Remote, EMEA")).toEqual([]);
    expect(locationCountries("Australia / New Zealand")).toEqual(["Australia", "New Zealand"]);
  });
});

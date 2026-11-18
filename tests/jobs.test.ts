import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_PARAMS,
  activeJobFilterCount,
  applicantCountries,
  filterJobs,
  isPlaceholderRole,
  jobCategory,
  jobPath,
  jobRegions,
  jobSlug,
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

  it("filters by where the role can be done from; anywhere counts for every region", () => {
    const jobs = [
      job({ id: "us", location: "Remote - US" }),
      job({ id: "eu", location: "Remote, Germany" }),
      job({ id: "any", location: "Remote (Anywhere)" }),
      job({ id: "vague", location: "Remote" }),
    ];
    expect(filterJobs(jobs, { ...DEFAULT_JOB_PARAMS, where: ["europe"] }, NOW).map((j) => j.id).sort()).toEqual(["any", "eu"]);
    expect(filterJobs(jobs, { ...DEFAULT_JOB_PARAMS, where: ["anywhere"] }, NOW).map((j) => j.id)).toEqual(["any"]);
  });

  it("filters by pay and the company's policy, size and stack", () => {
    const jobs = [
      job({ id: "a", salary: "$120K – $150K", companyPolicy: "fully-remote", companySize: "small", companyStack: ["go"] }),
      job({ id: "b", companyPolicy: "hybrid", companySize: "large", companyStack: ["python", "react"] }),
      job({ id: "old", companyPolicy: undefined, companySize: undefined, companyStack: undefined }),
    ];
    const ids = (params: Partial<typeof DEFAULT_JOB_PARAMS>) =>
      filterJobs(jobs, { ...DEFAULT_JOB_PARAMS, ...params }, NOW).map((j) => j.id).sort();
    expect(ids({ pay: true })).toEqual(["a"]);
    expect(ids({ policy: ["fully-remote"] })).toEqual(["a"]);
    expect(ids({ size: ["large", "small"] })).toEqual(["a", "b"]);
    expect(ids({ stack: ["python"] })).toEqual(["b"]);
  });

  it("sorts by company", () => {
    expect(filterJobs(JOBS, { ...DEFAULT_JOB_PARAMS, sort: "company" }, NOW).map((j) => j.companyName)).toEqual(["Acme", "Beta", "Zeta"]);
  });
});

describe("job params", () => {
  it("round-trips and drops junk", () => {
    const params = parseJobParams("?category=design,nope,data&posted=7d&sort=company&q=go");
    expect(params).toEqual({ ...DEFAULT_JOB_PARAMS, q: "go", category: ["data", "design"], posted: "7d", sort: "company" });
    expect(serializeJobParams(params)).toBe("?q=go&category=data,design&posted=7d&sort=company");
    expect(parseJobParams("?posted=forever&sort=random&pay=yes&where=mars")).toEqual(DEFAULT_JOB_PARAMS);
  });

  it("keeps the location, pay and company filters", () => {
    const query = "?where=europe,anywhere&pay=true&policy=fully-remote&size=small&stack=go,python";
    const params = parseJobParams(query);
    expect(params).toMatchObject({
      where: ["anywhere", "europe"],
      pay: true,
      policy: ["fully-remote"],
      size: ["small"],
      stack: ["python", "go"],
    });
    expect(activeJobFilterCount(params)).toBe(7);
    expect(serializeJobParams(params)).toBe("?where=anywhere,europe&pay=true&policy=fully-remote&size=small&stack=python,go");
  });
});

describe("jobRegions", () => {
  it.each([
    ["Remote - USA", ["us-canada"]],
    ["Foster City, CA", ["us-canada"]],
    ["Remote-United-States", ["us-canada"]],
    ["Remote, Canada; Remote, Poland; Remote, United Kingdom", ["us-canada", "europe"]],
    ["Americas Remote", ["us-canada", "latin-america"]],
    ["Remote, Brazil", ["latin-america"]],
    ["Remote, BR", ["latin-america"]],
    ["EMEA Remote", ["europe", "middle-east-africa"]],
    ["Germany (Remote)", ["europe"]],
    ["Remote - India", ["asia-pacific"]],
    ["Sydney, Australia", ["asia-pacific"]],
    ["Remote (Anywhere)", ["anywhere"]],
    ["Anywhere in the US", ["us-canada"]],
    ["Remote - Latin America", ["latin-america"]],
    ["Remote", []],
    ["Ukraine", ["europe"]],
  ])("%s", (location, regions) => {
    expect(jobRegions(location)).toEqual(regions);
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
  it("builds role paths with a readable slug", () => {
    expect(jobPath({ company: "gitlab", id: "8801094002", title: "Senior Backend Engineer, Plan" })).toBe(
      "/jobs/gitlab/8801094002/senior-backend-engineer-plan",
    );
  });

  it.each([
    ["Senior Software Engineer (Remote - US)", "senior-software-engineer-remote-us"],
    ["Data & AI Lead", "data-and-ai-lead"],
    ["Développeur·se Full-Stack Sénior", "developpeur-se-full-stack-senior"],
    ["  --C++ / Rust Engineer--  ", "c-rust-engineer"],
    ["ソフトウェアエンジニア", "role"],
  ])("slugs %s", (title, slug) => {
    expect(jobSlug(title)).toBe(slug);
  });

  it("cuts long slugs at a word boundary", () => {
    const slug = jobSlug(
      "Staff Software Engineer, Distributed Systems and Infrastructure Reliability for Enterprise Customers in North America",
    );
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toBe("staff-software-engineer-distributed-systems-and-infrastructure-reliability-for");
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
    expect(locationCountries("Remote - Latin America")).toEqual([]);
    expect(locationCountries("Sydney, New South Wales")).toEqual([]);
    expect(locationCountries("New Mexico")).toEqual(["United States"]);
  });

  it("finds countries in US and Canadian places", () => {
    expect(locationCountries("Foster City, CA")).toEqual(["United States"]);
    expect(locationCountries("Remote - EST")).toEqual(["United States"]);
    expect(locationCountries("Toronto, ON")).toEqual(["Canada"]);
    expect(locationCountries("Remote, BR")).toEqual(["Brazil"]);
    expect(locationCountries("Remote - North America")).toEqual([]);
  });

  it("expands regions into the countries Google Jobs needs", () => {
    expect(applicantCountries("Remote (UK)")).toEqual(["United Kingdom"]);
    expect(applicantCountries("Remote - North America")).toEqual(["United States", "Canada"]);
    const emea = applicantCountries("EMEA Remote");
    expect(emea).toContain("Germany");
    expect(emea).toContain("South Africa");
    expect(emea).not.toContain("India");
    const latam = applicantCountries("Remote - Latin America");
    expect(latam).toContain("Brazil");
    expect(latam).not.toContain("United States");
    expect(applicantCountries("APAC")).toContain("Japan");
  });

  it("has no countries for worldwide roles", () => {
    expect(applicantCountries("Remote")).toEqual([]);
    expect(applicantCountries("Anywhere")).toEqual([]);
    expect(applicantCountries("Worldwide")).toEqual([]);
  });
});

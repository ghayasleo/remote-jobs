import { describe, expect, it } from "vitest";
import type { ExploreCompany } from "@/lib/explore";
import type { JobListing } from "@/lib/jobs";
import {
  companyDetails,
  findCompany,
  htmlToText,
  marketOverview,
  resolveCountry,
  salaryInsights,
  searchCompanies,
  searchJobs,
  type ExploreFile,
  type InsightsFile,
} from "@/lib/mcp/tools";

const url = (path: string) => new URL(path, "https://example.test").toString();
const NOW = Date.parse("2026-11-22T12:00:00Z");

const company = (overrides: Partial<ExploreCompany>): ExploreCompany => ({
  slug: "x",
  name: "X",
  domain: "x.dev",
  region: "worldwide",
  remotePolicy: "fully-remote",
  companySize: "small",
  technologies: [],
  addedAt: "2020-01-01",
  blurb: "",
  keywords: "",
  ...overrides,
});

const EXPLORE: ExploreFile = {
  companies: [
    company({ slug: "acme", name: "Acme", domain: "acme.io", region: "europe", technologies: ["python"], blurb: "Data tools" }),
    company({ slug: "globex", name: "Globex Corporation", domain: "globex.com", technologies: ["react", "nodejs"] }),
    company({ slug: "initech", name: "Initech", region: "americas", remotePolicy: "hybrid", companySize: "large" }),
  ],
  hiring: { globex: { total: 5, remote: 3 } },
  newSince: "2025-11-22",
  updatedAt: "2026-11-22T11:00:00.000Z",
};

const job = (overrides: Partial<JobListing>): JobListing => ({
  id: "1",
  company: "globex",
  companyName: "Globex Corporation",
  domain: "globex.com",
  title: "Senior Backend Engineer",
  location: "Remote",
  team: null,
  employmentType: "Full-time",
  salary: null,
  postedAt: "2026-11-20T00:00:00.000Z",
  category: "engineering",
  companyPolicy: "fully-remote",
  companyRegion: "worldwide",
  companySize: "small",
  companyStack: ["react", "nodejs"],
  ...overrides,
});

const JOBS = [
  job({ id: "1", title: "Senior Backend Engineer", location: "Remote - Europe", salary: "$150K – $190K" }),
  job({ id: "2", title: "Product Designer", category: "design", location: "Remote, US", postedAt: "2026-10-01T00:00:00.000Z" }),
  job({ id: "3", company: "acme", companyName: "Acme", title: "Data Engineer", category: "data", location: "Germany", salary: "€80K" }),
];

describe("searchCompanies", () => {
  it("filters like Explore and pages the results", () => {
    const result = searchCompanies(EXPLORE, { hiring_now: true }, url);
    expect(result.total).toBe(1);
    expect(result.companies[0]).toMatchObject({
      name: "Globex Corporation",
      url: "https://example.test/company-profiles/globex",
      stack: ["React", "Node.js"],
      open_roles: { total: 5, remote: 3 },
      hires_in: "Worldwide",
      size: "11–50 people",
    });
    expect(result.browse_url).toBe("https://example.test/?hiring=true");

    const paged = searchCompanies(EXPLORE, { sort: "name", limit: 1, offset: 1 }, url);
    expect(paged.total).toBe(3);
    expect(paged.companies.map((match) => match.slug)).toEqual(["globex"]);
  });

  it("matches words in the description and stack", () => {
    expect(searchCompanies(EXPLORE, { query: "data" }, url).companies.map((match) => match.slug)).toEqual(["acme"]);
    expect(searchCompanies(EXPLORE, { stack: ["react"] }, url).companies.map((match) => match.slug)).toEqual(["globex"]);
  });
});

describe("findCompany", () => {
  it.each([
    ["globex", "globex"],
    ["Globex Corporation", "globex"],
    ["https://www.acme.io/careers", "acme"],
    ["  INITECH ", "initech"],
    ["Glob", "globex"],
  ])("%s → %s", (text, slug) => {
    expect(findCompany(EXPLORE.companies, text)?.slug).toBe(slug);
  });

  it("returns null when nothing is close", () => {
    expect(findCompany(EXPLORE.companies, "Umbrella")).toBeNull();
    expect(findCompany(EXPLORE.companies, " ")).toBeNull();
  });
});

describe("companyDetails", () => {
  it("adds the profile sections and the company's remote roles", () => {
    const details = companyDetails(
      {
        name: "Globex Corporation",
        slug: "globex",
        website: "https://globex.com",
        careersUrl: "https://globex.com/jobs",
        updatedAt: "2026-01-01",
        sections: [
          { id: "blurb", title: "Company blurb", markdown: "Globex makes things." },
          { id: "howToApply", title: "How to apply", markdown: "Apply on our site." },
          { id: "officeLocations", title: "Office locations", markdown: "  " },
        ],
      },
      EXPLORE.companies[1],
      EXPLORE.hiring,
      JOBS,
      url,
    );
    expect(details.profile).toEqual([{ title: "How to apply", text: "Apply on our site." }]);
    expect(details.remote_roles_total).toBe(2);
    expect(details.remote_roles[0].url).toBe("https://example.test/jobs/globex/1/senior-backend-engineer");
    expect(details.careers_url).toBe("https://globex.com/jobs");
  });

  it("still answers when the full profile can't be read", () => {
    const details = companyDetails(null, EXPLORE.companies[0], EXPLORE.hiring, JOBS, url);
    expect(details).toMatchObject({ name: "Acme", website: null, profile: [], remote_roles_total: 1 });
  });
});

describe("searchJobs", () => {
  it("filters like the Jobs page and links each role", () => {
    const result = searchJobs(JOBS, { category: ["design"] }, NOW, url);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.total).toBe(1);
    expect(result.jobs[0]).toMatchObject({ title: "Product Designer", kind: "Design", company_slug: "globex", id: "2" });
    expect(result.browse_url).toBe("https://example.test/jobs?category=design");
  });

  it("takes a country by name and rejects one it doesn't know", () => {
    const germany = searchJobs(JOBS, { country: "Germany" }, NOW, url);
    if ("error" in germany) throw new Error(germany.error);
    expect(germany.jobs.map((match) => match.id).sort()).toEqual(["1", "3"]);
    expect(searchJobs(JOBS, { country: "Atlantis" }, NOW, url)).toHaveProperty("error");
  });

  it("filters by posting date and published pay", () => {
    const recent = searchJobs(JOBS, { posted_within: "7d", with_salary: true }, NOW, url);
    if ("error" in recent) throw new Error(recent.error);
    expect(recent.jobs.map((match) => match.id).sort()).toEqual(["1", "3"]);
  });
});

describe("resolveCountry", () => {
  it("accepts English names and slugs", () => {
    expect(resolveCountry("United Kingdom")).toBe("united-kingdom");
    expect(resolveCountry("pakistan")).toBe("pakistan");
    expect(resolveCountry(undefined)).toBe("");
    expect(resolveCountry("Narnia")).toBeNull();
  });
});

describe("htmlToText", () => {
  it("keeps paragraphs and list items and decodes entities", () => {
    const html =
      "<h2>About</h2><p>We&rsquo;re hiring &amp; growing.</p><script>alert(1)</script><ul><li>Go</li><li>Rust &#x2014; nice</li></ul><p>Pay:&nbsp;$100K</p>";
    expect(htmlToText(html)).toBe("About\n\nWe’re hiring & growing.\n\n- Go\n- Rust — nice\n\nPay: $100K");
  });
});

describe("salaryInsights", () => {
  const paid = Array.from({ length: 6 }, (_, index) =>
    job({ id: `p${index}`, title: `Engineer ${index}`, salary: `$${100 + index * 10}K – $${150 + index * 10}K` }),
  );

  it("summarises annual US-dollar ranges", () => {
    const result = salaryInsights([...paid, ...JOBS], {}, url);
    if (!("overall" in result)) throw new Error(result.note);
    expect(result.roles_with_usd_range).toBe(7);
    expect(result.overall.roles).toBe(7);
    expect(result.best_paid[0]).toMatchObject({ title: "Engineer 5", range: { min: 150_000, max: 200_000 } });
    expect(result.best_paid.map((role) => role.title)).toContain("Senior Backend Engineer");
    expect(result.page_url).toBe("https://example.test/salaries");
  });

  it("says when there are too few ranges", () => {
    const result = salaryInsights(JOBS, { category: "design" }, url);
    if ("overall" in result) throw new Error("expected too few ranges");
    expect(result.note).toMatch(/too few/);
    expect(result.page_url).toBe("https://example.test/salaries/design");
  });
});

describe("marketOverview", () => {
  it("adds recent posting counts to the insights numbers", () => {
    const insights = {
      companies: 3,
      hiringCompanies: 1,
      remoteRoles: 3,
      allRoles: 5,
      topCompanies: [{ slug: "globex", name: "Globex Corporation", remote: 3, total: 5 }],
      categories: [{ key: "engineering", count: 2 }],
      regions: [{ key: "worldwide", count: 2, hiring: 1 }],
      policies: [{ key: "fully-remote", count: 2 }],
      sizes: [],
      stacks: [{ key: "react", count: 1 }],
      pay: { published: 2, share: 0.6667, annualUsd: { count: 1, medianMin: 150_000, medianMax: null } },
      updatedAt: "2026-11-22T11:00:00.000Z",
    } as InsightsFile;
    const result = marketOverview(insights, JOBS, NOW, url);
    expect(result.remote_roles_posted).toEqual({ last_7_days: 2, last_30_days: 2 });
    expect(result.posting_most_last_30_days[0]).toMatchObject({ company: "Globex Corporation", roles_posted: 1 });
    expect(result.most_remote_roles[0].url).toBe("https://example.test/company-profiles/globex");
    expect(result.pay).toEqual({ remote_roles_publishing_pay: 2, share: 0.67, median_annual_usd_range: { min: 150_000, max: null } });
    expect(result.stack_at_hiring_companies).toEqual([{ tech: "React", companies: 1 }]);
  });
});

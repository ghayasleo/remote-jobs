import { describe, expect, it } from "vitest";
import type { CompanyListItem } from "@/lib/data/parse";
import {
  exploreHref,
  landingTopics,
  parseTopic,
  topicCompanies,
  topicCopy,
  topicFaqs,
  topicPath,
  topicSummary,
} from "@/lib/landing";

const company = (overrides: Partial<CompanyListItem>): CompanyListItem => ({
  slug: "x",
  name: "X",
  website: "https://x.dev",
  domain: "x.dev",
  careersUrl: null,
  region: "worldwide",
  remotePolicy: "fully-remote",
  companySize: "small",
  technologies: ["python"],
  addedAt: null,
  updatedAt: null,
  blurb: "",
  keywords: "",
  ...overrides,
});

const COMPANIES = [
  company({ slug: "a", name: "A", region: "europe" }),
  company({ slug: "b", name: "B", region: "worldwide", remotePolicy: "hybrid" }),
  company({ slug: "c", name: "C", region: "americas-europe" }),
  company({ slug: "d", name: "D", region: "americas", technologies: ["go"] }),
];
const HIRING = { a: { total: 4, remote: 3 }, c: { total: 2, remote: 0 } };

describe("parseTopic", () => {
  it("accepts a region, a stack, or a region then a stack", () => {
    expect(parseTopic("europe")).toEqual({ region: "europe" });
    expect(parseTopic("python")).toEqual({ stack: "python" });
    expect(parseTopic("europe", "python")).toEqual({ region: "europe", stack: "python" });
  });

  it("rejects anything else", () => {
    expect(parseTopic("mars")).toBeNull();
    expect(parseTopic("python", "europe")).toBeNull();
    expect(parseTopic("europe", "cobol")).toBeNull();
  });
});

describe("paths and copy", () => {
  it("builds page and Explore links", () => {
    expect(topicPath({ region: "europe", stack: "python" })).toBe("/remote/europe/python");
    expect(exploreHref({ region: "europe", stack: "python" })).toBe("/companies?region=europe&stack=python");
  });

  it("writes titles people search for", () => {
    expect(topicCopy({ region: "europe", stack: "python" }).searchTitle).toBe("Remote Python jobs in Europe");
    expect(topicCopy({ stack: "go" }).searchTitle).toBe("Remote Go jobs");
    expect(topicCopy({ region: "worldwide" }).searchTitle).toBe("Remote tech jobs worldwide");
    expect(topicCopy({ region: "americas", stack: "react" }).heading).toBe("Remote React companies hiring in the Americas");
  });
});

describe("topics", () => {
  it("matches Explore's region rules", () => {
    expect(topicCompanies(COMPANIES, { region: "europe", stack: "python" }, HIRING, "2000-01-01").map((c) => c.slug)).toEqual(["a", "c", "b"]);
  });

  it("only keeps pages with enough companies", () => {
    const paths = landingTopics(COMPANIES, HIRING, "2000-01-01").map(({ topic }) => topicPath(topic));
    expect(paths).toContain("/remote/europe/python");
    expect(paths).not.toContain("/remote/go"); // just one company
  });

  it("summarises the page from its data", () => {
    const companies = topicCompanies(COMPANIES, { region: "europe", stack: "python" }, HIRING, "2000-01-01");
    expect(topicSummary({ region: "europe", stack: "python" }, companies, HIRING).intro).toBe(
      "3 remote-friendly tech companies that use Python and hire people based in Europe (including companies that hire worldwide). 2 of them are hiring right now, with 3 open remote roles between them. 2 are fully remote.",
    );
  });
});

describe("topicFaqs", () => {
  const europe = topicCompanies(COMPANIES, { region: "europe" }, HIRING, "2000-01-01");

  it("answers who is hiring first, from the page's own numbers", () => {
    const [hiring] = topicFaqs({ region: "europe" }, europe, HIRING);
    expect(hiring.question).toBe("Who is hiring for remote tech jobs in Europe right now?");
    expect(hiring.answer).toMatch(/^Right now only A is, with 3 open remote roles\./);
  });

  it("says how remote the companies are", () => {
    const [, policy] = topicFaqs({ region: "europe" }, europe, HIRING);
    expect(policy.answer).toBe("2 of the 3 are fully remote; 1 hybrid. Each profile says how the company works.");
  });

  it("asks where a stack page's companies hire", () => {
    const python = topicCompanies(COMPANIES, { stack: "python" }, HIRING, "2000-01-01");
    const [, , where] = topicFaqs({ stack: "python" }, python, HIRING);
    expect(where.question).toBe("Where do remote Python companies hire?");
    expect(where.answer).toContain("1 hire in Europe");
  });

  it("handles a page where nobody is hiring", () => {
    const [hiring] = topicFaqs({ region: "europe" }, europe, {});
    expect(hiring.answer).toMatch(/^None of the 3 companies/);
  });
});

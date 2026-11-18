import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/data/job-boards/providers";
import type { CompanyListItem } from "@/lib/data/parse";
import { computeInsights, insightsFaqs } from "@/lib/insights";

const company = (slug: string, overrides: Partial<CompanyListItem> = {}): CompanyListItem => ({
  slug,
  name: slug.toUpperCase(),
  website: "https://x.dev",
  domain: "x.dev",
  careersUrl: null,
  region: "worldwide",
  remotePolicy: "fully-remote",
  companySize: "small",
  technologies: [],
  addedAt: null,
  updatedAt: null,
  blurb: "",
  keywords: "",
  ...overrides,
});

const role = (title: string, overrides: Partial<Role> = {}): Role => ({
  id: title,
  title,
  location: "Remote",
  workplace: "remote",
  team: null,
  employmentType: null,
  salary: null,
  pay: null,
  url: "https://x.dev/job",
  postedAt: null,
  ...overrides,
});

const COMPANIES = [
  company("a", { technologies: ["go", "python"], region: "europe" }),
  company("b", { technologies: ["go"], remotePolicy: "hybrid" }),
  company("c", { technologies: ["ruby"] }),
];
const BOARDS = [
  {
    slug: "a",
    total: 4,
    roles: [
      role("Backend Engineer", { pay: { min: 100000, max: 140000, currency: "USD", unit: "YEAR" } }),
      role("Data Scientist", { salary: "€70K" }),
      role("Talent Community - General Application"),
      role("Office Manager", { workplace: "onsite" }),
    ],
  },
  { slug: "b", total: 1, roles: [role("Account Executive", { pay: { min: 80000, max: 120000, currency: "USD", unit: "YEAR" } })] },
  { slug: "c", total: 0, roles: [] },
];

describe("computeInsights", () => {
  const insights = computeInsights(COMPANIES, BOARDS);

  it("counts companies, hiring companies and real remote roles", () => {
    expect(insights).toMatchObject({ companies: 3, hiringCompanies: 2, remoteRoles: 3, allRoles: 5 });
  });

  it("ranks companies by remote roles", () => {
    expect(insights.topCompanies.map((c) => [c.name, c.remote, c.total])).toEqual([
      ["A", 2, 4],
      ["B", 1, 1],
    ]);
  });

  it("groups roles by kind of work and companies by region and policy", () => {
    // Ties keep the fixed category order (the sort is stable).
    expect(insights.categories).toEqual([
      { key: "engineering", count: 1 },
      { key: "data", count: 1 },
      { key: "sales", count: 1 },
    ]);
    expect(insights.regions[0]).toEqual({ key: "worldwide", count: 2, hiring: 1 });
    expect(insights.policies.find((p) => p.key === "hybrid")?.count).toBe(1);
  });

  it("counts stacks only at companies hiring now", () => {
    expect(insights.stacks).toEqual([
      { key: "go", count: 2 },
      { key: "python", count: 1 },
    ]);
  });

  it("summarises published pay", () => {
    expect(insights.pay.published).toBe(3);
    expect(insights.pay.annualUsd).toEqual({ count: 2, medianMin: 90000, medianMax: 130000 });
  });
});

describe("insightsFaqs", () => {
  it("answers each question from the numbers, with the date", () => {
    const insights = computeInsights(COMPANIES, BOARDS);
    const faqs = insightsFaqs(insights, "2026-11-18T10:00:00.000Z");
    expect(faqs[0].question).toBe("How many remote tech jobs are open right now?");
    expect(faqs[0].answer).toContain(`${insights.remoteRoles} remote roles were open`);
    expect(faqs[0].answer).toContain("Nov");
    expect(faqs.at(-1)!.question).toBe("Do remote job listings show pay?");
  });
});

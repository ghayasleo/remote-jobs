import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  detectBoards,
  employmentType,
  payFrom,
  PROVIDERS,
  salaryRange,
  workplaceFromText,
  type ProviderId,
} from "@/lib/data/job-boards/providers";

// Real API responses, trimmed to three jobs (tests/fixtures/boards).
const fixture = (provider: ProviderId) =>
  JSON.parse(readFileSync(`tests/fixtures/boards/${provider}.json`, "utf8"));
const roles = (provider: ProviderId) => PROVIDERS[provider].normalize(fixture(provider));

describe("normalizers", () => {
  it("greenhouse: infers remote from the location text", () => {
    expect(roles("greenhouse")[0]).toEqual({
      id: "8801094002",
      title: "Agentic Operator, Growth Marketing",
      location: "Remote (USA)",
      workplace: "remote",
      team: null,
      employmentType: null,
      salary: null,
      pay: null,
      url: "http://www.circleci.com/careers/jobs/8801094002/?gh_jid=8801094002",
      postedAt: "2026-10-06T20:30:43.000Z",
    });
  });

  it("lever: uses workplaceType, commitment and salaryRange", () => {
    expect(roles("lever")[0]).toMatchObject({
      title: "Contract Technical Recruiter",
      location: "San Francisco Bay Area",
      workplace: "onsite",
      team: "Others",
      employmentType: "Contract",
      salary: "$6K / mo",
      url: "https://jobs.lever.co/findem/5a9e3fae-86b6-4a83-9da3-aa60f864d71a",
    });
  });

  it("ashby: falls back to the location text and shows the compensation summary", () => {
    expect(roles("ashby")[0]).toMatchObject({
      title: "Senior Infrastructure Engineer",
      location: "Remote - US or Canada",
      workplace: "remote",
      team: "Engineering",
      employmentType: "Full-time",
      salary: "$170K – $210K • Offers Equity",
      postedAt: "2026-08-27T02:17:07.200Z",
    });
  });

  it("workable: uses telecommuting and joins the location parts", () => {
    expect(roles("workable")[0]).toMatchObject({
      title: "Open-Source Machine Learning Engineer - EMEA Remote",
      location: "Paris, Île-de-France, France",
      workplace: "remote",
      team: "Open Source",
      employmentType: "Full-time",
      url: "https://apply.workable.com/j/81B46579FE",
      postedAt: "2026-05-29T00:00:00.000Z",
    });
  });

  it("recruitee: prefers the remote flag and parses its UTC timestamps", () => {
    expect(roles("recruitee")[0]).toMatchObject({
      location: "Gent, Belgium",
      workplace: "remote",
      team: "for clients",
      employmentType: "Full-time",
      salary: null, // min and max are null in the response
      postedAt: "2026-10-21T08:05:42.000Z",
    });
  });

  it("every provider tolerates an empty or malformed response", () => {
    for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
      expect(PROVIDERS[provider].normalize(null)).toEqual([]);
      expect(PROVIDERS[provider].normalize({ jobs: "nope", offers: 3 })).toEqual([]);
    }
  });

  it("reads the board's company name where the API has one", () => {
    expect(PROVIDERS.workable.boardName!(fixture("workable"))).toBe("Hugging Face");
    expect(PROVIDERS.recruitee.boardName!(fixture("recruitee"))).toBe("madewithlove BV");
  });
});

describe("role details", () => {
  const details = JSON.parse(readFileSync("tests/fixtures/boards/details.json", "utf8"));

  it("greenhouse: unescapes the posting and summarises pay transparency", () => {
    const detail = PROVIDERS.greenhouse.normalizeDetail(details.greenhouse, "8801094002")!;
    expect(detail.html.startsWith("<article><header></header>")).toBe(true);
    expect(detail.payText).toBe("$118.5K – $171K · United States Base Pay Range");
  });

  it("lever: joins the description, lists and closing", () => {
    const detail = PROVIDERS.lever.normalizeDetail(details.lever, details.lever.id)!;
    expect(detail.html).toContain("What is F");
    expect(detail.html).toMatch(/<h3>[^<]+<\/h3><ul>/);
  });

  it("ashby: finds the posting in the board list", () => {
    const detail = PROVIDERS.ashby.normalizeDetail(details.ashby, "c30b2b86-47b1-453f-a2dc-7459a7c2fe80")!;
    expect(detail.html).toMatch(/^<p/);
    expect(detail.payText).toBe("$170K – $210K • Offers Equity");
    expect(PROVIDERS.ashby.normalizeDetail(details.ashby, "missing")).toBeNull();
  });

  it("workable and recruitee: add a requirements section", () => {
    expect(PROVIDERS.workable.normalizeDetail(details.workable, "81B46579FE")!.html).toContain("<h3>Requirements</h3>");
    expect(PROVIDERS.recruitee.normalizeDetail(details.recruitee, "2790099")!.html).toContain("<h3>Requirements</h3>");
  });

  it("returns null for an empty posting", () => {
    for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
      expect(PROVIDERS[provider].normalizeDetail({}, "1")).toBeNull();
    }
  });
});

describe("detectBoards", () => {
  it("finds boards in embeds, links and subdomains", () => {
    const html = `
      <script src="https://boards.greenhouse.io/embed/job_board/js?for=brave"></script>
      <a href="https://job-boards.greenhouse.io/reddit">Jobs</a>
      <a href="https://jobs.lever.co/aerostrat/abc">Role</a>
      <a href="https://jobs.ashbyhq.com/SearchApi">Careers</a>
      <a href="https://apply.workable.com/scaleworks/">Apply</a>
      <a href="https://madewithlove.recruitee.com/o/engineer">Offer</a>`;
    expect(detectBoards(html)).toEqual([
      { provider: "greenhouse", token: "brave" },
      { provider: "greenhouse", token: "reddit" },
      { provider: "lever", token: "aerostrat" },
      { provider: "ashby", token: "SearchApi" },
      { provider: "workable", token: "scaleworks" },
      { provider: "recruitee", token: "madewithlove" },
    ]);
  });

  it("ignores asset hosts and job short links that aren't boards", () => {
    const html = `
      <script src="https://tagging-server.recruitee.com/t.js"></script>
      <a href="https://apply.workable.com/j/81B46579FE">One job</a>
      <script src="https://boards.greenhouse.io/embed/job_board/js"></script>`;
    expect(detectBoards(html)).toEqual([]);
  });
});

describe("helpers", () => {
  it("formats salary ranges compactly", () => {
    expect(salaryRange(150000, 210000, "USD", "per-year-salary")).toBe("$150K – $210K / yr");
    expect(salaryRange(4000, null, "EUR", "month")).toBe("€4K / mo");
    expect(salaryRange(null, null, "USD", "year")).toBeNull();
    expect(salaryRange(100, 200, "NOT-A-CURRENCY", "year")).toBeNull();
  });

  it("reads workplace hints from free text", () => {
    expect(workplaceFromText("Remote - US")).toBe("remote");
    expect(workplaceFromText("Hybrid (London)")).toBe("hybrid");
    expect(workplaceFromText("Work from anywhere")).toBe("remote");
    expect(workplaceFromText("Berlin")).toBeNull();
  });

  it("builds structured pay only when the period is known", () => {
    expect(payFrom(100000, 150000, "usd", "per-year-salary")).toEqual({ min: 100000, max: 150000, currency: "USD", unit: "YEAR" });
    expect(payFrom(4000, null, "EUR", "month")).toEqual({ min: 4000, max: null, currency: "EUR", unit: "MONTH" });
    expect(payFrom(100, 200, "USD", null)).toBeNull();
  });

  it("decodes Greenhouse's escaped HTML, ampersands last", () => {
    expect(decodeEntities("&lt;p&gt;R&amp;D &amp;lt;3&lt;/p&gt;")).toBe("<p>R&D &lt;3</p>");
  });

  it("maps employment types and keeps unknown ones", () => {
    expect(employmentType("FullTime")).toBe("Full-time");
    expect(employmentType("fulltime_permanent")).toBe("Full-time");
    expect(employmentType("Seasonal")).toBe("Seasonal");
    expect(employmentType("")).toBeNull();
  });
});

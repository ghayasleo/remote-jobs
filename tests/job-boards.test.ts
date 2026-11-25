import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  detectBoards,
  employmentType,
  payFrom,
  PROVIDERS,
  salaryRange,
  workdayPostedAt,
  workdayRemoteFacets,
  workplaceFromText,
  xmlBlocks,
  xmlText,
  type Fetcher,
  type ProviderId,
} from "@/lib/data/job-boards/providers";

// Real API responses, trimmed to three jobs (tests/fixtures/boards). RSS and XML feeds are kept as text.
const XML_FEEDS: ProviderId[] = ["personio", "teamtailor"];
const fixture = (provider: ProviderId) => {
  const path = `tests/fixtures/boards/${provider}.${XML_FEEDS.includes(provider) ? "xml" : "json"}`;
  return XML_FEEDS.includes(provider) ? readFileSync(path, "utf8") : JSON.parse(readFileSync(path, "utf8"));
};
// The board token each fixture was fetched with.
const TOKENS: Partial<Record<ProviderId, string>> = {
  smartrecruiters: "smartrecruiters",
  personio: "crate-io.jobs.personio.de",
  teamtailor: "career",
  breezy: "boldare",
  bamboohr: "semaphore",
  rippling: "argyle",
  workday: "capitalone.wd12/Capital_One",
};
const roles = (provider: ProviderId) => PROVIDERS[provider].normalize(fixture(provider), TOKENS[provider] ?? "token");

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

  it("smartrecruiters: uses the remote flag, drops the repeated location part and builds the posting URL", () => {
    expect(roles("smartrecruiters")[0]).toMatchObject({
      id: "744000158320111",
      title: "Senior / Lead Engineering Operations Manager",
      location: "Poland, Remote",
      workplace: "remote",
      team: "Engineering",
      url: "https://jobs.smartrecruiters.com/smartrecruiters/744000158320111",
      postedAt: "2026-10-28T15:14:43.941Z",
    });
  });

  it("personio: reads the XML feed and infers remote from the office", () => {
    expect(roles("personio")[0]).toMatchObject({
      id: "2521168",
      title: "Senior Ecosystem Database Engineer (m/f/x)",
      location: "Remote/Germany",
      workplace: "remote",
      team: "Engineering AT/DE",
      employmentType: "Full-time",
      url: "https://crate-io.jobs.personio.de/job/2521168",
      postedAt: "2026-02-06T09:07:22.000Z",
    });
  });

  it("teamtailor: reads the RSS feed and maps its remote status", () => {
    const [first, second] = roles("teamtailor");
    expect(first).toMatchObject({
      id: "8746132",
      title: "Customer Success Manager - Dutch Speaking",
      location: "Stockholm",
      workplace: "hybrid",
      team: "Customer Success",
      url: "https://career.teamtailor.com/jobs/8746132-customer-success-manager-dutch-speaking",
      postedAt: "2026-11-16T09:25:07.000Z",
    });
    expect(second.workplace).toBe("onsite");
    // "fully" is Teamtailor's word for remote; the fixture's board has none, so a minimal item checks it.
    const item = `<rss><channel><title>Acme</title><item><title>Engineer</title><link>https://acme.teamtailor.com/jobs/1-engineer</link><remoteStatus>fully</remoteStatus></item></channel></rss>`;
    expect(PROVIDERS.teamtailor.normalize(item, "acme")[0]).toMatchObject({ id: "1", workplace: "remote" });
  });

  it("breezy: uses the remote flag and reads 'no location restrictions' as anywhere", () => {
    const [onsite, , anywhere] = roles("breezy");
    expect(onsite).toMatchObject({ title: "Agile Project Lead", location: "Gliwice, PL", workplace: "onsite", employmentType: "Full-time" });
    expect(anywhere).toMatchObject({ title: "Contact Us", location: "Anywhere", workplace: "remote" });
  });

  it("bamboohr: reads the location type and builds the posting URL", () => {
    expect(roles("bamboohr")[0]).toMatchObject({
      id: "44",
      title: "Security Engineer",
      location: "Serbia",
      workplace: "remote",
      team: "Engineering",
      employmentType: "Full-time",
      url: "https://semaphore.bamboohr.com/careers/44",
      postedAt: null,
    });
  });

  it("rippling: reads each location's workplace type", () => {
    expect(roles("rippling")[0]).toMatchObject({
      title: "Revenue Operations Analyst",
      location: "US (Remote)",
      workplace: "remote",
      team: "Sales & Marketing",
      url: "https://ats.rippling.com/argyle/jobs/b4e8e3c6-9e23-467c-b5eb-113e04f83185",
    });
  });

  it("workday: names a multi-location job by its remote filter, and approximates the date", () => {
    const { first } = fixture("workday");
    const remote = workdayRemoteFacets(first.facets)!;
    const [single, multi] = PROVIDERS.workday.normalize({ jobPostings: first.jobPostings, labels: remote.labels }, "capitalone.wd12/Capital_One");
    expect(single).toMatchObject({
      id: "Caf-Ambassador---Bellevue_R1003582-1",
      location: "Bellevue, WA",
      workplace: "remote",
      employmentType: "Full-time",
      url: "https://capitalone.wd12.myworkdayjobs.com/Capital_One/job/Bellevue-WA/Caf-Ambassador---Bellevue_R1003582-1",
    });
    expect(multi.location).toBe("Remote - National, US Remote");
  });

  it("workday: reads the board's filters, then asks only for its remote jobs", async () => {
    const { first } = fixture("workday");
    const calls: { url: string; body: unknown }[] = [];
    const get: Fetcher = async (url, init) => {
      calls.push({ url, body: init?.body });
      return calls.length === 1 ? first : { jobPostings: first.jobPostings };
    };
    const data = await PROVIDERS.workday.load!("capitalone.wd12/Capital_One", get);
    expect(calls[0].url).toBe("https://capitalone.wd12.myworkdayjobs.com/wday/cxs/capitalone/Capital_One/jobs");
    expect(calls[1].body).toMatchObject({ appliedFacets: workdayRemoteFacets(first.facets)!.applied, limit: 20, offset: 0 });
    expect(calls).toHaveLength(2); // a short page means there's no next one
    expect(PROVIDERS.workday.normalize(data, "capitalone.wd12/Capital_One")).toHaveLength(2);
  });

  it("workday: a board without a remote filter has no remote jobs, and a failed first request reads as down", async () => {
    expect(await PROVIDERS.workday.load!("acme.wd1/Careers", async () => ({ jobPostings: [], facets: [] }))).toEqual({
      jobPostings: [],
      labels: [],
    });
    expect(await PROVIDERS.workday.load!("acme.wd1/Careers", async () => null)).toBeNull();
  });

  it("every provider tolerates an empty or malformed response", () => {
    for (const provider of Object.keys(PROVIDERS) as ProviderId[]) {
      expect(PROVIDERS[provider].normalize(null, "token")).toEqual([]);
      expect(PROVIDERS[provider].normalize({ jobs: "nope", offers: 3 }, "token")).toEqual([]);
    }
  });

  it("reads the board's company name where the API has one", () => {
    expect(PROVIDERS.workable.boardName!(fixture("workable"))).toBe("Hugging Face");
    expect(PROVIDERS.recruitee.boardName!(fixture("recruitee"))).toBe("madewithlove BV");
    expect(PROVIDERS.smartrecruiters.boardName!(fixture("smartrecruiters"))).toBe("SmartRecruiters Inc");
    expect(PROVIDERS.personio.boardName!(fixture("personio"))).toBe("Crate.io GmbH");
    expect(PROVIDERS.teamtailor.boardName!(fixture("teamtailor"))).toBe("Teamtailor");
    expect(PROVIDERS.breezy.boardName!(fixture("breezy"))).toBe("Boldare");
  });
});

describe("feeds and Workday helpers", () => {
  it("reads XML blocks and text, unwrapping CDATA and decoding entities", () => {
    const xml = "<a><b>One &amp; two</b><b><![CDATA[<p>Three</p>]]></b><c/></a>";
    expect(xmlBlocks(xml, "b")).toHaveLength(2);
    expect(xmlText(xml, "b")).toBe("One & two");
    expect(xmlText(xmlBlocks(xml, "b")[1].replace(/^/, "<x>").concat("</x>"), "x")).toBe("<p>Three</p>");
    expect(xmlText(xml, "c")).toBeNull();
    expect(xmlBlocks(null, "b")).toEqual([]);
  });

  it("turns Workday's 'Posted …' text into that day", () => {
    const now = Date.parse("2026-11-25T15:00:00Z");
    expect(workdayPostedAt("Posted Today", now)).toBe("2026-11-25T00:00:00.000Z");
    expect(workdayPostedAt("Posted Yesterday", now)).toBe("2026-11-24T00:00:00.000Z");
    expect(workdayPostedAt("Posted 5 Days Ago", now)).toBe("2026-11-20T00:00:00.000Z");
    expect(workdayPostedAt("Posted 30+ Days Ago", now)).toBe("2026-10-26T00:00:00.000Z");
    expect(workdayPostedAt("Soon", now)).toBeNull();
  });

  it("prefers a remote work-type filter to location names", () => {
    const facets = [
      { facetParameter: "remoteType", values: [{ descriptor: "Remote", id: "r" }, { descriptor: "Hybrid", id: "h" }] },
      { facetParameter: "locationMainGroup", values: [{ facetParameter: "locations", values: [{ descriptor: "Remote - US", id: "l" }] }] },
    ];
    expect(workdayRemoteFacets(facets)).toEqual({ applied: { remoteType: ["r"] }, labels: ["Remote"] });
    expect(workdayRemoteFacets([{ facetParameter: "locations", values: [{ descriptor: "Berlin", id: "b" }] }])).toBeNull();
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

  it("smartrecruiters: joins the job ad's sections, description first", () => {
    const detail = PROVIDERS.smartrecruiters.normalizeDetail(details.smartrecruiters, "1")!;
    expect(detail.html.startsWith("<h3>Job Description</h3>")).toBe(true);
    expect(detail.html).toContain("<h3>Qualifications</h3>");
  });

  it("personio and teamtailor: find the posting's description in the feed", () => {
    expect(PROVIDERS.personio.normalizeDetail(fixture("personio"), "2521168")!.html).toMatch(/^<h3>DAILY PLAYGROUND<\/h3>/);
    expect(PROVIDERS.teamtailor.normalizeDetail(fixture("teamtailor"), "8746132")!.html).toContain("<h4>Let's build the future together!</h4>");
    expect(PROVIDERS.personio.normalizeDetail(fixture("personio"), "missing")).toBeNull();
  });

  it("bamboohr and workday: read the posting's description", () => {
    expect(PROVIDERS.bamboohr.normalizeDetail(details.bamboohr, "44")!.html.length).toBeGreaterThan(50);
    expect(PROVIDERS.workday.normalizeDetail({ jobPostingInfo: { jobDescription: "<p>About the role</p>" } }, "x")).toEqual({
      html: "<p>About the role</p>",
      payText: null,
    });
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

  it("finds the newer providers' boards", () => {
    const html = `
      <a href="https://careers.smartrecruiters.com/PayScale">Jobs</a>
      <a href="https://crate-io.jobs.personio.de/job/1">Role</a>
      <a href="https://thecasumolimited.teamtailor.com/jobs">Careers</a>
      <a href="https://boldare.breezy.hr/p/abc">Role</a>
      <a href="https://semaphore.bamboohr.com/careers">Careers</a>
      <a href="https://ats.rippling.com/argyle/jobs">Jobs</a>
      <a href="https://capitalone.wd12.myworkdayjobs.com/en-US/Capital_One/job/x">Role</a>`;
    expect(detectBoards(html)).toEqual([
      { provider: "smartrecruiters", token: "PayScale" },
      { provider: "personio", token: "crate-io.jobs.personio.de" },
      { provider: "teamtailor", token: "thecasumolimited" },
      { provider: "breezy", token: "boldare" },
      { provider: "bamboohr", token: "semaphore" },
      { provider: "rippling", token: "argyle" },
      { provider: "workday", token: "capitalone.wd12/Capital_One" },
    ]);
  });

  it("skips Workday's API paths and a BambooHR login link", () => {
    const html = `
      <script src="https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/Careers/jobs"></script>
      <a href="https://acme.bamboohr.com/login">Employee login</a>`;
    expect(detectBoards(html)).toEqual([]);
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

// Public job-board APIs that list a company's open roles. Each provider knows
// its endpoint, how to spot its board on a careers page, and how to turn its
// response into Roles.
//
// No runtime imports on purpose: scripts/find-job-boards.ts loads this file
// directly with Node's TypeScript support.

export type ProviderId =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "recruitee"
  | "smartrecruiters"
  | "personio"
  | "teamtailor"
  | "breezy"
  | "bamboohr"
  | "rippling"
  | "gem"
  | "pinpoint"
  | "workday";

export type Board = { provider: ProviderId; token: string };

export type Workplace = "remote" | "hybrid" | "onsite";

export type Role = {
  id: string;
  title: string;
  /** Human-readable location, "" when the board doesn't say. */
  location: string;
  /** null when the board doesn't say and the location text gives no hint. */
  workplace: Workplace | null;
  team: string | null;
  employmentType: string | null;
  salary: string | null;
  /** Structured pay, when the board gives numbers and a period. */
  pay: Pay | null;
  url: string;
  /** ISO timestamp. */
  postedAt: string | null;
  /** Other ids the board lists for this same posting (reposts), set by dedupeRoles. */
  duplicateIds?: string[];
  /** The same role posted for other locations, set by dedupeRoles on the role that represents them. */
  alternates?: Role[];
};

/**
 * Fetches one URL for a provider: parsed JSON (or text with `as: "text"`),
 * or null for any failure. The caller supplies it with its own timeout.
 */
export type Fetcher = (
  url: string,
  init?: { method?: "GET" | "POST"; body?: unknown; as?: "json" | "text" },
) => Promise<unknown>;

export type Pay = {
  min: number | null;
  max: number | null;
  currency: string;
  unit: "HOUR" | "DAY" | "MONTH" | "YEAR";
};

/** The full posting, for a role's own page. HTML is sanitized before display. */
export type RoleDetail = { html: string; payText: string | null };

type Provider = {
  label: string;
  apiUrl: (token: string) => string;
  /** The public board, for "see all roles". */
  boardUrl: (token: string) => string;
  /** Regexes whose first group is a board token, matched against careers pages. */
  patterns: RegExp[];
  /** Builds the token from a pattern match when it takes more than the first group; null skips the match. */
  tokenFrom?: (match: RegExpMatchArray) => string | null;
  /** Tokens the patterns can match that aren't boards. */
  ignoreTokens?: string[];
  /** The board's feed is XML (RSS), not JSON: normalize and normalizeDetail get its text. */
  format?: "json" | "text";
  /** For boards that take more than one request (pages, a POST): what normalize reads. null if it failed. */
  load?: (token: string, get: Fetcher) => Promise<unknown>;
  normalize: (data: unknown, token: string) => Role[];
  /** Company name reported by the board, used to double-check a match. */
  boardName?: (data: unknown) => string | null;
  /** Where boardName reads from, when it isn't the apiUrl response. */
  nameUrl?: (token: string) => string;
  /** One posting's full details. Without it, `detailFromList` boards read their list; others have none. */
  detailUrl?: (token: string, id: string) => string;
  /** The board's list already carries each posting's full description. */
  detailFromList?: boolean;
  normalizeDetail: (data: unknown, id: string) => RoleDetail | null;
};

/* ---------- helpers ---------- */

type Json = Record<string, unknown>;
const obj = (value: unknown): Json => (value && typeof value === "object" ? (value as Json) : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export function workplaceFromText(text: string | null): Workplace | null {
  if (!text) return null;
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\b(remote|anywhere|distributed|work from home|wfh)\b/i.test(text)) return "remote";
  return null;
}

function isoDate(value: unknown): string | null {
  if (typeof value === "number") return new Date(value).toISOString();
  const text = str(value);
  if (!text) return null;
  // Recruitee: "2026-10-21 08:05:42 UTC"
  const date = new Date(text.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC$/, "$1T$2Z"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const EMPLOYMENT_TYPES: Record<string, string> = {
  fulltime: "Full-time",
  "full-time": "Full-time",
  full_time: "Full-time",
  fulltime_permanent: "Full-time",
  fulltime_fixed_term: "Full-time, fixed term",
  parttime: "Part-time",
  "part-time": "Part-time",
  parttime_permanent: "Part-time",
  contract: "Contract",
  contractor: "Contract",
  consultant: "Contract",
  freelance: "Freelance",
  intern: "Internship",
  internship: "Internship",
  temporary: "Temporary",
};

export function employmentType(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  return EMPLOYMENT_TYPES[text.toLowerCase().replace(/\s+/g, "")] ?? text;
}

const PERIODS: Record<string, string> = {
  "per-year-salary": "yr",
  year: "yr",
  yearly: "yr",
  "per-month-salary": "mo",
  month: "mo",
  monthly: "mo",
  "per-hour-wage": "hr",
  hour: "hr",
  hourly: "hr",
  "per-day-wage": "day",
  day: "day",
};

export function salaryRange(min: unknown, max: unknown, currency: unknown, period: unknown) {
  const low = num(min);
  const high = num(max);
  const code = str(currency);
  if ((low === null && high === null) || !code) return null;
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      notation: "compact",
      maximumFractionDigits: 1,
    });
  } catch {
    return null;
  }
  const amount =
    low !== null && high !== null && low !== high
      ? `${format.format(low)} – ${format.format(high)}`
      : format.format((low ?? high)!);
  const unit = PERIODS[str(period)?.toLowerCase() ?? ""];
  return unit ? `${amount} / ${unit}` : amount;
}

const PAY_UNITS: Record<string, Pay["unit"]> = { yr: "YEAR", mo: "MONTH", hr: "HOUR", day: "DAY" };

export function payFrom(min: unknown, max: unknown, currency: unknown, period: unknown): Pay | null {
  const unit = PAY_UNITS[PERIODS[str(period)?.toLowerCase() ?? ""] ?? ""];
  const code = str(currency);
  if (!unit || !code || (num(min) === null && num(max) === null)) return null;
  return { min: num(min), max: num(max), currency: code.toUpperCase(), unit };
}

/** Greenhouse escapes its HTML once ("&lt;p&gt;"). */
export function decodeEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

const section = (title: string, html: unknown) => (str(html) ? `<h3>${title}</h3>${html}` : "");

const joinLocation = (...parts: unknown[]) =>
  [...new Set(parts.map(str).filter(Boolean))].join(", ");

/** Each <tag>…</tag> block's inner XML, in order. For flat feeds, where a tag isn't nested in itself. */
export function xmlBlocks(xml: unknown, tag: string): string[] {
  if (typeof xml !== "string") return [];
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"))].map((match) => match[1]);
}

/** The first <tag>'s text, with CDATA unwrapped or entities decoded. null when absent or empty. */
export function xmlText(xml: unknown, tag: string): string | null {
  const block = xmlBlocks(xml, tag)[0];
  if (block === undefined) return null;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(block);
  return str(cdata ? cdata[1] : decodeEntities(block.replace(/&apos;/g, "'")));
}

const DAY_MS = 86_400_000;

/** Workday says "Posted Today", "Posted Yesterday", "Posted 5 Days Ago" or "Posted 30+ Days Ago": that day, at midnight UTC. */
export function workdayPostedAt(text: string | null, now = Date.now()): string | null {
  if (!text) return null;
  const days = /today/i.test(text) ? 0 : /yesterday/i.test(text) ? 1 : Number(/(\d+)\+?\s*days?/i.exec(text)?.[1]);
  if (!Number.isFinite(days)) return null;
  const date = new Date(now - days * DAY_MS);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

const isRemoteLabel = (label: string) =>
  /\bremote\b/i.test(label) && !/\b(hybrid|non[- ]?remote|not remote|on[- ]?site|in[- ]office)\b/i.test(label);

/**
 * The Workday filters that select remote jobs, read from a jobs response's
 * facets: a remote option in a work-type filter ("remoteType"), else the
 * locations whose name says remote ("Remote - National"). null when the board
 * has neither, which means no remote jobs to list.
 */
export function workdayRemoteFacets(facets: unknown): { applied: Record<string, string[]>; labels: string[] } | null {
  const options: { param: string; id: string; label: string }[] = [];
  const walk = (items: unknown[]) => {
    for (const item of items) {
      const facet = obj(item);
      const values = list(facet.values);
      // A group ("locationMainGroup") holds facets of its own.
      if (values.some((value) => str(obj(value).facetParameter))) {
        walk(values);
        continue;
      }
      const param = str(facet.facetParameter);
      for (const value of values) {
        const id = str(obj(value).id);
        const label = str(obj(value).descriptor);
        if (param && id && label && isRemoteLabel(label)) options.push({ param, id, label });
      }
    }
  };
  walk(list(facets));
  const workType = options.filter((option) => /remote|workplace|worktype|work_type/i.test(option.param));
  const chosen = workType.length ? workType : options.filter((option) => /location/i.test(option.param));
  if (chosen.length === 0) return null;
  const applied: Record<string, string[]> = {};
  for (const { param, id } of chosen) (applied[param] ??= []).push(id);
  return { applied, labels: [...new Set(chosen.map((option) => option.label))] };
}

/** "capitalone.wd12/Capital_One" → the board's hosts. null for a malformed token. */
function workdayBoard(token: string) {
  const match = /^([a-z0-9-]+)\.(wd\d+)\/([A-Za-z0-9_-]+)$/i.exec(token);
  if (!match) return null;
  const [, tenant, instance, site] = match;
  const host = `${tenant}.${instance}.myworkdayjobs.com`;
  return { api: `https://${host}/wday/cxs/${tenant}/${site}`, board: `https://${host}/${site}` };
}

// Workday lists 20 jobs a request and rate-limits hard: three pages is enough
// for any company's remote roles, and keeps an hourly refresh to a few requests.
const WORKDAY_PAGE = 20;
const WORKDAY_PAGES = 3;
// Paged APIs: enough for the busiest boards without hammering them.
const MAX_PAGES = 4;

/** "Poland, Remote, Poland" → "Poland, Remote". */
const uniqueParts = (text: string | null) => (text ? [...new Set(text.split(/,\s*/).filter(Boolean))].join(", ") : "");

/** Reads a paged JSON API until a short page, `MAX_PAGES` pages, or a failure after the first page. */
async function readPages(get: Fetcher, pageUrl: (page: number) => string, items: (data: Json) => unknown[], pageSize: number) {
  const all: unknown[] = [];
  let first: Json | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await get(pageUrl(page));
    if (!data || typeof data !== "object") return first ? { first, all } : null;
    first ??= obj(data);
    const batch = items(obj(data));
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return first ? { first, all } : null;
}

const smartRecruitersApi = (token: string) =>
  `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=100`;

const ripplingApi = (token: string) => `https://ats.rippling.com/api/v2/board/${encodeURIComponent(token)}/jobs?pageSize=100`;

/** A Personio position without its descriptions and extra offices, whose <name> and <office> tags would clash. */
const personioFields = (position: string) =>
  position
    .replace(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/, "")
    .replace(/<additionalOffices>[\s\S]*?<\/additionalOffices>/, "");

const teamtailorHost = (token: string) => (token.includes(".") ? token : `${token}.teamtailor.com`);

/** Teamtailor's job id, from its link (".../jobs/8746132-title"), else its guid. */
const teamtailorId = (item: string) => /\/jobs\/(\d+)/.exec(xmlText(item, "link") ?? "")?.[1] ?? xmlText(item, "guid") ?? "";

/* ---------- providers ---------- */

export const PROVIDERS: Record<ProviderId, Provider> = {
  greenhouse: {
    label: "Greenhouse",
    apiUrl: (token) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`,
    boardUrl: (token) => `https://job-boards.greenhouse.io/${encodeURIComponent(token)}`,
    patterns: [
      /greenhouse\.io\/embed\/job_board(?:\/js)?\?(?:[^"'\s<>]*&)?for=([a-z0-9_-]+)/gi,
      /(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/gi,
      /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/gi,
    ],
    ignoreTokens: ["embed", "v1", "jobs"],
    normalize: (data) =>
      list(obj(data).jobs).map((job) => {
        const j = obj(job);
        const location = str(obj(j.location).name) ?? "";
        return {
          id: String(j.id),
          title: str(j.title) ?? "Untitled role",
          location,
          workplace: workplaceFromText(location),
          team: null,
          employmentType: null,
          salary: null,
          pay: null,
          url: str(j.absolute_url) ?? "",
          postedAt: isoDate(j.first_published) ?? isoDate(j.updated_at),
        };
      }),
    boardName: (data) => str(obj(data).name),
    nameUrl: (token) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}`,
    detailUrl: (token, id) =>
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}?pay_transparency=true`,
    normalizeDetail: (data) => {
      const job = obj(data);
      const content = str(job.content);
      if (!content) return null;
      const range = obj(list(job.pay_input_ranges)[0]);
      const amount = salaryRange(num(range.min_cents)! / 100, num(range.max_cents)! / 100, range.currency_type, null);
      return {
        html: decodeEntities(content),
        payText: amount ? [amount, str(range.title)?.replace(/[\s:;,.]+$/, "")].filter(Boolean).join(" · ") : null,
      };
    },
  },

  lever: {
    label: "Lever",
    apiUrl: (token) => `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
    boardUrl: (token) => `https://jobs.lever.co/${encodeURIComponent(token)}`,
    patterns: [/jobs\.lever\.co\/([a-z0-9_.-]+)/gi],
    normalize: (data) =>
      list(data).map((posting) => {
        const p = obj(posting);
        const categories = obj(p.categories);
        const location = str(categories.location) ?? "";
        const workplaceType = str(p.workplaceType);
        const range = obj(p.salaryRange);
        return {
          id: String(p.id),
          title: str(p.text) ?? "Untitled role",
          location,
          workplace:
            workplaceType === "remote" || workplaceType === "hybrid" || workplaceType === "onsite"
              ? workplaceType
              : workplaceFromText(location),
          team: str(categories.team) ?? str(categories.department),
          employmentType: employmentType(categories.commitment),
          salary: salaryRange(range.min, range.max, range.currency, range.interval),
          pay: payFrom(range.min, range.max, range.currency, range.interval),
          url: str(p.hostedUrl) ?? str(p.applyUrl) ?? "",
          postedAt: isoDate(p.createdAt),
        };
      }),
    detailUrl: (token, id) =>
      `https://api.lever.co/v0/postings/${encodeURIComponent(token)}/${encodeURIComponent(id)}`,
    normalizeDetail: (data) => {
      const posting = obj(data);
      const lists = list(posting.lists)
        .map((item) => section(str(obj(item).text) ?? "", `<ul>${str(obj(item).content) ?? ""}</ul>`))
        .join("");
      const html = [str(posting.description), lists, str(posting.additional)].filter(Boolean).join("");
      return html ? { html, payText: str(posting.salaryDescriptionPlain) } : null;
    },
  },

  ashby: {
    label: "Ashby",
    apiUrl: (token) =>
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`,
    boardUrl: (token) => `https://jobs.ashbyhq.com/${encodeURIComponent(token)}`,
    patterns: [/jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/gi],
    normalize: (data) =>
      list(obj(data).jobs)
        .filter((job) => obj(job).isListed !== false)
        .map((job) => {
          const j = obj(job);
          const location = str(j.location) ?? "";
          const workplaceType = str(j.workplaceType)?.toLowerCase();
          const compensation = obj(j.compensation);
          return {
            id: String(j.id),
            title: str(j.title) ?? "Untitled role",
            location,
            workplace:
              j.isRemote === true || workplaceType === "remote"
                ? "remote"
                : workplaceType === "hybrid"
                  ? "hybrid"
                  : workplaceType === "onsite"
                    ? "onsite"
                    : workplaceFromText(location),
            team: str(j.department) ?? str(j.team),
            employmentType: employmentType(j.employmentType),
            salary:
              j.shouldDisplayCompensationOnJobPostings === false
                ? null
                : str(compensation.compensationTierSummary) ??
                  str(compensation.scrapeableCompensationSalarySummary),
            pay: null,
            url: str(j.jobUrl) ?? str(j.applyUrl) ?? "",
            postedAt: isoDate(j.publishedAt),
          };
        }),
    // No public single-posting endpoint: the board list carries every description.
    detailFromList: true,
    normalizeDetail: (data, id) => {
      const job = obj(list(obj(data).jobs).find((item) => String(obj(item).id) === id));
      const html = str(job.descriptionHtml);
      const compensation = obj(job.compensation);
      return html
        ? {
            html,
            payText:
              job.shouldDisplayCompensationOnJobPostings === false ? null : str(compensation.compensationTierSummary),
          }
        : null;
    },
  },

  workable: {
    label: "Workable",
    apiUrl: (token) => `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(token)}`,
    boardUrl: (token) => `https://apply.workable.com/${encodeURIComponent(token)}/`,
    patterns: [/apply\.workable\.com\/([a-z0-9_-]+)/gi],
    ignoreTokens: ["api", "j"],
    normalize: (data) =>
      list(obj(data).jobs).map((job) => {
        const j = obj(job);
        const location = joinLocation(j.city, j.state, j.country);
        return {
          id: String(j.shortcode ?? j.code ?? j.url),
          title: str(j.title) ?? "Untitled role",
          location,
          workplace: j.telecommuting === true ? "remote" : workplaceFromText(location),
          team: str(j.department),
          employmentType: employmentType(j.employment_type),
          salary: null,
          pay: null,
          url: str(j.url) ?? str(j.application_url) ?? "",
          postedAt: isoDate(j.published_on) ?? isoDate(j.created_at),
        };
      }),
    boardName: (data) => str(obj(data).name),
    detailUrl: (token, id) =>
      `https://apply.workable.com/api/v1/accounts/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}`,
    normalizeDetail: (data) => {
      const job = obj(data);
      const html = [str(job.description), section("Requirements", job.requirements), section("Benefits", job.benefits)]
        .filter(Boolean)
        .join("");
      return html ? { html, payText: null } : null;
    },
  },

  recruitee: {
    label: "Recruitee",
    apiUrl: (token) => `https://${encodeURIComponent(token)}.recruitee.com/api/offers/`,
    boardUrl: (token) => `https://${encodeURIComponent(token)}.recruitee.com/`,
    patterns: [/\b([a-z0-9-]+)\.recruitee\.com/gi],
    ignoreTokens: ["www", "app", "api", "static", "careers-static", "tagging-server", "cdn", "assets"],
    normalize: (data) =>
      list(obj(data).offers).map((offer) => {
        const o = obj(offer);
        const location = joinLocation(o.city, o.country) || (str(o.location) ?? "");
        const salary = obj(o.salary);
        return {
          id: String(o.id),
          title: str(o.title) ?? "Untitled role",
          location,
          workplace:
            o.remote === true
              ? "remote"
              : o.hybrid === true
                ? "hybrid"
                : o.on_site === true
                  ? "onsite"
                  : workplaceFromText(str(o.location)),
          team: str(o.department),
          employmentType: employmentType(o.employment_type_code),
          salary: salaryRange(salary.min, salary.max, salary.currency, salary.period),
          pay: payFrom(salary.min, salary.max, salary.currency, salary.period),
          url: str(o.careers_url) ?? "",
          postedAt: isoDate(o.published_at) ?? isoDate(o.created_at),
        };
      }),
    boardName: (data) => str(obj(list(obj(data).offers)[0]).company_name),
    detailUrl: (token, id) => `https://${encodeURIComponent(token)}.recruitee.com/api/offers/${encodeURIComponent(id)}`,
    normalizeDetail: (data) => {
      const offer = obj(obj(data).offer);
      const html = [str(offer.description), section("Requirements", offer.requirements)].filter(Boolean).join("");
      const pay = obj(offer.salary);
      return html ? { html, payText: salaryRange(pay.min, pay.max, pay.currency, pay.period) } : null;
    },
  },

  smartrecruiters: {
    label: "SmartRecruiters",
    apiUrl: smartRecruitersApi,
    boardUrl: (token) => `https://careers.smartrecruiters.com/${encodeURIComponent(token)}`,
    patterns: [
      /(?:careers|jobs)\.smartrecruiters\.com\/([A-Za-z0-9_-]+)/gi,
      /api\.smartrecruiters\.com\/v1\/companies\/([A-Za-z0-9_-]+)/gi,
    ],
    ignoreTokens: ["oneclick-ui", "embed", "static", "assets", "widget"],
    load: async (token, get) => {
      const pages = await readPages(get, (page) => `${smartRecruitersApi(token)}&offset=${page * 100}`, (data) => list(data.content), 100);
      return pages && { ...pages.first, content: pages.all };
    },
    normalize: (data, token) =>
      list(obj(data).content).map((posting) => {
        const p = obj(posting);
        const where = obj(p.location);
        const location =
          uniqueParts(str(where.fullLocation)) || joinLocation(where.city, where.region, str(where.country)?.toUpperCase());
        const id = String(p.id ?? "");
        return {
          id,
          title: str(p.name) ?? "Untitled role",
          location,
          workplace:
            where.remote === true
              ? "remote"
              : where.hybrid === true
                ? "hybrid"
                : where.remote === false
                  ? "onsite"
                  : workplaceFromText(location),
          team: str(obj(p.department).label),
          employmentType: employmentType(obj(p.typeOfEmployment).label),
          salary: null,
          pay: null,
          url: id ? `https://jobs.smartrecruiters.com/${encodeURIComponent(token)}/${encodeURIComponent(id)}` : "",
          postedAt: isoDate(p.releasedDate),
        };
      }),
    boardName: (data) => str(obj(obj(list(obj(data).content)[0]).company).name),
    detailUrl: (token, id) =>
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings/${encodeURIComponent(id)}`,
    normalizeDetail: (data) => {
      const sections = obj(obj(obj(data).jobAd).sections);
      const html = ["jobDescription", "qualifications", "additionalInformation", "companyDescription"]
        .map((key) => section(str(obj(sections[key]).title) ?? "", obj(sections[key]).text))
        .join("");
      return html ? { html, payText: null } : null;
    },
  },

  personio: {
    label: "Personio",
    // The token is the board's host: boards live on jobs.personio.de and jobs.personio.com.
    apiUrl: (token) => `https://${token}/xml`,
    boardUrl: (token) => `https://${token}/`,
    patterns: [/\b([a-z0-9-]+\.jobs\.personio\.(?:de|com))\b/gi],
    tokenFrom: (match) => match[1].toLowerCase(),
    format: "text",
    normalize: (xml, token) =>
      xmlBlocks(xml, "position")
        .map((position) => {
          const fields = personioFields(position);
          const extra = xmlBlocks(xmlBlocks(position, "additionalOffices")[0] ?? "", "office").map((office) =>
            decodeEntities(office).trim(),
          );
          const location = joinLocation(xmlText(fields, "office"), ...extra);
          const id = xmlText(fields, "id") ?? "";
          const intern = /intern/i.test(xmlText(fields, "employmentType") ?? "");
          return {
            id,
            title: xmlText(fields, "name") ?? "Untitled role",
            location,
            workplace: workplaceFromText(location),
            team: xmlText(fields, "department"),
            employmentType: intern ? "Internship" : employmentType(xmlText(fields, "schedule")),
            salary: null,
            pay: null,
            url: id ? `https://${token}/job/${encodeURIComponent(id)}` : "",
            postedAt: isoDate(xmlText(fields, "createdAt")),
          };
        })
        .filter((role) => role.id),
    boardName: (xml) => xmlText(personioFields(xmlBlocks(xml, "position")[0] ?? ""), "subcompany"),
    detailFromList: true,
    normalizeDetail: (xml, id) => {
      const position = xmlBlocks(xml, "position").find((block) => xmlText(personioFields(block), "id") === id);
      const html = xmlBlocks(xmlBlocks(position ?? "", "jobDescriptions")[0] ?? "", "jobDescription")
        .map((part) => section(xmlText(part, "name") ?? "", xmlText(part, "value")))
        .join("");
      return html ? { html, payText: null } : null;
    },
  },

  teamtailor: {
    label: "Teamtailor",
    // The token is a teamtailor.com subdomain, or the host of a career site on the company's own domain.
    apiUrl: (token) => `https://${teamtailorHost(token)}/jobs.rss`,
    boardUrl: (token) => `https://${teamtailorHost(token)}/jobs`,
    patterns: [/\b([a-z0-9-]+)\.teamtailor\.com/gi],
    ignoreTokens: ["www", "app", "api", "assets", "cdn", "support", "docs", "status", "partners", "integrations", "scripts"],
    format: "text",
    normalize: (xml) =>
      xmlBlocks(xml, "item")
        .map((item) => {
          const places = xmlBlocks(item, "tt:location").map(
            (place) => xmlText(place, "tt:name") ?? joinLocation(xmlText(place, "tt:city"), xmlText(place, "tt:country")),
          );
          const location = joinLocation(...places);
          const status = xmlText(item, "remoteStatus")?.toLowerCase();
          return {
            id: teamtailorId(item),
            title: xmlText(item, "title") ?? "Untitled role",
            location,
            // Teamtailor's statuses: none, temporary, hybrid and fully (remote).
            workplace:
              status === "fully" ? "remote" : status === "hybrid" ? "hybrid" : status === "none" ? "onsite" : workplaceFromText(location),
            team: xmlText(item, "tt:department"),
            employmentType: null,
            salary: null,
            pay: null,
            url: xmlText(item, "link") ?? "",
            postedAt: isoDate(xmlText(item, "pubDate")),
          };
        })
        .filter((role) => role.id && role.url),
    boardName: (xml) => (typeof xml === "string" ? xmlText(xml.split("<item>")[0], "title") : null),
    detailFromList: true,
    normalizeDetail: (xml, id) => {
      const item = xmlBlocks(xml, "item").find((block) => teamtailorId(block) === id);
      const html = item ? xmlText(item, "description") : null;
      return html ? { html, payText: null } : null;
    },
  },

  breezy: {
    label: "Breezy HR",
    apiUrl: (token) => `https://${encodeURIComponent(token)}.breezy.hr/json`,
    boardUrl: (token) => `https://${encodeURIComponent(token)}.breezy.hr/`,
    patterns: [/\b([a-z0-9-]+)\.breezy\.hr/gi],
    ignoreTokens: ["www", "app", "api", "assets", "help", "developer", "marketing", "attachments"],
    normalize: (data) =>
      list(data)
        .map((posting) => {
          const p = obj(posting);
          const where = obj(p.location);
          // "Fully remote, no location restrictions" is open anywhere, whatever country the posting names.
          const anywhere = where.is_remote === true && /no location restriction/i.test(str(obj(where.remote_details).label) ?? "");
          const location = anywhere
            ? "Anywhere"
            : (str(where.name) ?? joinLocation(where.city, obj(where.state).name, obj(where.country).name));
          return {
            id: str(p.id) ?? "",
            title: str(p.name) ?? "Untitled role",
            location,
            workplace:
              where.is_remote === true ? "remote" : (workplaceFromText(location) ?? (where.is_remote === false ? "onsite" : null)),
            team: str(p.department),
            employmentType: employmentType(obj(p.type).name),
            salary: str(p.salary),
            pay: null,
            url: str(p.url) ?? "",
            postedAt: isoDate(p.published_date),
          };
        })
        .filter((role) => role.id && role.url),
    boardName: (data) => str(obj(obj(list(data)[0]).company).name),
    // No public endpoint for one posting's description: the page links to the posting instead.
    normalizeDetail: () => null,
  },

  bamboohr: {
    label: "BambooHR",
    apiUrl: (token) => `https://${encodeURIComponent(token)}.bamboohr.com/careers/list`,
    boardUrl: (token) => `https://${encodeURIComponent(token)}.bamboohr.com/careers`,
    patterns: [/\b([a-z0-9-]+)\.bamboohr\.com\/(?:careers|jobs)/gi],
    ignoreTokens: ["www", "app", "api", "help", "marketplace", "partners", "static", "assets", "documentation"],
    normalize: (data, token) =>
      list(obj(data).result)
        .map((opening) => {
          const o = obj(opening);
          const ats = obj(o.atsLocation);
          const place = obj(o.location);
          const location = joinLocation(ats.city, ats.state ?? ats.province, ats.country) || joinLocation(place.city, place.state);
          // BambooHR's location types: "0" on-site, "1" remote, "2" hybrid.
          const type = str(o.locationType);
          const id = str(o.id) ?? (num(o.id) !== null ? String(o.id) : "");
          return {
            id,
            title: str(o.jobOpeningName) ?? "Untitled role",
            location,
            workplace:
              o.isRemote === true || type === "1"
                ? "remote"
                : type === "2"
                  ? "hybrid"
                  : type === "0"
                    ? "onsite"
                    : workplaceFromText(location),
            team: str(o.departmentLabel),
            employmentType: employmentType(o.employmentStatusLabel),
            salary: null,
            pay: null,
            url: id ? `https://${encodeURIComponent(token)}.bamboohr.com/careers/${encodeURIComponent(id)}` : "",
            postedAt: null,
          };
        })
        .filter((role) => role.id),
    detailUrl: (token, id) => `https://${encodeURIComponent(token)}.bamboohr.com/careers/${encodeURIComponent(id)}/detail`,
    normalizeDetail: (data) => {
      const opening = obj(obj(obj(data).result).jobOpening);
      const html = str(opening.description);
      return html ? { html, payText: str(opening.compensation) } : null;
    },
  },

  rippling: {
    label: "Rippling",
    apiUrl: ripplingApi,
    boardUrl: (token) => `https://ats.rippling.com/${encodeURIComponent(token)}/jobs`,
    patterns: [/ats\.rippling\.com\/(?:api\/v2\/board\/)?([a-z0-9-]+)/gi],
    ignoreTokens: ["api", "static", "assets", "embed"],
    load: async (token, get) => {
      const pages = await readPages(get, (page) => `${ripplingApi(token)}&page=${page}`, (data) => list(data.items), 100);
      return pages && { ...pages.first, items: pages.all };
    },
    normalize: (data) =>
      list(obj(data).items)
        .map((job) => {
          const j = obj(job);
          const places = list(j.locations).map(obj);
          const types = places.map((place) => str(place.workplaceType)?.toUpperCase());
          const location = joinLocation(...places.map((place) => place.name));
          return {
            id: str(j.id) ?? "",
            title: str(j.name) ?? "Untitled role",
            location,
            workplace: types.includes("REMOTE")
              ? "remote"
              : types.includes("HYBRID")
                ? "hybrid"
                : types.some((type) => type === "ON_SITE" || type === "ONSITE")
                  ? "onsite"
                  : workplaceFromText(location),
            team: str(obj(j.department).name),
            employmentType: null,
            salary: null,
            pay: null,
            url: str(j.url) ?? "",
            postedAt: null,
          };
        })
        .filter((role) => role.id && role.url),
    // No public endpoint for one posting's description: the page links to the posting instead.
    normalizeDetail: () => null,
  },

  gem: {
    label: "Gem",
    apiUrl: (token) => `https://api.gem.com/job_board/v0/${encodeURIComponent(token)}/job_posts/`,
    boardUrl: (token) => `https://jobs.gem.com/${encodeURIComponent(token)}`,
    patterns: [/jobs\.gem\.com\/([a-z0-9-]+)/gi],
    ignoreTokens: ["api", "static", "assets", "embed"],
    normalize: (data) =>
      list(data)
        .map((post) => {
          const p = obj(post);
          const location = str(obj(p.location).name) ?? joinLocation(...list(p.offices).map((office) => obj(office).name));
          const type = str(p.location_type);
          return {
            id: str(p.id) ?? "",
            title: str(p.title) ?? "Untitled role",
            location,
            workplace:
              type === "remote" ? "remote" : type === "hybrid" ? "hybrid" : type === "in_office" ? "onsite" : workplaceFromText(location),
            team: str(obj(list(p.departments)[0]).name),
            employmentType: employmentType(p.employment_type),
            salary: null,
            pay: null,
            url: str(p.absolute_url) ?? "",
            postedAt: isoDate(p.first_published_at ?? p.created_at),
          } satisfies Role;
        })
        .filter((role) => role.id && role.url),
    // The list carries each post's full description.
    detailFromList: true,
    normalizeDetail: (data, id) => {
      const html = str(obj(list(data).find((post) => str(obj(post).id) === id)).content);
      return html ? { html, payText: null } : null;
    },
  },

  pinpoint: {
    label: "Pinpoint",
    apiUrl: (token) => `https://${encodeURIComponent(token)}.pinpointhq.com/postings.json`,
    boardUrl: (token) => `https://${encodeURIComponent(token)}.pinpointhq.com/`,
    patterns: [/\b([a-z0-9-]+)\.pinpointhq\.com/gi],
    ignoreTokens: ["www", "app", "api", "help", "developers", "support", "status", "cdn"],
    normalize: (data) =>
      list(obj(data).data)
        .map((posting) => {
          const p = obj(posting);
          const where = obj(p.location);
          const location = str(where.name) ?? joinLocation(where.city, where.province);
          const type = str(p.workplace_type);
          const showPay = p.compensation_visible === true;
          return {
            id: str(p.id) ?? "",
            title: str(p.title) ?? "Untitled role",
            location,
            workplace: type === "remote" ? "remote" : type === "hybrid" ? "hybrid" : type === "onsite" ? "onsite" : workplaceFromText(location),
            team: str(obj(obj(p.job).department).name),
            employmentType: employmentType(p.employment_type_text ?? p.employment_type),
            salary: showPay
              ? salaryRange(p.compensation_minimum, p.compensation_maximum, p.compensation_currency, p.compensation_frequency)
              : null,
            pay: showPay
              ? payFrom(p.compensation_minimum, p.compensation_maximum, p.compensation_currency, p.compensation_frequency)
              : null,
            url: str(p.url) ?? "",
            // Pinpoint's public feed has no posting date.
            postedAt: null,
          } satisfies Role;
        })
        .filter((role) => role.id && role.url),
    detailFromList: true,
    normalizeDetail: (data, id) => {
      const p = obj(list(obj(data).data).find((posting) => str(obj(posting).id) === id));
      const html = [
        str(p.description) ?? "",
        section(str(p.key_responsibilities_header) ?? "What you'll do", p.key_responsibilities),
        section(str(p.skills_knowledge_expertise_header) ?? "What you'll bring", p.skills_knowledge_expertise),
        section(str(p.benefits_header) ?? "Benefits", p.benefits),
      ].join("");
      return html ? { html, payText: null } : null;
    },
  },

  workday: {
    label: "Workday",
    apiUrl: (token) => `${workdayBoard(token)?.api ?? ""}/jobs`,
    boardUrl: (token) => workdayBoard(token)?.board ?? "",
    // tenant.wdN.myworkdayjobs.com/[locale/]Site: the token is "tenant.wdN/Site".
    patterns: [/\b([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([A-Za-z0-9_-]+)/gi],
    tokenFrom: (match) =>
      /^(wday|job|jobs|login)$/i.test(match[3]) ? null : `${match[1].toLowerCase()}.${match[2].toLowerCase()}/${match[3]}`,
    load: async (token, get) => {
      const board = workdayBoard(token);
      if (!board) return null;
      const search = (offset: number, limit: number, appliedFacets: Record<string, string[]>) =>
        get(`${board.api}/jobs`, { method: "POST", body: { appliedFacets, limit, offset, searchText: "" } });
      // One job is enough to read the board's filters; then only its remote jobs are requested.
      const first = obj(await search(0, 1, {}));
      if (!Array.isArray(first.jobPostings)) return null;
      const remote = workdayRemoteFacets(first.facets);
      if (!remote) return { jobPostings: [], labels: [] };
      const jobPostings: unknown[] = [];
      for (let page = 0; page < WORKDAY_PAGES; page++) {
        const batch = list(obj(await search(page * WORKDAY_PAGE, WORKDAY_PAGE, remote.applied)).jobPostings);
        jobPostings.push(...batch);
        if (batch.length < WORKDAY_PAGE) break;
      }
      return { jobPostings, labels: remote.labels };
    },
    normalize: (data, token) => {
      const board = workdayBoard(token);
      const labels = list(obj(data).labels).map(str).filter(Boolean);
      return list(obj(data).jobPostings)
        .map((posting) => {
          const p = obj(posting);
          const path = str(p.externalPath) ?? "";
          const where = str(p.locationsText);
          return {
            id: path.split("/").pop() ?? "",
            title: str(p.title) ?? "Untitled role",
            // "3 Locations" says nothing; the remote filter's name ("Remote - National") does.
            location: where && !/^\d+\s+locations?$/i.test(where) ? where : labels.join(", "),
            // Only jobs matching the board's remote filter are requested.
            workplace: "remote" as const,
            team: null,
            employmentType: employmentType(p.timeType),
            salary: null,
            pay: null,
            url: board && path ? `${board.board}${path}` : "",
            postedAt: workdayPostedAt(str(p.postedOn)),
          };
        })
        .filter((role) => role.id && role.url);
    },
    detailUrl: (token, id) => `${workdayBoard(token)?.api ?? ""}/job/x/${encodeURIComponent(id)}`,
    normalizeDetail: (data) => {
      const html = str(obj(obj(data).jobPostingInfo).jobDescription);
      return html ? { html, payText: null } : null;
    },
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** "Greenhouse, Lever, … and Workday", for copy that names where roles come from. */
export function providerNames(last: "and" | "or" = "and") {
  const labels = PROVIDER_IDS.map((id) => PROVIDERS[id].label);
  return `${labels.slice(0, -1).join(", ")} ${last} ${labels.at(-1)}`;
}

/** Every board referenced in a page or URL, in the order found. */
export function detectBoards(text: string): Board[] {
  const found: Board[] = [];
  for (const provider of PROVIDER_IDS) {
    const { patterns, ignoreTokens = [], tokenFrom } = PROVIDERS[provider];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        let token = tokenFrom ? tokenFrom(match) : match[1];
        if (!token) continue;
        try {
          token = decodeURIComponent(token);
        } catch {
          // keep the raw token
        }
        token = token.replace(/[.]+$/, "");
        if (token && !ignoreTokens.includes(token.toLowerCase())) found.push({ provider, token });
      }
    }
  }
  return found;
}

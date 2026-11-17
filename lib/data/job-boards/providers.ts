// Public job-board APIs that list a company's open roles. Each provider knows
// its endpoint, how to spot its board on a careers page, and how to turn its
// response into Roles.
//
// No runtime imports on purpose: scripts/find-job-boards.ts loads this file
// directly with Node's TypeScript support.

export type ProviderId = "greenhouse" | "lever" | "ashby" | "workable" | "recruitee";

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
};

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
  /** Tokens the patterns can match that aren't boards. */
  ignoreTokens?: string[];
  normalize: (data: unknown) => Role[];
  /** Company name reported by the board, used to double-check a match. */
  boardName?: (data: unknown) => string | null;
  /** Where boardName reads from, when it isn't the apiUrl response. */
  nameUrl?: (token: string) => string;
  /** One posting's full details; providers without one read apiUrl's list. */
  detailUrl?: (token: string, id: string) => string;
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
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** Every board referenced in a page or URL, in the order found. */
export function detectBoards(text: string): Board[] {
  const found: Board[] = [];
  for (const provider of PROVIDER_IDS) {
    const { patterns, ignoreTokens = [] } = PROVIDERS[provider];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        let token = match[1];
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

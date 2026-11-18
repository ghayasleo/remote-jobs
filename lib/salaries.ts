import { formatCount, listAnd, type Faq } from "@/lib/faq";
import { JOB_CATEGORIES, JOB_CATEGORY_KEYS, jobPath, type JobCategory } from "@/lib/jobs";

// "Remote tech salaries": what remote job postings that publish an annual
// US-dollar range pay. Only those ranges are comparable; other currencies and
// hourly rates are counted but not mixed in. Pure, so it's easy to test.

export type SalaryRole = {
  company: string;
  companyName: string;
  id: string;
  title: string;
  location: string;
  category: JobCategory;
  min: number | null;
  max: number | null;
};

/** A page or a row needs at least this many ranges to say anything. */
export const MIN_SALARY_ROLES = 5;

// Annual ranges outside this are almost always a monthly or hourly figure labelled as yearly.
const PLAUSIBLE = { low: 15_000, high: 1_000_000 };

export function isPlausibleAnnual(min: number | null, max: number | null) {
  const values = [min, max].filter((value): value is number => value !== null);
  return values.length > 0 && values.every((value) => value >= PLAUSIBLE.low && value <= PLAUSIBLE.high);
}

export type ParsedPay = { min: number | null; max: number | null; currency: string; unit: "HOUR" | "DAY" | "MONTH" | "YEAR" };

// Currency prefixes as job boards write them; order matters ("CA$" before "$").
const CURRENCIES: [RegExp, string][] = [
  [/^(?:CA\$|C\$|CAD)/i, "CAD"],
  [/^(?:A\$|AU\$|AUD)/i, "AUD"],
  [/^(?:NZ\$|NZD)/i, "NZD"],
  [/^(?:US\$|USD|\$)/i, "USD"],
  [/^(?:£|GBP)/i, "GBP"],
  [/^(?:€|EUR)/i, "EUR"],
  [/^([A-Z]{3})/, ""],
];

/**
 * Reads pay from a board's text, like Ashby's "$130K – $290K • Offers Equity",
 * "CA$200K – CA$250K" or "$140 – $160 per hour". Only the part before the
 * first "•" is the range; anything after is perks.
 */
export function parsePayText(text: string | null | undefined): ParsedPay | null {
  if (!text) return null;
  const range = text.split("•")[0].replace(/\u00a0/g, " ").trim();
  let currency = "";
  for (const [pattern, code] of CURRENCIES) {
    const match = range.match(pattern);
    if (match) {
      currency = code || match[1].toUpperCase();
      break;
    }
  }
  if (!currency) return null;
  const amounts = [...range.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*([KkMm])?(?![\d,.])/g)].map(([, digits, suffix]) => {
    const value = Number(digits.replace(/,/g, ""));
    return suffix ? value * (suffix.toLowerCase() === "k" ? 1_000 : 1_000_000) : value;
  });
  if (amounts.length === 0 || amounts.some(Number.isNaN)) return null;
  const unit = /per hour|\/\s*h(?:ou)?r|hourly/i.test(range)
    ? "HOUR"
    : /per day|daily/i.test(range)
      ? "DAY"
      : /per month|monthly|\/\s*mo/i.test(range)
        ? "MONTH"
        : "YEAR";
  const [first, second] = amounts;
  return second === undefined
    ? { min: first, max: first, currency, unit }
    : { min: Math.min(first, second), max: Math.max(first, second), currency, unit };
}

/** A role's annual US-dollar range, from structured pay or its pay text, when it has a believable one. */
export function annualUsd(role: { pay: ParsedPay | null; salary: string | null }) {
  const pay = role.pay ?? parsePayText(role.salary);
  if (!pay || pay.unit !== "YEAR" || pay.currency !== "USD" || !isPlausibleAnnual(pay.min, pay.max)) return null;
  return { min: pay.min, max: pay.max };
}

/** The middle of a range, or its one end when only one is given. */
export const midpoint = ({ min, max }: Pick<SalaryRole, "min" | "max">) =>
  min !== null && max !== null ? (min + max) / 2 : (max ?? min ?? 0);

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

const median = (values: number[]) => quantile([...values].sort((a, b) => a - b), 0.5);

export function salaryStats(roles: SalaryRole[]) {
  const mids = roles.map(midpoint).sort((a, b) => a - b);
  return {
    count: roles.length,
    medianMin: median(roles.map((role) => role.min ?? role.max ?? 0)),
    medianMax: median(roles.map((role) => role.max ?? role.min ?? 0)),
    medianMid: quantile(mids, 0.5),
    p25: quantile(mids, 0.25),
    p75: quantile(mids, 0.75),
  };
}

export type SalaryStats = ReturnType<typeof salaryStats>;

/** Every kind of work with enough ranges, best paid first. */
export function salaryCategories(roles: SalaryRole[]) {
  // "Other" is a catch-all, not a kind of work worth its own salary page.
  return JOB_CATEGORY_KEYS.filter((key) => key !== "other").map((key) => ({ key, label: JOB_CATEGORIES[key], ...salaryStats(roles.filter((role) => role.category === key)) }))
    .filter((category) => category.count >= MIN_SALARY_ROLES)
    .sort((a, b) => b.medianMid - a.medianMid);
}

/** Highest top of range first. */
export const byPay = (a: SalaryRole, b: SalaryRole) => (b.max ?? b.min ?? 0) - (a.max ?? a.min ?? 0);

/** Range midpoints in $25k steps, for the distribution chart. */
export function salaryBuckets(roles: SalaryRole[], step = 25_000) {
  const counts = new Map<number, number>();
  for (const role of roles) {
    const from = Math.floor(midpoint(role) / step) * step;
    counts.set(from, (counts.get(from) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => a[0] - b[0])
    .map(([from, count]) => ({ label: `${usd(from)}–${usd(from + step)}`, count }));
}

const usdFormat = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 });
export const usd = (value: number) => usdFormat.format(Math.round(value / 1000) * 1000);
export const usdRange = ({ min, max }: Pick<SalaryRole, "min" | "max">) =>
  min !== null && max !== null && min !== max ? `${usd(min)}–${usd(max)}` : usd(max ?? min ?? 0);

export const salaryPath = (category?: JobCategory) => (category ? `/salaries/${category}` : "/salaries");
export const salaryRolePath = (role: SalaryRole) => jobPath({ company: role.company, id: role.id, title: role.title });

/** Questions the salary pages answer, from their own numbers. */
export function salaryFaqs({
  label,
  stats,
  top,
  categories,
  published,
  remoteRoles,
  asOf,
}: {
  /** "engineering", or null for all remote roles. */
  label: string | null;
  stats: SalaryStats;
  top: SalaryRole[];
  categories?: { label: string; medianMid: number }[];
  /** Remote roles that show any pay, and all remote roles (overview only). */
  published?: number;
  remoteRoles?: number;
  asOf: string;
}): Faq[] {
  const what = label ? `remote ${label.toLowerCase()} jobs` : "remote tech jobs";
  const faqs: Faq[] = [
    {
      question: `How much do ${what} pay?`,
      answer: `The median range is ${usd(stats.medianMin)}–${usd(stats.medianMax)} a year, from ${formatCount(stats.count)} postings with an annual US-dollar range on ${asOf}. Half of them have a midpoint between ${usd(stats.p25)} and ${usd(stats.p75)}.`,
    },
  ];
  if (top.length >= 3) {
    faqs.push({
      question: `Which ${what} pay the most right now?`,
      answer: `${listAnd(top.slice(0, 3).map((role) => `${role.title} at ${role.companyName} (${usdRange(role)})`))} have the highest published ranges.`,
    });
  }
  if (categories && categories.length >= 2) {
    faqs.push({
      question: "Which kind of remote work pays best?",
      answer: `${categories[0].label} has the highest median midpoint (${usd(categories[0].medianMid)}), and ${categories.at(-1)!.label} the lowest (${usd(categories.at(-1)!.medianMid)}), among kinds of work with at least ${MIN_SALARY_ROLES} published ranges.`,
    });
  }
  if (published !== undefined && remoteRoles) {
    faqs.push({
      question: "How many remote job postings show the salary?",
      answer: `${formatCount(published)} of ${formatCount(remoteRoles)} (${Math.round((published / remoteRoles) * 100)}%). Many companies publish pay only where the law asks them to, so the ranges here lean towards roles open to people in the US.`,
    });
  }
  return faqs;
}

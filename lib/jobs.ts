// Remote roles across every company with a readable job board: the Jobs feed,
// role pages and their Google Jobs markup. Pure functions, shared by server
// and browser.

export type JobListing = {
  id: string;
  /** Company slug. */
  company: string;
  companyName: string;
  domain: string | null;
  title: string;
  location: string;
  team: string | null;
  employmentType: string | null;
  salary: string | null;
  postedAt: string | null;
  category: JobCategory;
};

export const JOB_CATEGORIES = {
  engineering: "Engineering",
  data: "Data & AI",
  design: "Design",
  product: "Product",
  marketing: "Marketing",
  sales: "Sales",
  support: "Customer success & support",
  operations: "Operations & people",
  other: "Other",
} as const;
export type JobCategory = keyof typeof JOB_CATEGORIES;
export const JOB_CATEGORY_KEYS = Object.keys(JOB_CATEGORIES) as JobCategory[];

// First match wins, so more specific families come before "engineering".
const CATEGORY_RULES: [JobCategory, RegExp][] = [
  ["data", /\b(data|machine learning|ml|ai|scientist|analytics|research scientist)\b/i],
  ["design", /\b(design|designer|ux|ui|illustrat|brand)/i],
  ["sales", /\b(sales|account executive|business development|sdr|bdr|account manager|partnerships?)\b/i],
  ["support", /\b(support|customer success|customer experience|solutions|implementation|onboarding|technical account)\b/i],
  ["engineering", /\b(engineer|engineering|developer|devops|sre|architect|programmer|software|security|infrastructure|platform|qa|frontend|backend|full[- ]?stack|ios|android|technical lead)\b/i],
  ["product", /\b(product|program manager|project manager|technical writer)\b/i],
  ["marketing", /\b(marketing|growth|content|seo|social media|communications|community|copywriter|events?)\b/i],
  ["operations", /\b(recruit\w*|talent|people|hr|finance|legal|operations|accountant|counsel|payroll|office|assistant|controller|procurement)\b/i],
];

export function jobCategory(title: string, team: string | null): JobCategory {
  for (const text of [title, team ?? ""]) {
    for (const [category, pattern] of CATEGORY_RULES) if (pattern.test(text)) return category;
  }
  return "other";
}

// Talent pools and "general application" postings aren't jobs: no page, no Google Jobs markup.
const PLACEHOLDER =
  /talent (community|pool|network|pipeline)|general application|open application|spontaneous application|don['’]?t see|future (opportunit|opening|role)|expression of interest|not seeing (a|the) role/i;

export const isPlaceholderRole = (title: string) => PLACEHOLDER.test(title);

const SLUG_MAX = 80;

/** The readable part of a role's address: "Senior Backend Engineer (US)" → "senior-backend-engineer-us". */
export function jobSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) return "role";
  if (slug.length <= SLUG_MAX) return slug;
  // Cut at a word boundary.
  const cut = slug.slice(0, SLUG_MAX + 1);
  const end = cut.lastIndexOf("-");
  return (end > SLUG_MAX / 2 ? cut.slice(0, end) : cut.slice(0, SLUG_MAX)).replace(/-$/, "");
}

/**
 * A role's page: /jobs/{company}/{id}/{title-slug}. The id finds the role; the
 * slug is for people and search results, so a missing or stale one redirects.
 */
export const jobPath = (job: Pick<JobListing, "company" | "id" | "title">) =>
  `/jobs/${job.company}/${encodeURIComponent(job.id)}/${jobSlug(job.title)}`;

/* ---------- feed filters (kept in the URL) ---------- */

export const POSTED_WITHIN = { "1d": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
export type PostedWithin = keyof typeof POSTED_WITHIN | "";
const POSTED_DAYS: Record<Exclude<PostedWithin, "">, number> = { "1d": 1, "7d": 7, "30d": 30 };

export const JOB_SORTS = { newest: "Newest", company: "Company A–Z" } as const;
export type JobSort = keyof typeof JOB_SORTS;

export type JobParams = { q: string; category: JobCategory[]; posted: PostedWithin; sort: JobSort };
export const DEFAULT_JOB_PARAMS: JobParams = { q: "", category: [], posted: "", sort: "newest" };

export function parseJobParams(query: string): JobParams {
  const search = new URLSearchParams(query);
  const categories = (search.get("category") ?? "").split(",");
  const posted = search.get("posted") ?? "";
  const sort = search.get("sort") ?? "";
  return {
    q: (search.get("q") ?? "").slice(0, 100),
    category: JOB_CATEGORY_KEYS.filter((key) => categories.includes(key)),
    posted: posted in POSTED_WITHIN ? (posted as PostedWithin) : "",
    sort: sort in JOB_SORTS ? (sort as JobSort) : "newest",
  };
}

export function serializeJobParams(params: JobParams): string {
  const search = new URLSearchParams();
  if (params.q.trim()) search.set("q", params.q.trim());
  if (params.category.length) search.set("category", params.category.join(","));
  if (params.posted) search.set("posted", params.posted);
  if (params.sort !== "newest") search.set("sort", params.sort);
  const query = search.toString().replaceAll("%2C", ",");
  return query ? `?${query}` : "";
}

const haystacks = new WeakMap<JobListing, string>();
const haystack = (job: JobListing) => {
  let text = haystacks.get(job);
  if (text === undefined) {
    text = [job.title, job.companyName, job.location, job.team ?? "", JOB_CATEGORIES[job.category]].join(" ").toLowerCase();
    haystacks.set(job, text);
  }
  return text;
};

export function filterJobs(jobs: JobListing[], params: JobParams, now: number): JobListing[] {
  const words = params.q.toLowerCase().split(/\s+/).filter(Boolean);
  const since = params.posted ? new Date(now - POSTED_DAYS[params.posted] * 86_400_000).toISOString() : null;
  const matches = jobs.filter(
    (job) =>
      words.every((word) => haystack(job).includes(word)) &&
      (params.category.length === 0 || params.category.includes(job.category)) &&
      (!since || (job.postedAt !== null && job.postedAt >= since)),
  );
  const byCompany = (a: JobListing, b: JobListing) =>
    a.companyName.localeCompare(b.companyName, "en", { sensitivity: "base" }) || a.title.localeCompare(b.title);
  const byNewest = (a: JobListing, b: JobListing) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "") || byCompany(a, b);
  return matches.sort(params.sort === "company" ? byCompany : byNewest);
}

/* ---------- Google Jobs (schema.org JobPosting) ---------- */

const EMPLOYMENT_TYPES: Record<string, string> = {
  "full-time": "FULL_TIME",
  "full-time, fixed term": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  freelance: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

export const schemaEmploymentType = (type: string | null) =>
  (type && EMPLOYMENT_TYPES[type.toLowerCase()]) || undefined;

// Countries named in role locations ("Remote - US or Canada", "Remote (UK)").
const COUNTRIES: [string, RegExp][] = [
  ["United States", /\b(us|usa|u\.s\.a?\.?|united states|america)\b(?! dollars)/i],
  ["Canada", /\bcanada\b/i],
  ["United Kingdom", /\b(uk|u\.k\.|united kingdom|england|britain|scotland)\b/i],
  ["Ireland", /\bireland\b/i],
  ["Germany", /\bgermany\b/i],
  ["France", /\bfrance\b/i],
  ["Spain", /\bspain\b/i],
  ["Portugal", /\bportugal\b/i],
  ["Netherlands", /\b(netherlands|holland)\b/i],
  ["Belgium", /\bbelgium\b/i],
  ["Italy", /\bitaly\b/i],
  ["Poland", /\bpoland\b/i],
  ["Romania", /\bromania\b/i],
  ["Sweden", /\bsweden\b/i],
  ["Denmark", /\bdenmark\b/i],
  ["Norway", /\bnorway\b/i],
  ["Finland", /\bfinland\b/i],
  ["Switzerland", /\bswitzerland\b/i],
  ["Austria", /\baustria\b/i],
  ["Czechia", /\b(czechia|czech republic)\b/i],
  ["Greece", /\bgreece\b/i],
  ["Ukraine", /\bukraine\b/i],
  ["Israel", /\bisrael\b/i],
  ["India", /\bindia\b/i],
  ["Japan", /\bjapan\b/i],
  ["Singapore", /\bsingapore\b/i],
  ["Australia", /\baustralia\b/i],
  ["New Zealand", /\bnew zealand\b/i],
  ["Philippines", /\bphilippines\b/i],
  ["Brazil", /\bbrazil\b/i],
  ["Mexico", /\bmexico\b/i],
  ["Argentina", /\bargentina\b/i],
  ["Colombia", /\bcolombia\b/i],
  ["Chile", /\bchile\b/i],
  ["South Africa", /\bsouth africa\b/i],
];

/** Countries a remote role is open to, when its location names any. */
export function locationCountries(location: string): string[] {
  return COUNTRIES.filter(([, pattern]) => pattern.test(location)).map(([name]) => name);
}

// Remote roles across every company with a readable job board: the Jobs feed,
// role pages and their Google Jobs markup. Pure functions, shared by server
// and browser.

import { COMPANY_SIZES, REMOTE_POLICIES, TECHS, type CompanySize, type RemotePolicy, type Tech } from "./data/labels";

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
  /** Every location the role is open in, when the company posted it once per location; `location` is the first. */
  locations?: string[];
  /** The other ids folded into this listing (reposts and other locations), so they still count as open. */
  mergedIds?: string[];
  // From the company's profile, for the company filters. Optional: a copy of
  // the list cached before these existed simply doesn't match them.
  companyPolicy?: string | null;
  /** Where the company hires (remoteintech's region), for "where I live". */
  companyRegion?: string | null;
  companySize?: string | null;
  companyStack?: string[];
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
// Includes the German, French, Spanish and Dutch names some boards (Personio) use.
const PLACEHOLDER =
  /talent (community|pool|network|pipeline)|general application|open application|spontaneous application|don['’]?t see|future (opportunit|opening|role)|expression of interest|not seeing (a|the) role|initiativbewerbung|blindbewerbung|candidature spontan[ée]e|candidatura espont[aá]nea|candidatura spontanea|open sollicitatie/i;
// Boards also carry test and demo postings ("Test", "Demo job") and "Contact us" stand-ins.
// Anchored, so "QA Test Engineer" and "Demo Engineer" stay jobs.
const NOT_A_JOB = /^\s*(test|testing|demo|dummy|sample|contact us)(\s+(job|posting|position|role|opening|vacancy|ad))?\s*\d*\s*$/i;
const DO_NOT_APPLY = /\b(do not apply|don['’]t apply|this is a test|test (job|posting|position|vacancy))\b/i;

export const isPlaceholderRole = (title: string) =>
  PLACEHOLDER.test(title) || NOT_A_JOB.test(title) || DO_NOT_APPLY.test(title);

/** Every location a listing is open in. */
export const jobLocations = (job: Pick<JobListing, "location" | "locations">) =>
  job.locations?.length ? job.locations : [job.location];

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

/* ---------- where a role can be done from ---------- */

export const JOB_REGIONS = {
  anywhere: "Anywhere",
  "us-canada": "US & Canada",
  "latin-america": "Latin America",
  europe: "Europe",
  "middle-east-africa": "Middle East & Africa",
  "asia-pacific": "Asia Pacific",
} as const;
export type JobRegion = keyof typeof JOB_REGIONS;
export const JOB_REGION_KEYS = Object.keys(JOB_REGIONS) as JobRegion[];

const words = (list: string) => new RegExp(`(?:^|[^a-z])(?:${list})(?![a-z])`, "i");

// Boards write locations as free text ("Remote - US", "EMEA Remote",
// "Foster City, CA", "Remote, Canada; Remote, Poland"), so each region is a
// list of the words that put a role there. A role can be in several.
const REGION_WORDS: [JobRegion, RegExp][] = [
  ["anywhere", words("anywhere|worldwide|global|globally|any location|any country|any time ?zone|fully distributed|international")],
  [
    "us-canada",
    words(
      [
        "us|usa|u\\.s\\.a?\\.?|united[- ]states|north america|namer|amer|americas|canada|canadian|west coast|east coast",
        "eastern time|pacific time|central time|mountain time|pst|pdt|est|edt|cst|cdt",
        "san francisco|bay area|silicon valley|new york|nyc|seattle|austin|boston|chicago|los angeles|denver|atlanta|miami|montr[eé]al",
        "washington|portland|san diego|san jose|palo alto|mountain view|sunnyvale|foster city|menlo park|philadelphia",
        "dallas|houston|phoenix|raleigh|salt lake|pittsburgh|minneapolis|detroit|nashville|toronto|vancouver|montreal",
        "ottawa|calgary|waterloo|california|texas|florida|colorado|massachusetts|illinois|oregon|utah|arizona|virginia",
        "north carolina|ontario|british columbia|quebec|alabama|alaska|arkansas|connecticut|delaware|hawaii|idaho",
        "indiana|iowa|kansas|kentucky|louisiana|maine|maryland|michigan|minnesota|mississippi|missouri|montana",
        "nebraska|nevada|new hampshire|new jersey|new mexico|north dakota|ohio|oklahoma|pennsylvania|rhode island",
        "south carolina|south dakota|tennessee|vermont|west virginia|wisconsin|wyoming",
      ].join("|"),
    ),
  ],
  [
    "latin-america",
    words(
      [
        "latam|latin america|south america|central america|amer|americas|brazil|brasil|mexico|méxico|argentina",
        "colombia|chile|peru|uruguay|costa rica|guatemala|ecuador|bolivia|paraguay|venezuela|dominican republic",
        "são paulo|sao paulo|buenos aires|bogot[aá]|mexico city|medell[ií]n|santiago|lima|montevideo",
      ].join("|"),
    ),
  ],
  [
    "europe",
    words(
      [
        "europe|european|emea|eu|eea|cet|cest|uk|u\\.k\\.|united[- ]kingdom|great britain|britain|england|scotland|wales",
        "ireland|germany|deutschland|france|spain|portugal|netherlands|holland|belgium|luxembourg|italy|poland",
        "romania|bulgaria|greece|croatia|serbia|slovenia|slovakia|czechia|czech republic|hungary|austria|switzerland",
        "sweden|denmark|norway|finland|iceland|estonia|latvia|lithuania|ukraine|moldova|cyprus|malta|albania|turkey",
        "london|manchester|edinburgh|berlin|munich|hamburg|paris|amsterdam|rotterdam|lisbon|porto|madrid|barcelona",
        "dublin|warsaw|krak[oó]w|prague|vienna|z[uü]rich|stockholm|copenhagen|oslo|helsinki|brussels|bucharest",
        "budapest|athens|milan|rome|tallinn|riga|vilnius|kyiv|kiev|belgrade|sofia|zagreb|istanbul|belarus|minsk",
        "armenia|yerevan|tbilisi|montenegro|podgorica",
      ].join("|"),
    ),
  ],
  [
    "middle-east-africa",
    words(
      [
        "emea|mena|middle east|africa|israel|tel aviv|uae|united arab emirates|dubai|abu dhabi|saudi arabia|riyadh",
        "qatar|doha|egypt|cairo|south africa|cape town|johannesburg|nigeria|lagos|kenya|nairobi|ghana|morocco|tunisia",
        "jordan|lebanon|ksa",
      ].join("|"),
    ),
  ],
  [
    "asia-pacific",
    words(
      [
        "apac|apj|anz|asia|asia[- ]pacific|oceania|india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai",
        "japan|tokyo|singapore|australia|sydney|melbourne|brisbane|perth|new zealand|auckland|philippines|manila",
        "korea|seoul|indonesia|jakarta|vietnam|malaysia|kuala lumpur|thailand|bangkok|hong kong|taiwan|taipei|china",
        "shanghai|beijing|pakistan|karachi|lahore|islamabad|sri lanka|bangladesh|nepal",
      ].join("|"),
    ),
  ],
];

// "Remote, BR", "Remote, MX": Latin American country codes after a comma.
const LATAM_CODE = /,\s*(BR|MX)\b/;

// "Foster City, CA", "Toronto, ON": a US state or Canadian province code after a comma.
const STATE_CODE =
  /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|ON|BC|QC|AB)\b/;

/** The regions a role's location names. Empty when it only says "Remote". */
export function jobRegions(location: string): JobRegion[] {
  const regions = REGION_WORDS.filter(([, pattern]) => pattern.test(location)).map(([region]) => region);
  if (!regions.includes("us-canada") && STATE_CODE.test(location)) regions.push("us-canada");
  if (!regions.includes("latin-america") && LATAM_CODE.test(location)) regions.push("latin-america");
  // "Anywhere in the US" is the US: anywhere only counts when no region is named.
  const named: JobRegion[] = regions.filter((region) => region !== "anywhere");
  return named.length ? JOB_REGION_KEYS.filter((region) => named.includes(region)) : regions;
}

const regionCache = new WeakMap<JobListing, JobRegion[]>();
function regionsOf(job: JobListing) {
  let regions = regionCache.get(job);
  if (!regions) {
    const named = new Set(jobLocations(job).flatMap(jobRegions));
    regions = JOB_REGION_KEYS.filter((region) => named.has(region));
    regionCache.set(job, regions);
  }
  return regions;
}

/* ---------- feed filters (kept in the URL) ---------- */

export const POSTED_WITHIN = { "1d": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
export type PostedWithin = keyof typeof POSTED_WITHIN | "";
const POSTED_DAYS: Record<Exclude<PostedWithin, "">, number> = { "1d": 1, "7d": 7, "30d": 30 };

export const JOB_SORTS = { newest: "Newest", company: "Company A–Z" } as const;
export type JobSort = keyof typeof JOB_SORTS;

export type JobParams = {
  q: string;
  category: JobCategory[];
  /** Where the role can be done from. */
  where: JobRegion[];
  posted: PostedWithin;
  /** The country the person lives in (a slug), for roles open to them there. */
  country: string;
  /** Only roles that publish pay. */
  pay: boolean;
  /** The company's remote policy, size and stack. */
  policy: RemotePolicy[];
  size: CompanySize[];
  stack: Tech[];
  sort: JobSort;
};
export const DEFAULT_JOB_PARAMS: JobParams = {
  q: "",
  category: [],
  where: [],
  posted: "",
  country: "",
  pay: false,
  policy: [],
  size: [],
  stack: [],
  sort: "newest",
};

/** List filters, in URL order. Values are kept in their canonical order. */
const LIST_PARAMS = {
  category: JOB_CATEGORY_KEYS,
  where: JOB_REGION_KEYS,
  policy: REMOTE_POLICIES,
  size: COMPANY_SIZES,
  stack: TECHS,
} as const;
export type JobListParam = keyof typeof LIST_PARAMS;

export function parseJobParams(query: string): JobParams {
  const search = new URLSearchParams(query);
  const list = <K extends JobListParam>(key: K) => {
    const values = (search.get(key) ?? "").split(",");
    return (LIST_PARAMS[key] as readonly string[]).filter((value) => values.includes(value)) as JobParams[K];
  };
  const posted = search.get("posted") ?? "";
  const sort = search.get("sort") ?? "";
  return {
    q: (search.get("q") ?? "").slice(0, 100),
    category: list("category"),
    where: list("where"),
    posted: posted in POSTED_WITHIN ? (posted as PostedWithin) : "",
    country: countryFromSlug(search.get("country") ?? "") ? search.get("country")! : "",
    pay: search.get("pay") === "true",
    policy: list("policy"),
    size: list("size"),
    stack: list("stack"),
    sort: sort in JOB_SORTS ? (sort as JobSort) : "newest",
  };
}

export function serializeJobParams(params: JobParams): string {
  const search = new URLSearchParams();
  if (params.q.trim()) search.set("q", params.q.trim());
  for (const key of ["category", "where"] as const) if (params[key].length) search.set(key, params[key].join(","));
  if (params.country) search.set("country", params.country);
  if (params.posted) search.set("posted", params.posted);
  if (params.pay) search.set("pay", "true");
  for (const key of ["policy", "size", "stack"] as const) if (params[key].length) search.set(key, params[key].join(","));
  if (params.sort !== "newest") search.set("sort", params.sort);
  const query = search.toString().replaceAll("%2C", ",");
  return query ? `?${query}` : "";
}

/** How many filters are on, search aside: the badge on the Filters button. */
export const activeJobFilterCount = (params: JobParams) =>
  params.category.length +
  params.where.length +
  Number(Boolean(params.country)) +
  Number(Boolean(params.posted)) +
  Number(params.pay) +
  params.policy.length +
  params.size.length +
  params.stack.length;

const haystacks = new WeakMap<JobListing, string>();
const haystack = (job: JobListing) => {
  let text = haystacks.get(job);
  if (text === undefined) {
    text = [job.title, job.companyName, ...jobLocations(job), job.team ?? "", JOB_CATEGORIES[job.category]].join(" ").toLowerCase();
    haystacks.set(job, text);
  }
  return text;
};

export function filterJobs(jobs: JobListing[], params: JobParams, now: number): JobListing[] {
  const queryWords = params.q.toLowerCase().split(/\s+/).filter(Boolean);
  const since = params.posted ? new Date(now - POSTED_DAYS[params.posted] * 86_400_000).toISOString() : null;
  const country = params.country ? countryFromSlug(params.country) : null;
  const matches = jobs.filter(
    (job) =>
      queryWords.every((word) => haystack(job).includes(word)) &&
      (params.category.length === 0 || params.category.includes(job.category)) &&
      // A role open anywhere counts for every region.
      (params.where.length === 0 ||
        regionsOf(job).some((region) => region === "anywhere" || params.where.includes(region))) &&
      (!country || countryMatch(job, country, job.companyRegion) !== null) &&
      (!since || (job.postedAt !== null && job.postedAt >= since)) &&
      (!params.pay || job.salary !== null) &&
      (params.policy.length === 0 || (params.policy as string[]).includes(job.companyPolicy ?? "")) &&
      (params.size.length === 0 || (params.size as string[]).includes(job.companySize ?? "")) &&
      (params.stack.length === 0 || params.stack.some((tech) => job.companyStack?.includes(tech))),
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

// Countries a role's location can name, with the region each belongs to.
// Locations are free text ("Remote - US or Canada", "Remote (UK)", "Foster City, CA").
const C = (name: string, pattern: RegExp, region: Exclude<JobRegion, "anywhere">) => ({ name, pattern, region });
const COUNTRY_TABLE = [
  C("United States", /\b(us|usa|u\.s\.a?\.?|united[- ]states)\b(?! dollars)/i, "us-canada"),
  C("Canada", /\bcanada\b/i, "us-canada"),
  C("Mexico", /(?<!new )\bm[eé]xico\b/i, "latin-america"),
  C("Brazil", /\bbra[sz]il\b/i, "latin-america"),
  C("Argentina", /\bargentina\b/i, "latin-america"),
  C("Colombia", /\bcolombia\b/i, "latin-america"),
  C("Chile", /\bchile\b/i, "latin-america"),
  C("Peru", /\bperu\b/i, "latin-america"),
  C("Uruguay", /\buruguay\b/i, "latin-america"),
  C("Costa Rica", /\bcosta rica\b/i, "latin-america"),
  C("Ecuador", /\becuador\b/i, "latin-america"),
  C("Guatemala", /\bguatemala\b/i, "latin-america"),
  C("Dominican Republic", /\bdominican republic\b/i, "latin-america"),
  C("United Kingdom", /\b(uk|u\.k\.|united[- ]kingdom|england|britain|scotland|(?<!south )wales)\b/i, "europe"),
  C("Ireland", /\bireland\b/i, "europe"),
  C("Germany", /\b(germany|deutschland)\b/i, "europe"),
  C("France", /\bfrance\b/i, "europe"),
  C("Spain", /\bspain\b/i, "europe"),
  C("Portugal", /\bportugal\b/i, "europe"),
  C("Netherlands", /\b(netherlands|holland)\b/i, "europe"),
  C("Belgium", /\bbelgium\b/i, "europe"),
  C("Luxembourg", /\bluxembourg\b/i, "europe"),
  C("Italy", /\bitaly\b/i, "europe"),
  C("Switzerland", /\bswitzerland\b/i, "europe"),
  C("Austria", /\baustria\b/i, "europe"),
  C("Poland", /\bpoland\b/i, "europe"),
  C("Czechia", /\b(czechia|czech republic)\b/i, "europe"),
  C("Slovakia", /\bslovakia\b/i, "europe"),
  C("Hungary", /\bhungary\b/i, "europe"),
  C("Romania", /\bromania\b/i, "europe"),
  C("Bulgaria", /\bbulgaria\b/i, "europe"),
  C("Greece", /\bgreece\b/i, "europe"),
  C("Croatia", /\bcroatia\b/i, "europe"),
  C("Slovenia", /\bslovenia\b/i, "europe"),
  C("Serbia", /\bserbia\b/i, "europe"),
  C("Montenegro", /\bmontenegro\b/i, "europe"),
  C("Sweden", /\bsweden\b/i, "europe"),
  C("Denmark", /\bdenmark\b/i, "europe"),
  C("Norway", /\bnorway\b/i, "europe"),
  C("Finland", /\bfinland\b/i, "europe"),
  C("Iceland", /\biceland\b/i, "europe"),
  C("Estonia", /\bestonia\b/i, "europe"),
  C("Latvia", /\blatvia\b/i, "europe"),
  C("Lithuania", /\blithuania\b/i, "europe"),
  C("Ukraine", /\bukraine\b/i, "europe"),
  C("Moldova", /\bmoldova\b/i, "europe"),
  C("Armenia", /\barmenia\b/i, "europe"),
  C("Cyprus", /\bcyprus\b/i, "europe"),
  C("Malta", /\bmalta\b/i, "europe"),
  C("Turkey", /\b(turkey|t[uü]rkiye)\b/i, "europe"),
  C("Israel", /\bisrael\b/i, "middle-east-africa"),
  C("United Arab Emirates", /\b(uae|united arab emirates|dubai|abu dhabi)\b/i, "middle-east-africa"),
  C("Saudi Arabia", /\b(saudi arabia|ksa)\b/i, "middle-east-africa"),
  C("Qatar", /\bqatar\b/i, "middle-east-africa"),
  C("Egypt", /\begypt\b/i, "middle-east-africa"),
  C("South Africa", /\bsouth africa\b/i, "middle-east-africa"),
  C("Nigeria", /\bnigeria\b/i, "middle-east-africa"),
  C("Kenya", /\bkenya\b/i, "middle-east-africa"),
  C("Ghana", /\bghana\b/i, "middle-east-africa"),
  C("Morocco", /\bmorocco\b/i, "middle-east-africa"),
  C("India", /\bindia\b/i, "asia-pacific"),
  C("Pakistan", /\bpakistan\b/i, "asia-pacific"),
  C("Bangladesh", /\bbangladesh\b/i, "asia-pacific"),
  C("Sri Lanka", /\bsri lanka\b/i, "asia-pacific"),
  C("Japan", /\bjapan\b/i, "asia-pacific"),
  C("South Korea", /\b(south korea|korea)\b/i, "asia-pacific"),
  C("China", /\bchina\b/i, "asia-pacific"),
  C("Hong Kong", /\bhong kong\b/i, "asia-pacific"),
  C("Taiwan", /\btaiwan\b/i, "asia-pacific"),
  C("Singapore", /\bsingapore\b/i, "asia-pacific"),
  C("Malaysia", /\bmalaysia\b/i, "asia-pacific"),
  C("Indonesia", /\bindonesia\b/i, "asia-pacific"),
  C("Thailand", /\bthailand\b/i, "asia-pacific"),
  C("Vietnam", /\bviet ?nam\b/i, "asia-pacific"),
  C("Philippines", /\bphilippines\b/i, "asia-pacific"),
  C("Australia", /\baustralia\b/i, "asia-pacific"),
  C("New Zealand", /\bnew zealand\b/i, "asia-pacific"),
];

/** Every country a location can name, with its region, in display order. */
export const COUNTRY_LIST = COUNTRY_TABLE.map(({ name, region }) => ({ name, region }));

export const countrySlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const COUNTRY_SLUGS = new Map(COUNTRY_LIST.map((country) => [countrySlug(country.name), country]));
/** A country from its slug ("united-kingdom"), or null. */
export const countryFromSlug = (slug: string) => COUNTRY_SLUGS.get(slug) ?? null;

/**
 * How a role is open to someone living in a country: its location names the
 * country, names the country's region but no country ("EMEA"), or is open
 * worldwide ("Anywhere", or plainly "Remote" at a company that hires
 * worldwide). null when it isn't open to them, e.g. it names other countries.
 */
export function countryMatch(
  job: Pick<JobListing, "location" | "locations">,
  country: { name: string; region: Exclude<JobRegion, "anywhere"> },
  companyRegion?: string | null,
): "named" | "regional" | "worldwide" | null {
  // A role posted for several locations is open wherever any of them is; the closest match wins.
  const matches = jobLocations(job).map((location) => locationMatch(location, country, companyRegion));
  return (["named", "regional", "worldwide"] as const).find((match) => matches.includes(match)) ?? null;
}

function locationMatch(
  location: string,
  country: { name: string; region: Exclude<JobRegion, "anywhere"> },
  companyRegion?: string | null,
): "named" | "regional" | "worldwide" | null {
  const names = locationCountries(location);
  if (names.length > 0) return names.includes(country.name) ? "named" : null;
  const regions = jobRegions(location);
  if (regions.includes(country.region)) return "regional";
  if (regions.includes("anywhere") || (regions.length === 0 && companyRegion === "worldwide")) return "worldwide";
  return null;
}

// Places that name a country without saying it: US states, cities and time
// zones ("Foster City, CA", "Remote - EST"), Canadian provinces and cities,
// and country codes after a comma ("Remote, BR").
const CANADA_HINT = /,\s*(ON|BC|QC|AB)\b|\b(toronto|vancouver|montr[eé]al|ottawa|calgary|waterloo|ontario|british columbia|quebec)\b/i;
const NORTH_AMERICA = /\b(north america|namer|amer|americas)\b/i;
const CODES: [RegExp, string][] = [
  [/,\s*BR\b/, "Brazil"],
  [/,\s*MX\b/, "Mexico"],
];

/** Countries a remote role is open to, when its location names any. */
export function locationCountries(location: string): string[] {
  const named = new Set(COUNTRY_TABLE.filter(({ pattern }) => pattern.test(location)).map(({ name }) => name));
  for (const [pattern, name] of CODES) if (pattern.test(location)) named.add(name);
  // A US or Canadian place without the country's name ("Foster City, CA",
  // "Toronto"). "North America" and "AMER" are regions, not a place.
  const usOrCanada = !named.has("United States") && !named.has("Canada") && !NORTH_AMERICA.test(location);
  if (usOrCanada && jobRegions(location).includes("us-canada")) {
    named.add(CANADA_HINT.test(location) ? "Canada" : "United States");
  }
  return COUNTRY_TABLE.map(({ name }) => name).filter((name) => named.has(name));
}

/**
 * The countries Google Jobs should show a remote role to: the ones its
 * location names, else every country in the regions it names ("EMEA",
 * "APAC"). Empty when it only says "Remote" or "Anywhere": Google needs at
 * least one country and has no "worldwide", so such roles get no markup.
 */
export function applicantCountries(location: string): string[] {
  const named = locationCountries(location);
  if (named.length) return named;
  const regions = jobRegions(location);
  return COUNTRY_TABLE.filter(({ region }) => regions.includes(region)).map(({ name }) => name);
}

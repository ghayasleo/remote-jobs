// Company news: what each item is about, read from its headline. Pure, so
// it's easy to test.

export const NEWS_TAGS = {
  layoffs: "Layoffs",
  funding: "Funding",
  hiring: "Hiring",
  acquisition: "Acquisition",
  remote: "Remote policy",
  ipo: "IPO",
} as const;
export type NewsTag = keyof typeof NEWS_TAGS;

const PATTERNS: [NewsTag, RegExp][] = [
  ["layoffs", /\b(lay ?offs?|lays off|laid off|laying off|job cuts|cuts? (?:\d+ |its )?(?:jobs|roles|staff|workforce|employees)|reduction in force|downsiz|restructur)/i],
  ["funding", /\b(raises?|raised|funding|series [a-f]\b|seed round|valuation|unicorn)\b/i],
  ["hiring", /\b(we'?re hiring|is hiring|hiring|hires|join (?:us|our team)|open roles)\b/i],
  ["acquisition", /\b(acquires?|acquired|acquisition|merg(?:es|er|ing)|to buy|buys)\b/i],
  ["remote", /\b(remote[- ](?:first|work|policy)|return[- ]to[- ](?:the[- ])?office|\brto\b|hybrid work|in-office|fully distributed|work from home)/i],
  ["ipo", /\b(ipo|goes public|going public|public listing|direct listing)\b/i],
];

/** The topics a headline is about, in a fixed order. */
export function newsTags(title: string): NewsTag[] {
  return PATTERNS.filter(([, pattern]) => pattern.test(title)).map(([tag]) => tag);
}

/**
 * Whether a company name is distinctive enough to search headlines for:
 * "Coinbase" or "Help Scout" are, "Stripe" or "Buffer" (everyday words) aren't.
 * Those are still found through links to their own site.
 */
export function distinctiveName(name: string) {
  return /[\s\d.&]/.test(name.trim()) || /[a-z][A-Z]/.test(name) || name.trim().length >= 8;
}

/** Whether a headline names the company as a whole word. */
export function mentions(title: string, name: string) {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "iu").test(title);
}

// Sites where the bare domain hosts other people's content (repos, blogs,
// videos): only the company's own subdomains count there.
const PLATFORMS = new Set([
  "github.com", "gitlab.com", "bitbucket.org", "medium.com", "substack.com", "wordpress.com", "blogspot.com",
  "notion.so", "notion.site", "youtube.com", "x.com", "twitter.com", "linkedin.com", "google.com", "vercel.app",
]);

/** Whether a link is on the company's own site. */
export function isCompanyUrl(url: string, domain: string) {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
  const base = domain.replace(/^www\./, "");
  if (host !== base && !host.endsWith(`.${base}`)) return false;
  return !PLATFORMS.has(base) || (host !== base && !host.startsWith("www."));
}

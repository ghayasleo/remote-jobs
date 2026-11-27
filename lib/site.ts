// The public address of the site: the production domain on Vercel, localhost
// in development. Used for metadata, the sitemap and structured data.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_NAME = "Remote Jobs";

/**
 * The site's name in search results. Google picks a site name from the WebSite
 * markup, og:site_name and the titles, so all three use this one. Google
 * avoids generic names, so the one-word "RemoteJobs" comes first; "Remote Jobs"
 * and then the subdomain are its alternate names.
 */
export const SITE_BRAND = "RemoteJobs";

/**
 * Open Graph fields every page shares. A page that sets its own openGraph
 * replaces the layout's whole object, so it spreads these in.
 */
export const OG_BASE = { type: "website", siteName: SITE_BRAND, locale: "en_US" } as const;

/** This site's source code. */
export const REPOSITORY_URL = "https://github.com/ghayasleo/remote-jobs";

/** The site's Bluesky account, which posts the day's new roles. */
export const BLUESKY_URL = "https://bsky.app/profile/remotejobs.ghayasuddin.net";

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/**
 * The general share card (app/opengraph-image.tsx). Pages that set their own
 * openGraph fields replace the inherited image, so they list it explicitly.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Remote Jobs: remote-friendly tech companies and the roles they're hiring for",
};

/** A JSON-LD <script>. "<" is escaped so profile text can't close the tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

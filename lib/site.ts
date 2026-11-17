// The public address of the site: the production domain on Vercel, localhost
// in development. Used for metadata, the sitemap and structured data.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_NAME = "Remote Jobs";

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/** A JSON-LD <script>. "<" is escaped so profile text can't close the tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

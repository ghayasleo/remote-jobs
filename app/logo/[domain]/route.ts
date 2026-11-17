// Company logos, served from our own domain: visitors' browsers never contact
// Google, the service worker can cache them, and unknown sites get a clean 404
// so the UI shows a lettered avatar instead of a generic globe.

const VALID_DOMAIN = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const ONE_WEEK = 60 * 60 * 24 * 7;

export async function GET(_request: Request, { params }: RouteContext<"/logo/[domain]">) {
  const { domain } = await params;
  if (!VALID_DOMAIN.test(domain)) return new Response(null, { status: 400 });

  const source = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(6_000) });
    // Google answers 404 (with a placeholder globe) when it has no icon.
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
      return new Response(null, {
        status: 404,
        headers: { "cache-control": `public, max-age=86400, s-maxage=${ONE_WEEK}` },
      });
    }
    return new Response(response.body, {
      headers: {
        "content-type": response.headers.get("content-type")!,
        "cache-control": `public, max-age=${ONE_WEEK}, s-maxage=${ONE_WEEK * 4}, stale-while-revalidate=${ONE_WEEK}`,
      },
    });
  } catch {
    return new Response(null, { status: 502, headers: { "cache-control": "no-store" } });
  }
}

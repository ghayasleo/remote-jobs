import { feature, iso1A2Code } from "@rapideditor/country-coder";
import { countryFromCodes } from "@/lib/country-codes";

// "Use my current location" on the Jobs page: turns the browser's
// coordinates into one of the site's countries, offline, with country-coder's
// built-in borders. Coordinates come in a POST body so they never sit in a URL
// or a request log, and nothing is stored.

const NO_STORE = { "cache-control": "no-store" };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { lat?: unknown; lon?: unknown } | null;
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Those aren't coordinates." }, { status: 400, headers: NO_STORE });
  }
  const point: [number, number] = [lon, lat];
  // Territory first (Hong Kong as Hong Kong), then country (Puerto Rico as the US).
  const country = countryFromCodes([iso1A2Code(point, { level: "territory" }), iso1A2Code(point)]);
  if (country) return Response.json({ supported: true, ...country }, { headers: NO_STORE });
  return Response.json({ supported: false, name: feature(point)?.properties.nameEn ?? null }, { headers: NO_STORE });
}

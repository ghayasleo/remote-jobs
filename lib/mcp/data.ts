import "server-only";

import type { JobListing } from "@/lib/jobs";
import { SITE_URL } from "@/lib/site";
import type { ExploreFile, InsightsFile } from "./tools";

// The MCP server reads the same prerendered files the browser does
// (/data/*.json, refreshed hourly and served from the CDN) instead of calling
// the data functions directly: on a cold instance those would fetch every job
// board again, which takes seconds and spends CPU on each new instance.

const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 15_000;

const files = new Map<string, { value: Promise<unknown>; loadedAt: number }>();

/** Production reads its own domain; a local or preview server reads itself. */
export function siteOrigin(request: Request | undefined) {
  if (process.env.VERCEL_ENV === "production" || !request) return SITE_URL;
  return new URL(request.url).origin;
}

function siteFile<T>(origin: string, path: string): Promise<T> {
  const key = `${origin}${path}`;
  const cached = files.get(key);
  if (cached && Date.now() - cached.loadedAt < TTL_MS) return cached.value as Promise<T>;

  const value = fetch(new URL(path, origin), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Kept here for TTL_MS; Next's fetch cache would only add a second copy.
    cache: "no-store",
  }).then(async (response) => {
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return (await response.json()) as T;
  });
  files.set(key, { value, loadedAt: Date.now() });
  // A failed load isn't kept, so the next call tries again.
  value.catch(() => files.delete(key));
  return value;
}

export const loadExplore = (origin: string) => siteFile<ExploreFile>(origin, "/data/explore.json");
export const loadJobs = (origin: string) => siteFile<JobListing[]>(origin, "/data/jobs.json");
export const loadInsights = (origin: string) => siteFile<InsightsFile>(origin, "/data/insights.json");

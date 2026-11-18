import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getCompanyIndex } from "./companies";
import { getHiringSummary } from "./job-boards";
import { DEFAULT_PARAMS, filterCompanies, newSinceDate, toExploreCompany } from "@/lib/explore";
import { landingTopics, topicPath } from "@/lib/landing";
import { similarCompanies } from "@/lib/similar";

/**
 * Every company the Explore and Saved lists can show. Served as one static
 * JSON file (/data/explore.json) that the browser fetches once and reuses.
 */
export async function getExploreData() {
  "use cache";
  cacheLife("hours");
  cacheTag("companies", "roles");

  const [companies, hiring] = await Promise.all([getCompanyIndex(), getHiringSummary()]);
  return {
    companies: companies.map(toExploreCompany),
    hiring,
    // Fixed when the cache fills, so server and browser agree on what's "new".
    newSince: newSinceDate(Date.now()),
    // When these numbers were counted, for "as of" dates.
    updatedAt: new Date().toISOString(),
  };
}

export type ExploreData = Awaited<ReturnType<typeof getExploreData>>;

export const PREVIEW_SIZE = 24;

/**
 * What the Explore page's HTML carries: the first page of the default view and
 * the totals. Keeping the full list out of the HTML makes it ~10x smaller,
 * which matters for first paint on phones.
 */
export async function getExplorePreview() {
  "use cache";
  cacheLife("hours");
  cacheTag("companies", "roles");

  const { companies, hiring, newSince } = await getExploreData();
  const preview = filterCompanies(companies, DEFAULT_PARAMS, hiring, newSince).slice(0, PREVIEW_SIZE);
  return {
    preview,
    previewHiring: Object.fromEntries(preview.filter((c) => hiring[c.slug]).map((c) => [c.slug, hiring[c.slug]])),
    total: companies.length,
    hiringCount: Object.keys(hiring).length,
    newSince,
  };
}

export type ExplorePreview = Awaited<ReturnType<typeof getExplorePreview>>;

/** Every landing page (/remote/...) with its company count, computed once. */
export async function getLandingTopics() {
  "use cache";
  cacheLife("hours");
  cacheTag("companies", "roles");

  const { companies, hiring, newSince } = await getExploreData();
  return landingTopics(companies, hiring, newSince).map(({ topic, count }) => ({ topic, count, path: topicPath(topic) }));
}

/** A company's most similar companies, with their open roles, for its profile page. */
export async function getSimilarCompanies(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("companies", "roles");

  const { companies, hiring, newSince } = await getExploreData();
  const company = companies.find((candidate) => candidate.slug === slug);
  if (!company) return { companies: [], hiring: {}, newSince };
  const similar = similarCompanies(company, companies, hiring);
  return {
    companies: similar,
    hiring: Object.fromEntries(similar.filter(({ slug }) => slug in hiring).map(({ slug }) => [slug, hiring[slug]])),
    newSince,
  };
}

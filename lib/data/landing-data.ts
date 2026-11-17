import "server-only";

import type { Metadata } from "next";
import { getExploreData } from "./explore-data";
import { MIN_COMPANIES, topicCompanies, topicCopy, topicPath, topicSummary, type Topic } from "@/lib/landing";
import { clip } from "@/lib/seo";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

/** The companies on a landing page, or null when the page shouldn't exist. */
export async function landingData(topic: Topic | null) {
  if (!topic) return null;
  const { companies, hiring, newSince } = await getExploreData();
  const matches = topicCompanies(companies, topic, hiring, newSince);
  return matches.length >= MIN_COMPANIES ? { topic, matches, hiring, newSince } : null;
}

export async function landingMetadata(topic: Topic | null): Promise<Metadata> {
  const data = await landingData(topic);
  if (!data) return { title: "Not found", robots: { index: false } };
  const { searchTitle } = topicCopy(data.topic);
  const summary = topicSummary(data.topic, data.matches, data.hiring);
  const title = `${searchTitle}: ${data.matches.length} companies${summary.hiringCount ? `, ${summary.hiringCount} hiring now` : ""}`;
  const url = topicPath(data.topic);
  return { title, description: clip(summary.intro), alternates: { canonical: url }, openGraph: { title, url, images: [DEFAULT_OG_IMAGE] } };
}

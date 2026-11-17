import { TECHS, techLabels, type Tech } from "@/lib/data/labels";
import {
  DEFAULT_PARAMS,
  REGION_FILTER_KEYS,
  filterCompanies,
  serializeParams,
  type ExploreCompany,
  type HiringCounts,
  type RegionFilter,
} from "@/lib/explore";

// Landing pages for searches like "remote python companies in europe":
// /remote/python, /remote/europe and /remote/europe/python. They reuse
// Explore's filters, so a landing page always matches what Explore shows.

export type Topic = { region?: RegionFilter; stack?: Tech };

/** Pages with fewer companies than this would be thin content, so they don't exist. */
export const MIN_COMPANIES = 3;

const REGION_NAMES: Record<RegionFilter, { short: string; where: string }> = {
  americas: { short: "the Americas", where: "hiring in the Americas" },
  europe: { short: "Europe", where: "hiring in Europe" },
  "asia-pacific": { short: "Asia Pacific", where: "hiring in Asia Pacific" },
  worldwide: { short: "anywhere", where: "hiring worldwide" },
};

const isRegion = (value: string): value is RegionFilter => (REGION_FILTER_KEYS as string[]).includes(value);
const isTech = (value: string): value is Tech => (TECHS as string[]).includes(value);

/** /remote/[a]/[b] segments to a topic, or null if the URL isn't a valid page. */
export function parseTopic(first: string, second?: string): Topic | null {
  if (second === undefined) {
    if (isRegion(first)) return { region: first };
    if (isTech(first)) return { stack: first };
    return null;
  }
  return isRegion(first) && isTech(second) ? { region: first, stack: second } : null;
}

export function topicPath({ region, stack }: Topic) {
  return `/remote/${[region, stack].filter(Boolean).join("/")}`;
}

export function exploreHref({ region, stack }: Topic) {
  return `/${serializeParams({ ...DEFAULT_PARAMS, region: region ? [region] : [], stack: stack ? [stack] : [] })}`;
}

export function topicCompanies<T extends ExploreCompany>(
  companies: T[],
  topic: Topic,
  hiring: HiringCounts,
  newSince: string,
) {
  return filterCompanies(
    companies,
    { ...DEFAULT_PARAMS, region: topic.region ? [topic.region] : [], stack: topic.stack ? [topic.stack] : [] },
    hiring,
    newSince,
  );
}

/** Every page worth having, with its company count. */
export function landingTopics(companies: ExploreCompany[], hiring: HiringCounts, newSince: string) {
  const topics: Topic[] = [
    ...REGION_FILTER_KEYS.map((region) => ({ region })),
    ...TECHS.map((stack) => ({ stack })),
    ...REGION_FILTER_KEYS.flatMap((region) => TECHS.map((stack) => ({ region, stack }))),
  ];
  return topics
    .map((topic) => ({ topic, count: topicCompanies(companies, topic, hiring, newSince).length }))
    .filter(({ count }) => count >= MIN_COMPANIES);
}

export function topicCopy({ region, stack }: Topic) {
  const tech = stack ? techLabels[stack] : null;
  const place = region ? REGION_NAMES[region] : null;
  const heading = [`Remote ${tech ?? "tech"} companies`, place?.where].filter(Boolean).join(" ");
  const searchTitle = tech
    ? `Remote ${tech} jobs${place ? ` ${place.where === "hiring worldwide" ? "worldwide" : `in ${place.short}`}` : ""}`
    : `Remote tech jobs ${region === "worldwide" ? "worldwide" : `in ${place!.short}`}`;
  return { heading, searchTitle, tech, place: place?.short ?? null };
}

/** A short, data-driven intro, so every page says something specific. */
export function topicSummary(
  topic: Topic,
  companies: ExploreCompany[],
  hiring: HiringCounts,
): { intro: string; hiringCount: number; remoteRoles: number; fullyRemote: number } {
  const { tech } = topicCopy(topic);
  const hiringNow = companies.filter((company) => company.slug in hiring);
  const remoteRoles = hiringNow.reduce((sum, company) => sum + hiring[company.slug].remote, 0);
  const fullyRemote = companies.filter((company) => company.remotePolicy === "fully-remote").length;
  const who = `${companies.length} remote-friendly tech ${companies.length === 1 ? "company" : "companies"}`;
  const uses = tech ? ` that ${companies.length === 1 ? "uses" : "use"} ${tech}` : "";
  const where = topic.region
    ? topic.region === "worldwide"
      ? " and hire worldwide"
      : ` and hire people based in ${REGION_NAMES[topic.region].short} (including companies that hire worldwide)`
    : "";
  const hiringLine =
    hiringNow.length > 0
      ? ` ${hiringNow.length} of them ${hiringNow.length === 1 ? "is" : "are"} hiring right now${remoteRoles > 0 ? `, with ${remoteRoles} open remote ${remoteRoles === 1 ? "role" : "roles"} between them` : ""}.`
      : "";
  return {
    intro: `${who}${uses}${where}.${hiringLine} ${fullyRemote} ${fullyRemote === 1 ? "is" : "are"} fully remote.`,
    hiringCount: hiringNow.length,
    remoteRoles,
    fullyRemote,
  };
}

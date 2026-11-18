import { REMOTE_POLICIES, TECHS, remotePolicyLabels, techLabels, type Region, type Tech } from "@/lib/data/labels";
import { formatCount, listAnd, type Faq } from "@/lib/faq";
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

// Where a company hires, as it reads after "hire": "hire in Europe".
const HIRES_IN: Record<Region, string> = {
  worldwide: "worldwide",
  americas: "in the Americas",
  europe: "in Europe",
  "americas-europe": "in the Americas and Europe",
  "asia-pacific": "in Asia Pacific",
  other: "elsewhere",
};

const SOURCE_ANSWER =
  "Company profiles come from remoteintech/remote-jobs, a community-run list of remote-friendly tech companies on GitHub. Open roles are read every hour from each company's own job board, and you apply on the company's site.";

/** Questions a landing page answers, from its own companies and roles. */
export function topicFaqs(topic: Topic, companies: ExploreCompany[], hiring: HiringCounts): Faq[] {
  const { searchTitle, tech, place } = topicCopy(topic);
  const total = companies.length;
  const of = (count: number) => `${formatCount(count)} of the ${formatCount(total)}`;
  const remote = (company: ExploreCompany) => hiring[company.slug]?.remote ?? 0;
  const roles = (count: number) => `${formatCount(count)} open remote ${count === 1 ? "role" : "roles"}`;
  const { remoteRoles, fullyRemote } = topicSummary(topic, companies, hiring);

  const hiringRemote = companies.filter((company) => remote(company) > 0).sort((a, b) => remote(b) - remote(a));
  const top = hiringRemote.slice(0, 3);
  const whoIsHiring =
    top.length === 0
      ? `None of the ${formatCount(total)} companies here lists an open remote role on a job board we can read right now. Their careers pages may still have openings.`
      : hiringRemote.length === 1
        ? `Right now only ${top[0].name} is, with ${roles(remote(top[0]))}.`
        : `${listAnd(top.map((company) => `${company.name} (${formatCount(remote(company))} ${remote(company) === 1 ? "role" : "roles"})`))} have the most open remote roles. In all, ${of(hiringRemote.length)} companies here are hiring for remote roles, with ${roles(remoteRoles)} between them.`;

  const others = REMOTE_POLICIES.filter((policy) => policy !== "fully-remote")
    .map((policy) => ({ policy, count: companies.filter((company) => company.remotePolicy === policy).length }))
    .filter(({ count }) => count > 0)
    .map(({ policy, count }) => `${formatCount(count)} ${remotePolicyLabels[policy].toLowerCase()}`);
  const howRemote =
    fullyRemote === total
      ? `Yes, all ${formatCount(total)} are fully remote.`
      : `${fullyRemote === 0 ? "None of them is" : `${of(fullyRemote)} are`} fully remote${others.length ? `; ${listAnd(others)}` : ""}. Each profile says how the company works.`;

  const worldwide = companies.filter((company) => company.region === "worldwide").length;
  const where = (() => {
    if (topic.region === "worldwide") {
      return {
        question: `Do these ${tech ?? "tech"} companies really hire from anywhere?`,
        answer: `They say so: each of the ${formatCount(total)} lists itself as hiring worldwide. A single role can still be limited to some countries or time zones, so check its location before you apply.`,
      };
    }
    if (topic.region) {
      return {
        question: `Do these companies hire people who live in ${place}?`,
        answer: `Yes. Each of the ${formatCount(total)} hires in ${place}, ${worldwide > 0 ? `and ${of(worldwide)} hire worldwide` : "though none of them hires worldwide"}. A single role can still be limited to some countries, so check its location before you apply.`,
      };
    }
    const regions = Object.entries(
      companies.reduce<Partial<Record<Region, number>>>((counts, company) => {
        const region = company.region as Region | null;
        if (region && region in HIRES_IN) counts[region] = (counts[region] ?? 0) + 1;
        return counts;
      }, {}),
    ).sort((a, b) => b[1] - a[1]) as [Region, number][];
    return {
      question: `Where do remote ${tech} companies hire?`,
      answer: `${listAnd(regions.slice(0, 3).map(([region, count]) => `${formatCount(count)} hire ${HIRES_IN[region]}`))}, out of ${formatCount(total)}. Each profile says where the company hires.`,
    };
  })();

  return [
    { question: `Who is hiring for ${searchTitle.replace(/^Remote/, "remote")} right now?`, answer: whoIsHiring },
    { question: "Are these companies fully remote?", answer: howRemote },
    where,
    { question: "Where does this list come from?", answer: SOURCE_ANSWER },
  ];
}

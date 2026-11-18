import { XMLParser } from "fast-xml-parser";

// Reads RSS 2.0, RSS 1.0 (RDF) and Atom feeds into plain items. No path
// aliases, so the feed finder script can run it with Node directly.

export type FeedItem = { title: string; url: string; date: string | null };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
});

type Node = string | number | { "#text"?: string | number; "@href"?: string; "@rel"?: string } | undefined;

const list = <T,>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const text = (value: Node): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : value?.["#text"] !== undefined ? String(value["#text"]) : "";
const clean = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** An Atom entry's link: the "alternate" one, or the first with an href. */
function atomLink(links: Node | Node[]): string {
  const all = list(links);
  const preferred = all.find((link) => typeof link === "object" && link?.["@href"] && (!link["@rel"] || link["@rel"] === "alternate"));
  const any = preferred ?? all.find((link) => typeof link === "object" && link?.["@href"]);
  return typeof any === "object" && any?.["@href"] ? any["@href"] : text(all[0]);
}

function isoDate(value: Node): string | null {
  const parsed = Date.parse(text(value));
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/** A feed's items, newest first; null if it isn't a feed. */
export function parseFeed(xml: string): FeedItem[] | null {
  let document: Record<string, Record<string, unknown> | undefined>;
  try {
    document = parser.parse(xml);
  } catch {
    return null;
  }
  const rss = document.rss as { channel?: { item?: unknown } } | undefined;
  const rdf = document["rdf:RDF"] as { item?: unknown } | undefined;
  const atom = document.feed as { entry?: unknown } | undefined;
  if (!rss && !rdf && !atom) return null;

  const items = list((rss?.channel?.item ?? rdf?.item ?? atom?.entry) as Record<string, Node | Node[]>[] | undefined);
  return items
    .map((item) => ({
      title: clean(text(item.title as Node)),
      url: (atom ? atomLink(item.link) : text(item.link as Node) || text(item.guid as Node)).trim(),
      date: isoDate((item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]) as Node),
    }))
    .filter((item) => item.title && /^https?:\/\//.test(item.url))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

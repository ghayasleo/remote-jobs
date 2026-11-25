// Finds which public job board each company uses (Greenhouse, Lever, Ashby,
// Workable, Recruitee, SmartRecruiters, Personio, Teamtailor, Breezy,
// BambooHR, Rippling or Workday) and writes data/job-boards.json.
//
// For every company in remoteintech/remote-jobs it reads the careers URL and
// the links under "How to apply", looks for a board on those pages, and keeps a
// board only if the provider's API answers for it and, where the API reports a
// company name, that name matches. Boards are found on the company's own
// pages, so a match is the right company by construction; the name check
// guards against pages that link to other companies' boards. One board never
// goes to two companies.
//
// Run with: npm run boards:scan
// Try a few companies without writing anything: npm run boards:scan -- --only slug-a,slug-b

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parse as parseYaml } from "yaml";
import { readTar } from "../lib/data/tar.ts";
import { baseDomain, hostOf, sameName, similar } from "../lib/data/same-company.ts";
import { detectBoards, PROVIDER_IDS, PROVIDERS, type Board, type Fetcher, type ProviderId } from "../lib/data/job-boards/providers.ts";

const TARBALL_URL = "https://codeload.github.com/remoteintech/remote-jobs/tar.gz/main";
const OUTPUT = new URL("../data/job-boards.json", import.meta.url);
const CONCURRENCY = 16;
const PAGE_TIMEOUT_MS = 12_000;
const API_TIMEOUT_MS = 10_000;
const MAX_PAGE_BYTES = 3_000_000;
const HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; RemoteJobsBoardScanner/1.0)",
  accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
};

type CompanySource = { slug: string; name: string; website: string; urls: string[] };

// Boards that pass the automatic checks but belong to a different company.
// Add to this list when a wrong match turns up.
const EXCLUDE: Record<string, string> = {
  flip: "greenhouse/flip is a US company; this Flip is flip.id",
  honeycomb: "greenhouse/honeycomb is honeycomb.io; this Honeycomb is honeycomb.tv",
  ramp: "greenhouse/ramp only has a stale copied posting",
};
type Candidate = Board & { direct: boolean };

/** How sure a match is, to settle a board that two companies' pages point to. */
type Match = { board: Board; note: string; strength: number };
const STRENGTH = { sameName: 3, direct: 2, similarName: 1 } as const;

const only = (() => {
  const index = process.argv.indexOf("--only");
  return index > -1 ? new Set(process.argv[index + 1]?.split(",")) : null;
})();

/* ---------- read the companies ---------- */

async function loadCompanies(): Promise<CompanySource[]> {
  const response = await fetch(TARBALL_URL);
  if (!response.ok) throw new Error(`Downloading ${TARBALL_URL} failed: ${response.status}`);
  const companies: CompanySource[] = [];

  readTar(gunzipSync(Buffer.from(await response.arrayBuffer())), (path, content) => {
    const slug = /^[^/]+\/src\/companies\/([^/]+)\.md$/.exec(path)?.[1];
    if (!slug || (only && !only.has(slug))) return;
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content.toString("utf8"));
    if (!match) return;
    let data: Record<string, unknown>;
    try {
      data = parseYaml(match[1]) ?? {};
    } catch {
      return;
    }
    const howToApply = /^##\s*How to apply\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(match[2])?.[1] ?? "";
    const links = [...howToApply.matchAll(/https?:\/\/[^\s)<>"'\]]+/g)].map((m) => m[0].replace(/[.,;]+$/, ""));
    const urls = [...new Set([String(data.careers_url ?? ""), ...links].filter((url) => /^https?:\/\//.test(url)))];
    companies.push({ slug, name: String(data.title ?? slug), website: String(data.website ?? ""), urls });
  });
  return companies;
}

/* ---------- find candidates ---------- */

const findBoards = (text: string, direct: boolean): Candidate[] =>
  detectBoards(text).map((board) => ({ ...board, direct }));

// A Teamtailor career site on the company's own domain ("careers.example.com")
// loads Teamtailor's assets but never names a teamtailor.com board.
const TEAMTAILOR_SITE = /teamtailor-cdn\.com|\.teamtailor\.com\/(?:assets|packs)|content="Teamtailor"/i;

async function fetchPage(url: string): Promise<{ finalUrl: string; html: string } | null> {
  try {
    const response = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(PAGE_TIMEOUT_MS) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/html|text/.test(type)) return { finalUrl: response.url, html: "" };
    const html = await response.text();
    return { finalUrl: response.url, html: html.slice(0, MAX_PAGE_BYTES) };
  } catch {
    return null;
  }
}

/* ---------- verify ---------- */

/** The same fetching the site does (lib/data/job-boards/index.ts), with the scanner's timeout. */
const get: Fetcher = async (url, init = {}) => {
  try {
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        ...HEADERS,
        accept: init.as === "text" ? "application/rss+xml, application/xml, text/xml, */*" : "application/json",
        ...(init.body !== undefined && { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return init.as === "text" ? await response.text() : await response.json();
  } catch {
    return null;
  }
};

/** The board's data as the site reads it, or null when its API didn't answer like a board. */
async function readBoard(candidate: Board): Promise<unknown> {
  const provider = PROVIDERS[candidate.provider];
  const data = provider.load
    ? await provider.load(candidate.token, get)
    : await get(provider.apiUrl(candidate.token), { as: provider.format });
  if (data === null || data === undefined) return null;
  if (provider.format === "text") return typeof data === "string" && /<(rss|item|workzag-jobs|position)\b/.test(data) ? data : null;
  return Array.isArray(data) || Object.values(data as object).some(Array.isArray) ? data : null;
}

async function verify(company: CompanySource, candidate: Candidate): Promise<{ ok: true; match: Match } | { ok: false; reason: string }> {
  const provider = PROVIDERS[candidate.provider];
  const data = await readBoard(candidate);
  if (!data) return { ok: false, reason: "API did not answer" };
  try {
    provider.normalize(data, candidate.token);
  } catch {
    return { ok: false, reason: "unexpected API response" };
  }
  const board: Board = { provider: candidate.provider, token: candidate.token };
  // "crate" for crate.io: boards often report the legal name ("Crate.io GmbH"), not the listed one ("CrateDB").
  const domain = company.website.replace(/^https?:\/\/(www\.)?/, "").split(/[/.]/)[0] ?? "";

  if (provider.boardName) {
    const nameData = provider.nameUrl ? await get(provider.nameUrl(candidate.token)) : data;
    const boardName = nameData ? provider.boardName(nameData) : null;
    if (boardName) {
      const matchesDomain = domain.length >= 4 && similar(boardName, domain);
      if (!similar(boardName, company.name) && !similar(boardName, company.slug) && !matchesDomain) {
        return { ok: false, reason: `board belongs to "${boardName}"` };
      }
      const strength = sameName(boardName, company.name) ? STRENGTH.sameName : candidate.direct ? STRENGTH.direct : STRENGTH.similarName;
      return { ok: true, match: { board, note: `board name "${boardName}"`, strength } };
    }
  }
  // No name to compare: trust boards linked directly, or whose token looks like the company.
  const token = candidate.token.split(/[./]/)[0] ?? candidate.token;
  if (candidate.direct) return { ok: true, match: { board, note: "linked directly", strength: STRENGTH.direct } };
  if (similar(token, company.name) || similar(token, company.slug) || similar(token, domain)) {
    return { ok: true, match: { board, note: "token matches company", strength: STRENGTH.similarName } };
  }
  return { ok: false, reason: "token doesn't look like this company" };
}

// Many careers pages load their board with JavaScript, so nothing shows up in
// the HTML. Greenhouse reports each board's company name, which makes it safe
// to try the company's slug and domain as a board token and keep only an exact
// name match.
//
// The guess is kept only when the board has jobs and none of them link to a
// domain other than the company's own (or Greenhouse's hosted pages).
async function guessGreenhouse(company: CompanySource): Promise<Match | null> {
  const greenhouse = PROVIDERS.greenhouse;
  const companyDomains = new Set([company.website, ...company.urls].map(hostOf).filter(Boolean).map(baseDomain));
  const label = hostOf(company.website).split(".")[0] ?? "";
  const tokens = [...new Set([company.slug, company.slug.replace(/-/g, ""), label].filter(Boolean))];
  for (const token of tokens) {
    const meta = await get(greenhouse.nameUrl!(token));
    const name = meta ? greenhouse.boardName!(meta) : null;
    if (!name || !sameName(name, company.name)) continue;
    const jobs = (await get(greenhouse.apiUrl(token))) as { jobs?: { absolute_url?: string }[] } | null;
    const hosts = (jobs?.jobs ?? []).map((job) => hostOf(job.absolute_url ?? "")).filter(Boolean);
    const foreign = hosts.filter((host) => !host.endsWith("greenhouse.io") && !companyDomains.has(baseDomain(host)));
    if (hosts.length > 0 && foreign.length === 0) {
      return { board: { provider: "greenhouse", token }, note: "board name matches company", strength: STRENGTH.sameName };
    }
  }
  return null;
}

/* ---------- run ---------- */

async function scan(company: CompanySource) {
  const candidates: Candidate[] = [];
  for (const url of company.urls) {
    candidates.push(...findBoards(url, true));
    const page = await fetchPage(url);
    if (!page) continue;
    if (page.finalUrl !== url) candidates.push(...findBoards(page.finalUrl, true));
    const found = findBoards(page.html, false);
    candidates.push(...found);
    const host = hostOf(page.finalUrl);
    if (host && TEAMTAILOR_SITE.test(page.html) && !found.some((board) => board.provider === "teamtailor")) {
      candidates.push({ provider: "teamtailor", token: host, direct: false });
    }
  }

  const seen = new Set<string>();
  const rejected: string[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.provider}:${candidate.token.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await verify(company, candidate);
    if (result.ok) return { match: result.match, rejected };
    rejected.push(`${key} (${result.reason})`);
  }
  return { match: null, rejected };
}

const boardKey = (board: Board) => `${board.provider}:${board.token.toLowerCase()}`;

/**
 * Each board to one company. When two companies' pages lead to the same board
 * (a parent and its brand, or a duplicate entry), the surer match keeps it:
 * the board's own name, then a direct link, then a similar name.
 */
function oneCompanyPerBoard(matches: Map<string, Match & { name: string }>, log: string[]) {
  const claimed = new Map<string, string[]>();
  for (const [slug, match] of matches) {
    const key = boardKey(match.board);
    claimed.set(key, [...(claimed.get(key) ?? []), slug]);
  }
  for (const [key, slugs] of claimed) {
    if (slugs.length < 2) continue;
    const [kept, ...dropped] = [...slugs].sort(
      (a, b) => matches.get(b)!.strength - matches.get(a)!.strength || a.localeCompare(b),
    );
    for (const slug of dropped) matches.delete(slug);
    log.push(`${key}: kept for ${kept}, dropped from ${dropped.join(", ")}`);
  }
}

/** The boards from the last scan, so a careers page that fails to load this time doesn't drop a working board. */
function previousBoards(): Record<string, Board> {
  if (!existsSync(OUTPUT)) return {};
  try {
    return (JSON.parse(readFileSync(OUTPUT, "utf8")) as { boards?: Record<string, Board> }).boards ?? {};
  } catch {
    return {};
  }
}

/** A board from the last scan that this scan didn't find: kept only while its API still answers for this company. */
async function keepPrevious(company: CompanySource, board: Board | undefined): Promise<Match | null> {
  if (!board || !PROVIDERS[board.provider]) return null;
  const result = await verify(company, { ...board, direct: true });
  return result.ok ? { ...result.match, note: `kept from the last scan (${result.match.note})` } : null;
}

async function main() {
  const companies = await loadCompanies();
  const previous = previousBoards();
  console.log(`Scanning ${companies.length} companies…`);

  const matches = new Map<string, Match & { name: string }>();
  const rejectedLog: string[] = [];
  let done = 0;
  const queue = [...companies];
  const worker = async () => {
    for (let company = queue.shift(); company; company = queue.shift()) {
      const { rejected, ...result } = await scan(company);
      // Careers pages time out and rate-limit now and then; a board that still answers stays.
      let match = result.match ?? (await guessGreenhouse(company)) ?? (await keepPrevious(company, previous[company.slug]));
      if (match && EXCLUDE[company.slug]) {
        rejected.push(`${match.board.provider}:${match.board.token} (excluded: ${EXCLUDE[company.slug]})`);
        match = null;
      }
      if (match) {
        matches.set(company.slug, { ...match, name: company.name });
        console.log(`  ✓ ${company.slug} → ${match.board.provider}/${match.board.token} (${match.note})`);
      }
      if (rejected.length) rejectedLog.push(`${company.slug}: ${rejected.join("; ")}`);
      if (++done % 100 === 0) console.log(`  … ${done}/${companies.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const conflicts: string[] = [];
  oneCompanyPerBoard(matches, conflicts);

  const sorted = Object.fromEntries(
    [...matches].sort(([a], [b]) => a.localeCompare(b)).map(([slug, match]) => [slug, match.board]),
  );
  const counts = Object.fromEntries(
    PROVIDER_IDS.map((id: ProviderId) => [id, Object.values(sorted).filter((board) => board.provider === id).length]),
  );
  if (conflicts.length) console.log(`\nBoards claimed by more than one company:\n${conflicts.join("\n")}`);
  if (only) {
    if (rejectedLog.length) console.log(`\nRejected candidates:\n${rejectedLog.join("\n")}`);
    console.log("\n--only is a dry run; data/job-boards.json was not changed.", counts);
    return;
  }
  writeFileSync(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), source: TARBALL_URL, counts, boards: sorted }, null, 2)}\n`,
  );

  console.log(`\nFound boards for ${Object.keys(sorted).length} of ${companies.length} companies:`, counts);
  if (rejectedLog.length) console.log(`\nRejected candidates (review if a company seems missing):\n${rejectedLog.join("\n")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

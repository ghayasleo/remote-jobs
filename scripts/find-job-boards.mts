// Finds which public job board each company uses (Greenhouse, Lever, Ashby,
// Workable, Recruitee) and writes data/job-boards.json.
//
// For every company in remoteintech/remote-jobs it reads the careers URL and
// the links under "How to apply", looks for a board on those pages, and keeps a
// board only if the provider's API answers for it and, where the API reports a
// company name, that name matches. Boards are found on the company's own
// pages, so a match is the right company by construction; the name check
// guards against pages that link to other companies' boards.
//
// Run with: npm run boards:scan
// Try a few companies without writing anything: npm run boards:scan -- --only slug-a,slug-b

import { writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parse as parseYaml } from "yaml";
import { readTar } from "../lib/data/tar.ts";
import { detectBoards, PROVIDER_IDS, PROVIDERS, type Board, type ProviderId } from "../lib/data/job-boards/providers.ts";

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

const STOP_WORDS = new Set(["inc", "llc", "ltd", "gmbh", "co", "the", "company", "group", "technologies", "technology", "labs", "software", "careers", "jobs", "hq", "io", "app"]);
const words = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

function similar(a: string, b: string) {
  const [x, y] = [squash(a), squash(b)];
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const shared = words(a).filter((w) => words(b).includes(w));
  return shared.some((w) => w.length >= 4);
}

// Stricter than similar(): used when guessing a board from the company's name.
function sameName(boardName: string, companyName: string) {
  const [x, y] = [squash(boardName), squash(companyName)];
  return x === y || (Math.min(x.length, y.length) >= 5 && (x.startsWith(y) || y.startsWith(x)));
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { headers: { ...HEADERS, accept: "application/json" }, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function verify(company: CompanySource, candidate: Candidate): Promise<{ ok: boolean; reason: string }> {
  const provider = PROVIDERS[candidate.provider];
  const data = await getJson(provider.apiUrl(candidate.token));
  if (!data || !(Array.isArray(data) || Object.values(data as object).some(Array.isArray))) {
    return { ok: false, reason: "API did not answer" };
  }
  try {
    provider.normalize(data);
  } catch {
    return { ok: false, reason: "unexpected API response" };
  }

  if (provider.boardName) {
    const nameData = provider.nameUrl ? await getJson(provider.nameUrl(candidate.token)) : data;
    const boardName = nameData ? provider.boardName(nameData) : null;
    if (boardName) {
      return similar(boardName, company.name) || similar(boardName, company.slug)
        ? { ok: true, reason: `board name "${boardName}"` }
        : { ok: false, reason: `board belongs to "${boardName}"` };
    }
  }
  // No name to compare: trust boards linked directly, or whose token looks like the company.
  const domain = company.website.replace(/^https?:\/\/(www\.)?/, "").split(/[/.]/)[0] ?? "";
  if (candidate.direct || similar(candidate.token, company.name) || similar(candidate.token, company.slug) || similar(candidate.token, domain)) {
    return { ok: true, reason: candidate.direct ? "linked directly" : "token matches company" };
  }
  return { ok: false, reason: "token doesn't look like this company" };
}

// Many careers pages load their board with JavaScript, so nothing shows up in
// the HTML. Greenhouse reports each board's company name, which makes it safe
// to try the company's slug and domain as a board token and keep only an exact
// name match.
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};
// example.com, example.co.uk -> the registrable part, near enough for a check.
const baseDomain = (host: string) => {
  const labels = host.split(".");
  const tail = /^(co|com|ne|or|ac|gov|org|net)$/.test(labels.at(-2) ?? "") && labels.length > 2 ? 3 : 2;
  return labels.slice(-tail).join(".");
};

// The guess is kept only when the board has jobs and none of them link to a
// domain other than the company's own (or Greenhouse's hosted pages).
async function guessGreenhouse(company: CompanySource): Promise<Board | null> {
  const greenhouse = PROVIDERS.greenhouse;
  const companyDomains = new Set([company.website, ...company.urls].map(hostOf).filter(Boolean).map(baseDomain));
  const label = hostOf(company.website).split(".")[0] ?? "";
  const tokens = [...new Set([company.slug, company.slug.replace(/-/g, ""), label].filter(Boolean))];
  for (const token of tokens) {
    const meta = await getJson(greenhouse.nameUrl!(token));
    const name = meta ? greenhouse.boardName!(meta) : null;
    if (!name || !sameName(name, company.name)) continue;
    const jobs = (await getJson(greenhouse.apiUrl(token))) as { jobs?: { absolute_url?: string }[] } | null;
    const hosts = (jobs?.jobs ?? []).map((job) => hostOf(job.absolute_url ?? "")).filter(Boolean);
    const foreign = hosts.filter((host) => !host.endsWith("greenhouse.io") && !companyDomains.has(baseDomain(host)));
    if (hosts.length > 0 && foreign.length === 0) return { provider: "greenhouse", token };
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
    candidates.push(...findBoards(page.html, false));
  }

  const seen = new Set<string>();
  const rejected: string[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.provider}:${candidate.token.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await verify(company, candidate);
    if (result.ok) return { board: { provider: candidate.provider, token: candidate.token } as Board, note: result.reason, rejected };
    rejected.push(`${key} (${result.reason})`);
  }
  return { board: null, note: "", rejected };
}

async function main() {
  const companies = await loadCompanies();
  console.log(`Scanning ${companies.length} companies…`);

  const boards: Record<string, Board> = {};
  const rejectedLog: string[] = [];
  let done = 0;
  const queue = [...companies];
  const worker = async () => {
    for (let company = queue.shift(); company; company = queue.shift()) {
      const result = await scan(company);
      const { rejected } = result;
      let { board, note } = result;
      if (!board) {
        board = await guessGreenhouse(company);
        if (board) note = "board name matches company";
      }
      if (board && EXCLUDE[company.slug]) {
        rejected.push(`${board.provider}:${board.token} (excluded: ${EXCLUDE[company.slug]})`);
        board = null;
      }
      if (board) boards[company.slug] = board;
      if (rejected.length) rejectedLog.push(`${company.slug}: ${rejected.join("; ")}`);
      if (board) console.log(`  ✓ ${company.slug} → ${board.provider}/${board.token} (${note})`);
      if (++done % 100 === 0) console.log(`  … ${done}/${companies.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const sorted = Object.fromEntries(Object.entries(boards).sort(([a], [b]) => a.localeCompare(b)));
  const counts = Object.fromEntries(PROVIDER_IDS.map((id: ProviderId) => [id, Object.values(sorted).filter((b) => b.provider === id).length]));
  if (only) {
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

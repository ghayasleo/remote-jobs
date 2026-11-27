import { createHash } from "node:crypto";
import { downloadCompanies } from "./company-archive";
import { fetchBoard } from "./job-boards/fetcher";
import { boardKey, fetchOpenRoles, type OpenRoles } from "./job-boards/open-roles";
import type { Board, Fetcher } from "./job-boards/providers";
import type { CompanyProfile } from "./parse";

/**
 * Everything the site shows, read from the sources in one go: every company
 * profile and every job board's open roles. A scheduled job rebuilds it every
 * hour; pages only ever read it, so a visit never waits on (or pays for) the
 * 190-odd board requests behind it.
 */
export type Snapshot = {
  version: 1;
  builtAt: string;
  /** Every company profile, duplicates already merged. */
  companies: CompanyProfile[];
  /** Fingerprint of `companies`, to tell whether the list changed since the last snapshot. */
  companiesHash?: string;
  /** Open roles per board, keyed by `boardKey`. */
  boards: Record<string, OpenRoles>;
};

export type SnapshotStats = {
  companies: number;
  boards: number;
  fetched: number;
  /** Boards that failed this time, kept from the previous snapshot. */
  carried: number;
  failed: number;
  remoteRoles: number;
  /** Whether any company profile changed since the previous snapshot. */
  companiesChanged: boolean;
  ms: number;
};

// A board that's down keeps its last roles for up to a day, so one bad hour
// doesn't empty a company's page. After that its roles are dropped.
const CARRY_MS = 24 * 60 * 60 * 1000;

/** Unique boards, in the order the board file lists them. */
function uniqueBoards(boards: Record<string, Board>) {
  const seen = new Map<string, Board>();
  for (const board of Object.values(boards)) {
    const key = boardKey(board);
    if (!seen.has(key)) seen.set(key, board);
  }
  return [...seen.entries()];
}

export async function buildSnapshot(
  boards: Record<string, Board>,
  previous: Snapshot | null,
  {
    deadlineMs = 150_000,
    concurrency = 24,
    get = fetchBoard as Fetcher,
    loadCompanies = downloadCompanies,
  }: {
    deadlineMs?: number;
    concurrency?: number;
    get?: Fetcher;
    loadCompanies?: typeof downloadCompanies;
  } = {},
): Promise<{ snapshot: Snapshot; stats: SnapshotStats }> {
  const started = Date.now();

  // Companies first. If GitHub is unreachable, the last good list stands.
  let companies: CompanyProfile[];
  try {
    companies = [...(await loadCompanies((slug) => slug in boards)).values()];
  } catch (error) {
    if (!previous) throw error;
    companies = previous.companies;
  }

  const queue = uniqueBoards(boards);
  const results: Record<string, OpenRoles> = {};
  let fetched = 0;
  let carried = 0;
  let failed = 0;
  const deadline = started + deadlineMs;

  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [key, board] = next;
      const open = Date.now() < deadline ? await fetchOpenRoles(board, get) : null;
      if (open) {
        results[key] = open;
        fetched++;
        continue;
      }
      const kept = previous?.boards[key];
      if (kept && started - Date.parse(kept.fetchedAt) < CARRY_MS) {
        results[key] = kept;
        carried++;
      } else {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  const companiesHash = createHash("sha1").update(JSON.stringify(companies)).digest("hex");
  const snapshot: Snapshot = { version: 1, builtAt: new Date().toISOString(), companies, companiesHash, boards: results };
  return {
    snapshot,
    stats: {
      companies: companies.length,
      boards: Object.keys(results).length,
      fetched,
      carried,
      failed,
      remoteRoles: Object.values(results).reduce((sum, open) => sum + open.remote, 0),
      companiesChanged: companiesHash !== previous?.companiesHash,
      ms: Date.now() - started,
    },
  };
}

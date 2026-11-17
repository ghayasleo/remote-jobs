import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import boardsFile from "@/data/job-boards.json";
import { PROVIDERS, type Board, type ProviderId, type Role } from "./providers";

export type { Board, ProviderId, Role, Workplace } from "./providers";

export type OpenRoles = {
  provider: ProviderId;
  providerLabel: string;
  boardUrl: string;
  total: number;
  remote: number;
  /** Remote roles first, then newest. Capped at MAX_ROLES. */
  roles: Role[];
  fetchedAt: string;
};

export type HiringSummary = Record<string, { total: number; remote: number }>;

/** Board per company slug, found by scripts/find-job-boards.ts. */
const BOARDS = (boardsFile as { boards: Record<string, Board> }).boards;

const MAX_ROLES = 100;
const FETCH_TIMEOUT_MS = 8_000;
// Prerendering fails if a cache fill takes 50s, so the summary gives up on
// slow boards well before that; they just show no badge until the next run.
const SUMMARY_DEADLINE_MS = 30_000;
const SUMMARY_CONCURRENCY = 24;

export function getBoard(slug: string): Board | null {
  return BOARDS[slug] ?? null;
}

const byRemoteThenNewest = (a: Role, b: Role) =>
  Number(b.workplace === "remote") - Number(a.workplace === "remote") ||
  (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

export async function getOpenRoles(board: Board): Promise<OpenRoles | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", `roles:${board.provider}:${board.token}`);

  const provider = PROVIDERS[board.provider];
  if (!provider) return null;
  try {
    const response = await fetch(provider.apiUrl(board.token), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const roles = provider.normalize(await response.json()).filter((role) => role.url);
    return {
      provider: board.provider,
      providerLabel: provider.label,
      boardUrl: provider.boardUrl(board.token),
      total: roles.length,
      remote: roles.filter((role) => role.workplace === "remote").length,
      roles: roles.sort(byRemoteThenNewest).slice(0, MAX_ROLES),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    // Board down, renamed or slow: the page falls back to the careers link.
    return null;
  }
}

/** Open-role counts per company slug, for the badges on the list. */
export async function getHiringSummary(): Promise<HiringSummary> {
  "use cache";
  cacheLife("hours");
  cacheTag("roles");

  const summary: HiringSummary = {};
  const queue = Object.entries(BOARDS);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, SUMMARY_DEADLINE_MS);
  });

  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [slug, board] = next;
      const roles = await getOpenRoles(board);
      if (roles && roles.total > 0) summary[slug] = { total: roles.total, remote: roles.remote };
    }
  };
  const workers = Array.from({ length: SUMMARY_CONCURRENCY }, worker);

  await Promise.race([Promise.all(workers), deadline]);
  clearTimeout(timer);
  queue.length = 0; // stop handing out boards once the deadline has passed
  return { ...summary };
}

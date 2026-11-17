import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import boardsFile from "@/data/job-boards.json";
import { PROVIDERS, type Board, type ProviderId, type Role, type RoleDetail } from "./providers";
import { sanitizePosting } from "./sanitize";

export type { Board, Pay, ProviderId, Role, RoleDetail, Workplace } from "./providers";

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

// Enough to keep every remote role of the busiest boards (remote roles sort first).
const MAX_ROLES = 400;
const FETCH_TIMEOUT_MS = 8_000;
// Prerendering fails if a cache fill takes 50s, so a pass over every board
// gives up on slow ones well before that; they're simply skipped until the next run.
const BOARDS_DEADLINE_MS = 30_000;
const BOARDS_CONCURRENCY = 24;

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

/** Runs `visit` with each company's open roles, a few boards at a time, within a deadline. */
export async function forEachBoard(visit: (slug: string, roles: OpenRoles) => void) {
  const queue = Object.entries(BOARDS);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, BOARDS_DEADLINE_MS);
  });
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [slug, board] = next;
      const roles = await getOpenRoles(board);
      if (roles) visit(slug, roles);
    }
  };
  await Promise.race([Promise.all(Array.from({ length: BOARDS_CONCURRENCY }, worker)), deadline]);
  clearTimeout(timer);
  queue.length = 0; // stop handing out boards once the deadline has passed
}

/** Open-role counts per company slug, for the badges on the list. */
export async function getHiringSummary(): Promise<HiringSummary> {
  "use cache";
  cacheLife("hours");
  cacheTag("roles");

  const summary: HiringSummary = {};
  await forEachBoard((slug, roles) => {
    if (roles.total > 0) summary[slug] = { total: roles.total, remote: roles.remote };
  });
  return { ...summary };
}

/** One posting's full description, sanitized. Postings rarely change, so it's cached for days. */
export async function getRoleDetail(board: Board, id: string): Promise<RoleDetail | null> {
  "use cache";
  cacheLife("days");
  cacheTag("roles", `role:${board.provider}:${board.token}:${id}`);

  const provider = PROVIDERS[board.provider];
  if (!provider) return null;
  try {
    const url = provider.detailUrl?.(board.token, id) ?? provider.apiUrl(board.token);
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const detail = provider.normalizeDetail(await response.json(), id);
    if (!detail) return null;
    const html = sanitizePosting(detail.html);
    return html ? { ...detail, html } : null;
  } catch {
    return null;
  }
}

/** How many companies have a job board we can read. */
export const BOARD_COUNT = Object.keys(BOARDS).length;

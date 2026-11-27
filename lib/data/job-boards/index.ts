import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { BOARDS, readSnapshot, type Snapshot } from "../snapshot";
import { fetchBoard } from "./fetcher";
import { boardKey, type OpenRoles } from "./open-roles";
import { PROVIDERS, type Board, type RoleDetail } from "./providers";
import { sanitizePosting } from "./sanitize";

export type { Board, Pay, ProviderId, Role, RoleDetail, Workplace } from "./providers";
export type { OpenRoles } from "./open-roles";
export { findRole, mergedRoleIds, roleLocations } from "./dedupe";

export type HiringSummary = Record<string, { total: number; remote: number }>;

export function getBoard(slug: string): Board | null {
  return BOARDS[slug] ?? null;
}

/** A board's open roles, from the hourly snapshot. null when the board couldn't be read. */
export async function getOpenRoles(board: Board): Promise<OpenRoles | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("roles", `roles:${board.provider}:${board.token}`);

  return (await readSnapshot()).boards[boardKey(board)] ?? null;
}

/** Runs `visit` with each company's open roles. One board belongs to one company; none is visited twice. */
export async function forEachBoard(visit: (slug: string, roles: OpenRoles) => void) {
  forEachBoardIn(await readSnapshot(), visit);
}

/** The same, over a given snapshot (the cron uses the one it just built). */
export function forEachBoardIn({ boards }: Snapshot, visit: (slug: string, roles: OpenRoles) => void) {
  const seen = new Set<string>();
  for (const [slug, board] of Object.entries(BOARDS)) {
    const key = boardKey(board);
    if (seen.has(key)) continue;
    seen.add(key);
    const roles = boards[key];
    if (roles) visit(slug, roles);
  }
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
  return summary;
}

/** One posting's full description, sanitized. Postings rarely change, so it's cached for days. */
export async function getRoleDetail(board: Board, id: string): Promise<RoleDetail | null> {
  "use cache";
  cacheLife("days");
  cacheTag("roles", `role:${board.provider}:${board.token}:${id}`);

  const provider = PROVIDERS[board.provider];
  if (!provider) return null;
  try {
    // A posting's own endpoint, else the board's list when it carries descriptions; some boards have neither.
    const data = provider.detailUrl
      ? await fetchBoard(provider.detailUrl(board.token, id))
      : provider.detailFromList
        ? await fetchBoard(provider.apiUrl(board.token), { as: provider.format })
        : null;
    if (data === null) return null;
    const detail = provider.normalizeDetail(data, id);
    if (!detail) return null;
    const html = sanitizePosting(detail.html);
    return html ? { ...detail, html } : null;
  } catch {
    return null;
  }
}

/** How many companies have a job board we can read. */
export const BOARD_COUNT = Object.keys(BOARDS).length;

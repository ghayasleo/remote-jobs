import { dedupeRoles } from "./dedupe";
import { PROVIDERS, type Board, type Fetcher, type ProviderId, type Role } from "./providers";

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

// Enough to keep every remote role of the busiest boards (remote roles sort first).
const MAX_ROLES = 400;

/** One board's identity: its provider and token. Tokens are compared without case. */
export const boardKey = (board: Board) => `${board.provider}:${board.token.toLowerCase()}`;

const byRemoteThenNewest = (a: Role, b: Role) =>
  Number(b.workplace === "remote") - Number(a.workplace === "remote") ||
  (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

/** Reads one board live. null when it's down, renamed or slow. */
export async function fetchOpenRoles(board: Board, get: Fetcher): Promise<OpenRoles | null> {
  const provider = PROVIDERS[board.provider];
  if (!provider) return null;
  try {
    const data = provider.load
      ? await provider.load(board.token, get)
      : await get(provider.apiUrl(board.token), { as: provider.format });
    if (data === null) return null;
    const roles = dedupeRoles(provider.normalize(data, board.token).filter((role) => role.url));
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
    return null;
  }
}

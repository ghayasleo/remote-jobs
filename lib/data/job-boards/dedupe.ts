// One listing per real job. Boards repeat themselves: the same role reposted
// under new ids (Instructure listed one role six times), and the same role
// posted once per country ("Remote Canada", "Remote US"). This folds both
// into the role that represents them, keeping the others' ids so their pages
// still resolve.
//
// No runtime imports: scripts and tests load this file directly.

import type { Role } from "./providers";

/** "Sr. Engineer – Payments (m/w/d)" and "sr engineer payments m w d" are the same title. */
export const normalizeText = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const newestFirst = (a: Role, b: Role) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

/**
 * Roles with the same title and workplace are one job. Within it, postings
 * for the same location are reposts: the newest stays and the rest become its
 * `duplicateIds`. Postings for other locations become `alternates` of the
 * newest one. A different workplace (a remote and an office version) or a
 * different title ("AE, Germany" and "AE, France") stays separate.
 */
export function dedupeRoles(roles: Role[]): Role[] {
  const groups = new Map<string, Role[]>();
  const seenIds = new Set<string>();
  for (const role of roles) {
    if (seenIds.has(role.id)) continue;
    seenIds.add(role.id);
    const key = `${normalizeText(role.title)}|${role.workplace ?? ""}`;
    const group = groups.get(key);
    if (group) group.push(role);
    else groups.set(key, [role]);
  }

  const result: Role[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    // One posting per location: the newest, with its reposts' ids.
    const byLocation = new Map<string, Role>();
    for (const role of [...group].sort(newestFirst)) {
      const where = normalizeText(role.location);
      const kept = byLocation.get(where);
      if (kept) kept.duplicateIds = [...(kept.duplicateIds ?? []), role.id];
      else byLocation.set(where, { ...role });
    }
    const [primary, ...alternates] = byLocation.values();
    result.push(alternates.length ? { ...primary, alternates } : primary);
  }
  return result;
}

/** Where a role, with its alternates, is open: its own location first. */
export function roleLocations(role: Role): string[] {
  return [...new Set([role.location, ...(role.alternates ?? []).map((alternate) => alternate.location)].filter(Boolean))];
}

/** Every other id folded into a role: its reposts, its alternates and theirs. */
export function mergedRoleIds(role: Role): string[] {
  return [
    ...(role.duplicateIds ?? []),
    ...(role.alternates ?? []).flatMap((alternate) => [alternate.id, ...(alternate.duplicateIds ?? [])]),
  ];
}

/**
 * Finds the posting with this id among deduped roles: the role it belongs to
 * (`primary`), the posting itself (a primary or an alternate), and whether the
 * id was a repost folded into that posting.
 */
export function findRole(roles: Role[], id: string): { primary: Role; posting: Role; repost: boolean } | null {
  for (const primary of roles) {
    for (const posting of [primary, ...(primary.alternates ?? [])]) {
      if (posting.id === id) return { primary, posting, repost: false };
      if (posting.duplicateIds?.includes(id)) return { primary, posting, repost: true };
    }
  }
  return null;
}

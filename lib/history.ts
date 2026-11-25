// The daily history of remote hiring, recorded by
// .github/workflows/record-history.yml onto the repo's "data" branch.
//
// Each day gets one file: the day's numbers (the Insights figures and every
// company's open roles) plus the roles that opened and closed since the last
// record. history/state.json keeps the open roles between runs.
//
// Plain TypeScript with no path aliases, so Node runs it straight from the
// recorder script.

export type HistoryRole = {
  company: string;
  id: string;
  title: string;
  category: string;
  location: string;
  postedAt: string | null;
  salary: string | null;
  /** Ids folded into this listing (reposts, the same role in other locations): still open, not closed. */
  mergedIds?: string[];
};

export type HistoryState = { date: string; active: string[] };

export type HistoryDay = {
  date: string;
  /** The previous record's date, or null for the first one. */
  since: string | null;
  /** The first record lists every open role as "opened"; it's a baseline, not a day's openings. */
  baseline: boolean;
  insights: unknown;
  hiring: Record<string, { total: number; remote: number }>;
  opened: HistoryRole[];
  closed: string[];
};

export const roleKey = (role: { company: string; id: string }) => `${role.company}/${role.id}`;

const pick = ({ company, id, title, category, location, postedAt, salary }: HistoryRole): HistoryRole => ({
  company,
  id,
  title,
  category,
  location,
  postedAt: postedAt ?? null,
  salary: salary ?? null,
});

/** One day's record and the state to keep for the next run. */
export function recordDay({
  date,
  insights,
  hiring,
  roles,
  previous,
}: {
  date: string;
  insights: unknown;
  hiring: HistoryDay["hiring"];
  roles: HistoryRole[];
  previous: HistoryState | null;
}): { day: HistoryDay; state: HistoryState } {
  const unique = [...new Map(roles.map((role) => [roleKey(role), role])).values()];
  // Every id a listing stands for: a repost or another location's posting
  // folded into it stays open until its board drops it.
  const keysOf = (role: HistoryRole) => [roleKey(role), ...(role.mergedIds ?? []).map((id) => roleKey({ company: role.company, id }))];
  const active = [...new Set(unique.flatMap(keysOf))].sort();
  const before = new Set(previous?.active ?? []);
  const now = new Set(active);

  return {
    day: {
      date,
      since: previous?.date ?? null,
      baseline: previous === null,
      insights,
      hiring,
      // A listing whose ids were already open isn't new (a repost that became the listed one).
      opened: unique
        .filter((role) => !keysOf(role).some((key) => before.has(key)))
        .map(pick)
        .sort((a, b) => roleKey(a).localeCompare(roleKey(b))),
      closed: (previous?.active ?? []).filter((key) => !now.has(key)),
    },
    state: { date, active },
  };
}

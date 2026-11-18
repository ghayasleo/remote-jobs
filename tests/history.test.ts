import { describe, expect, it } from "vitest";
import { recordDay, type HistoryRole } from "@/lib/history";

const role = (company: string, id: string, title = "Engineer"): HistoryRole => ({
  company,
  id,
  title,
  category: "engineering",
  location: "Remote",
  postedAt: null,
  salary: null,
});

describe("recordDay", () => {
  it("lists every role as a baseline on the first run", () => {
    const { day, state } = recordDay({
      date: "2026-11-18",
      insights: { remoteRoles: 2 },
      hiring: { a: { total: 3, remote: 2 } },
      roles: [role("a", "2"), role("a", "1"), role("a", "1")],
      previous: null,
    });
    expect(day.baseline).toBe(true);
    expect(day.since).toBeNull();
    expect(day.opened.map((r) => r.id)).toEqual(["1", "2"]);
    expect(day.closed).toEqual([]);
    expect(state).toEqual({ date: "2026-11-18", active: ["a/1", "a/2"] });
  });

  it("records what opened and closed since the last run", () => {
    const { day, state } = recordDay({
      date: "2026-11-19",
      insights: {},
      hiring: {},
      roles: [role("a", "2"), role("b", "9", "Designer")],
      previous: { date: "2026-11-18", active: ["a/1", "a/2"] },
    });
    expect(day.baseline).toBe(false);
    expect(day.since).toBe("2026-11-18");
    expect(day.opened).toEqual([role("b", "9", "Designer")]);
    expect(day.closed).toEqual(["a/1"]);
    expect(state.active).toEqual(["a/2", "b/9"]);
  });
});

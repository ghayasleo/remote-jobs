import { describe, expect, it } from "vitest";
import type { HistoryDay, HistoryRole } from "@/lib/history";
import { buildWeeklyReport, datesBetween, finishedWeeks, weekKey, weekLabel, weekRange, weekStart } from "@/lib/weekly";

const role = (company: string, id: string, category = "engineering", salary: string | null = null): HistoryRole => ({
  company,
  id,
  title: `Role ${id}`,
  category,
  location: "Remote",
  postedAt: null,
  salary,
});
const day = (date: string, extra: Partial<HistoryDay> = {}): HistoryDay => ({
  date,
  since: null,
  baseline: false,
  insights: { remoteRoles: 100, hiringCompanies: 10 },
  hiring: {},
  opened: [],
  closed: [],
  ...extra,
});

describe("weeks", () => {
  it("names weeks like ISO weeks, Monday to Sunday", () => {
    expect(weekStart("2026-11-18")).toBe("2026-11-16");
    expect(weekKey("2026-11-18")).toBe("2026-w47");
    expect(weekKey("2027-01-01")).toBe("2026-w53");
    expect(weekRange("2026-w47")).toEqual({ start: "2026-11-16", end: "2026-11-22" });
    expect(weekRange("2026-w99")).toBeNull();
    expect(weekRange("nope")).toBeNull();
    expect(datesBetween("2026-11-16", "2026-11-18")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
    expect(weekLabel({ start: "2026-11-16", end: "2026-11-22" })).toBe("Nov 16 – 22, 2026");
  });

  it("lists only finished weeks since recording started", () => {
    expect(finishedWeeks("2026-11-20")).toEqual([]);
    expect(finishedWeeks("2026-11-23")).toEqual(["2026-w47"]);
    expect(finishedWeeks("2026-12-01")).toEqual(["2026-w48", "2026-w47"]);
  });
});

describe("buildWeeklyReport", () => {
  it("counts openings and closings but not the baseline", () => {
    const report = buildWeeklyReport({
      key: "2026-w47",
      before: null,
      names: new Map([["acme", "Acme"]]),
      days: [
        day("2026-11-18", { baseline: true, opened: [role("acme", "0")], insights: { remoteRoles: 90, hiringCompanies: 9 } }),
        day("2026-11-19", {
          opened: [role("acme", "1", "engineering", "$150K – $200K • Offers Equity"), role("beta", "2", "sales")],
          closed: ["acme/0"],
        }),
        day("2026-11-20", { opened: [role("acme", "3", "engineering", "$40 – $60 per hour")], insights: { remoteRoles: 95, hiringCompanies: 11 } }),
      ],
    });
    expect(report.opened).toBe(3);
    expect(report.closed).toBe(1);
    expect(report.openAtStart).toBe(90);
    expect(report.openAtEnd).toBe(95);
    expect(report.hiringAtEnd).toBe(11);
    expect(report.topCompanies[0]).toEqual({ slug: "acme", name: "Acme", count: 2 });
    expect(report.categories[0]).toEqual({ key: "engineering", label: "Engineering", count: 2 });
    expect(report.bestPaid.map((r) => r.id)).toEqual(["1"]);
    expect(report.partial).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { boardOrder, cleanTrackedJob, mergeTracked, orderBetween, trackKey, withStatus, type TrackedJob } from "@/lib/tracker-model";

const job = (overrides: Partial<TrackedJob> = {}): TrackedJob => ({
  key: "acme/1",
  company: "acme",
  companyName: "Acme",
  domain: "acme.com",
  id: "1",
  title: "Engineer",
  location: "Remote",
  status: "saved",
  note: "",
  savedAt: "2026-11-01T00:00:00.000Z",
  appliedAt: null,
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

describe("cleanTrackedJob", () => {
  it("keeps a valid job and rebuilds its key", () => {
    expect(cleanTrackedJob({ ...job(), key: "wrong" })).toEqual(job());
  });

  it("rejects things that aren't jobs", () => {
    expect(cleanTrackedJob(null)).toBeNull();
    expect(cleanTrackedJob({ company: "acme" })).toBeNull();
    expect(cleanTrackedJob({ ...job(), updatedAt: "yesterday" })).toBeNull();
  });

  it("caps long fields and falls back on unknown statuses", () => {
    const cleaned = cleanTrackedJob({ ...job(), status: "hired", note: "x".repeat(5000) })!;
    expect(cleaned.status).toBe("saved");
    expect(cleaned.note).toHaveLength(2000);
  });

  it("keeps removals", () => {
    expect(cleanTrackedJob({ ...job(), deleted: true })?.deleted).toBe(true);
  });
});

describe("mergeTracked", () => {
  it("keeps the newer change of each job", () => {
    const old = job({ status: "saved" });
    const newer = job({ status: "applied", updatedAt: "2026-11-02T00:00:00.000Z" });
    const other = job({ key: trackKey({ company: "beta", id: "2" }), company: "beta", id: "2" });
    expect(mergeTracked([newer, other], [old])).toEqual([newer, other]);
    expect(mergeTracked([old], [newer])).toEqual([newer]);
  });

  it("lets a newer removal win", () => {
    const removed = job({ deleted: true, updatedAt: "2026-11-03T00:00:00.000Z" });
    expect(mergeTracked([job()], [removed])).toEqual([removed]);
  });
});

describe("withStatus", () => {
  it("records when you applied, and keeps that date as you move on", () => {
    const applied = withStatus(job(), "applied", "2026-11-05T00:00:00.000Z");
    expect(applied.appliedAt).toBe("2026-11-05T00:00:00.000Z");
    const interviewing = withStatus(applied, "interviewing", "2026-11-09T00:00:00.000Z");
    expect(interviewing.appliedAt).toBe("2026-11-05T00:00:00.000Z");
    expect(withStatus(interviewing, "saved", "2026-11-10T00:00:00.000Z").appliedAt).toBeNull();
  });
});

describe("board order", () => {
  it("keeps a set order through cleaning, and drops nonsense", () => {
    expect(cleanTrackedJob({ ...job(), order: -12.5 })?.order).toBe(-12.5);
    expect(cleanTrackedJob({ ...job(), order: "first" })?.order).toBeUndefined();
    expect(cleanTrackedJob({ ...job(), order: Number.NaN })?.order).toBeUndefined();
  });

  it("puts newer saves first when no order is set", () => {
    const older = { ...job(), savedAt: "2026-11-01T00:00:00.000Z" };
    const newer = { ...job(), savedAt: "2026-11-20T00:00:00.000Z" };
    expect(boardOrder(newer)).toBeLessThan(boardOrder(older));
  });

  it("places a dropped job between its neighbours, or past the end", () => {
    const a = { ...job(), order: 10 };
    const b = { ...job(), order: 20 };
    expect(orderBetween(a, b)).toBe(15);
    expect(orderBetween(b, undefined)).toBeGreaterThan(20);
    expect(orderBetween(undefined, a)).toBeLessThan(10);
    expect(orderBetween(undefined, undefined)).toBeLessThan(0);
  });
});

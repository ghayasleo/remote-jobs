import { describe, expect, it } from "vitest";
import { alertPayload, canonicalQuery, cleanSubscription, isDue, newRolesFor } from "@/lib/alerts-model";
import type { JobListing } from "@/lib/jobs";

const job = (id: string, title: string, postedAt: string | null, category: JobListing["category"] = "engineering"): JobListing => ({
  id,
  company: "acme",
  companyName: "Acme",
  domain: "acme.com",
  title,
  location: "Remote - Europe",
  team: null,
  employmentType: null,
  salary: null,
  postedAt,
  category,
});

describe("cleanSubscription", () => {
  it("keeps a browser push subscription and rejects anything else", () => {
    const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123def456", keys: { p256dh: "BNc", auth: "tBH" } };
    expect(cleanSubscription(sub)).toEqual(sub);
    expect(cleanSubscription({ ...sub, endpoint: "http://insecure.test/x" })).toBeNull();
    expect(cleanSubscription({ endpoint: sub.endpoint })).toBeNull();
    expect(cleanSubscription(null)).toBeNull();
  });
});

describe("canonicalQuery", () => {
  it("stores one form of each search", () => {
    expect(canonicalQuery("?where=europe&category=engineering&junk=1")).toBe("?category=engineering&where=europe");
    expect(canonicalQuery("")).toBe("");
  });
});

describe("isDue", () => {
  const now = new Date("2026-11-27T12:00:00Z");
  it("checks hourly alerts every time and daily ones once a day", () => {
    expect(isDue({ frequency: "hourly", last_sent_at: "2026-11-27T11:30:00Z" }, now)).toBe(true);
    expect(isDue({ frequency: "daily", last_sent_at: "2026-11-27T01:00:00Z" }, now)).toBe(false);
    expect(isDue({ frequency: "daily", last_sent_at: "2026-11-26T12:30:00Z" }, now)).toBe(true);
  });
});

describe("newRolesFor and alertPayload", () => {
  const jobs = [
    job("1", "Backend Engineer", "2026-11-27T10:00:00.000Z"),
    job("2", "Product Designer", "2026-11-27T10:30:00.000Z", "design"),
    job("3", "Frontend Engineer", "2026-11-26T09:00:00.000Z"),
    job("4", "Platform Engineer", null),
  ];
  const now = new Date("2026-11-27T12:00:00Z");

  it("finds matching roles posted since the last notification", () => {
    expect(newRolesFor(jobs, "?category=engineering", "2026-11-27T00:00:00Z", now).map((role) => role.id)).toEqual(["1"]);
    expect(newRolesFor(jobs, "", "2026-11-27T00:00:00Z", now).map((role) => role.id)).toEqual(["2", "1"]);
  });

  it("links one role straight to its page, several to the search", () => {
    const alert = { id: "a1", label: "Engineering", query: "?category=engineering" };
    const one = alertPayload(alert, [jobs[0]]);
    expect(one.title).toBe("1 new remote role · Engineering");
    expect(one.url).toMatch(/^\/jobs\/acme\/1\//);
    const many = alertPayload(alert, [jobs[0], jobs[1], jobs[2], jobs[3]]);
    expect(many.title).toBe("4 new remote roles · Engineering");
    expect(many.body).toContain("…and 1 more");
    expect(many.url).toBe("/jobs?category=engineering");
  });
});

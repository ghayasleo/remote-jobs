import { describe, expect, it } from "vitest";
import { dedupeRoles, findRole, mergedRoleIds, roleLocations } from "@/lib/data/job-boards/dedupe";
import type { Role } from "@/lib/data/job-boards/providers";

const role = (id: string, title: string, location: string, postedAt: string | null, workplace: Role["workplace"] = "remote"): Role => ({
  id,
  title,
  location,
  workplace,
  team: null,
  employmentType: null,
  salary: null,
  pay: null,
  url: `https://example.com/jobs/${id}`,
  postedAt,
});

describe("dedupeRoles", () => {
  it("folds reposts of one posting into the newest, keeping the others' ids", () => {
    // Instructure listed the same role six times.
    const roles = [
      role("a", "Senior Account Executive - Canvas - K12", "United States", "2026-09-23"),
      role("b", "Senior Account Executive – Canvas – K12", "United States", "2026-11-23"),
      role("c", "senior account executive canvas k12", "United States", "2026-11-13"),
    ];
    const [only, ...rest] = dedupeRoles(roles);
    expect(rest).toEqual([]);
    expect(only.id).toBe("b");
    expect(only.duplicateIds).toEqual(["c", "a"]);
    expect(only.alternates).toBeUndefined();
  });

  it("shows a role posted once per location as one, with the others as alternates", () => {
    const roles = [
      role("ca", "Senior Staff Partnerships Lead, Gaming", "Remote Canada", "2026-11-01"),
      role("us", "Senior Staff Partnerships Lead, Gaming", "Remote US", "2026-11-02"),
    ];
    const [only, ...rest] = dedupeRoles(roles);
    expect(rest).toEqual([]);
    expect(only.id).toBe("us");
    expect(only.alternates?.map((alternate) => alternate.id)).toEqual(["ca"]);
    expect(roleLocations(only)).toEqual(["Remote US", "Remote Canada"]);
    expect(mergedRoleIds(only)).toEqual(["ca"]);
  });

  it("keeps different workplaces, different titles and different ids apart", () => {
    const roles = [
      role("1", "Staff Engineer", "Remote", "2026-11-01"),
      role("2", "Staff Engineer", "London", "2026-11-01", "onsite"),
      role("3", "Account Executive, Germany", "Remote", "2026-11-01"),
      role("4", "Account Executive, France", "Remote", "2026-11-01"),
      role("1", "Staff Engineer", "Remote", "2026-11-01"), // the same id twice is one posting
    ];
    expect(dedupeRoles(roles).map((kept) => kept.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("doesn't change the roles it was given", () => {
    const roles = [role("a", "Engineer", "Remote", "2026-11-01"), role("b", "Engineer", "Remote", "2026-11-02")];
    dedupeRoles(roles);
    expect(roles[1].duplicateIds).toBeUndefined();
  });
});

describe("findRole", () => {
  const roles = dedupeRoles([
    role("us", "Designer", "Remote US", "2026-11-03"),
    role("us-old", "Designer", "Remote US", "2026-10-01"),
    role("ca", "Designer", "Remote Canada", "2026-11-01"),
    role("other", "Writer", "Remote", "2026-11-01"),
  ]);

  it("finds a main posting, an alternate, and a repost", () => {
    expect(findRole(roles, "us")).toMatchObject({ posting: { id: "us" }, primary: { id: "us" }, repost: false });
    expect(findRole(roles, "ca")).toMatchObject({ posting: { id: "ca" }, primary: { id: "us" }, repost: false });
    expect(findRole(roles, "us-old")).toMatchObject({ posting: { id: "us" }, repost: true });
    expect(findRole(roles, "missing")).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CompanyProfile } from "@/lib/data/parse";
import { boardKey } from "@/lib/data/job-boards/open-roles";
import type { Board, Fetcher } from "@/lib/data/job-boards/providers";
import { buildSnapshot, type Snapshot } from "@/lib/data/snapshot-build";

const greenhouse = JSON.parse(readFileSync("tests/fixtures/boards/greenhouse.json", "utf8"));

const company = (slug: string): CompanyProfile => ({
  slug,
  name: slug,
  website: `https://${slug}.com`,
  domain: `${slug}.com`,
  careersUrl: null,
  region: "worldwide",
  remotePolicy: "fully-remote",
  companySize: null,
  technologies: [],
  addedAt: null,
  updatedAt: null,
  blurb: "",
  aliases: [],
  sections: [],
});

const BOARDS: Record<string, Board> = {
  acme: { provider: "greenhouse", token: "acme" },
  beta: { provider: "greenhouse", token: "beta" },
  // The same board under a second slug: read once.
  "acme-2": { provider: "greenhouse", token: "ACME" },
};

const companies = async () => new Map(["acme", "beta"].map((slug) => [slug, company(slug)]));
const failing: Fetcher = async () => null;
const working: Fetcher = async () => greenhouse;

describe("buildSnapshot", () => {
  it("reads every board once and keeps the companies", async () => {
    const calls: string[] = [];
    const get: Fetcher = async (url) => {
      calls.push(url);
      return greenhouse;
    };
    const { snapshot, stats } = await buildSnapshot(BOARDS, null, { get, loadCompanies: companies });
    expect(calls).toHaveLength(2);
    expect(Object.keys(snapshot.boards).sort()).toEqual(["greenhouse:acme", "greenhouse:beta"]);
    expect(snapshot.companies.map((c) => c.slug)).toEqual(["acme", "beta"]);
    expect(stats).toMatchObject({ boards: 2, fetched: 2, carried: 0, failed: 0, companiesChanged: true });
  });

  it("keeps a failing board's roles from the last snapshot for a day, then drops them", async () => {
    const first = (await buildSnapshot(BOARDS, null, { get: working, loadCompanies: companies })).snapshot;
    const stale: Snapshot = {
      ...first,
      boards: {
        ...first.boards,
        [boardKey(BOARDS.beta)]: { ...first.boards[boardKey(BOARDS.beta)], fetchedAt: "2000-01-01T00:00:00.000Z" },
      },
    };
    const { snapshot, stats } = await buildSnapshot(BOARDS, stale, { get: failing, loadCompanies: companies });
    expect(Object.keys(snapshot.boards)).toEqual(["greenhouse:acme"]);
    expect(stats).toMatchObject({ fetched: 0, carried: 1, failed: 1 });
  });

  it("keeps the last company list when the download fails, and says nothing changed", async () => {
    const first = (await buildSnapshot(BOARDS, null, { get: working, loadCompanies: companies })).snapshot;
    const broken = async () => {
      throw new Error("GitHub is down");
    };
    const { snapshot, stats } = await buildSnapshot(BOARDS, first, { get: working, loadCompanies: broken });
    expect(snapshot.companies).toEqual(first.companies);
    expect(stats.companiesChanged).toBe(false);
  });

  it("fails without a company list to fall back on", async () => {
    const broken = async () => {
      throw new Error("GitHub is down");
    };
    await expect(buildSnapshot(BOARDS, null, { get: working, loadCompanies: broken })).rejects.toThrow("GitHub is down");
  });
});

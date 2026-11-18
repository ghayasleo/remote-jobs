// Records one day of hiring history into a checkout of the "data" branch.
// Run by .github/workflows/record-history.yml:
//
//   node scripts/record-history.mts <data-branch-checkout>
//
// It reads the live site's own JSON (the same numbers the pages show), so the
// history matches what visitors saw that day.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recordDay, type HistoryRole, type HistoryState } from "../lib/history.ts";

const SITE = process.env.SITE_URL ?? "https://remotejobs.ghayasuddin.net";
const root = process.argv[2];
if (!root) throw new Error("Usage: node scripts/record-history.mts <data-branch-checkout>");

async function getJson<T>(path: string, attempt = 1): Promise<T> {
  try {
    const response = await fetch(new URL(path, SITE), {
      headers: { "user-agent": "remotejobs-history (+https://github.com/ghayasleo/remote-jobs)" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);
    return (await response.json()) as T;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 10_000));
    return getJson(path, attempt + 1);
  }
}

const date = new Date().toISOString().slice(0, 10);
const dir = join(root, "history");
const dayPath = join(dir, "days", `${date}.json`);
const statePath = join(dir, "state.json");

if (existsSync(dayPath)) {
  console.log(`${date} is already recorded.`);
  process.exit(0);
}

const [insights, explore, roles] = await Promise.all([
  getJson<{ remoteRoles: number }>("/data/insights.json"),
  getJson<{ hiring: Record<string, { total: number; remote: number }> }>("/data/explore.json"),
  getJson<HistoryRole[]>("/data/jobs.json"),
]);
const previous: HistoryState | null = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : null;

const { day, state } = recordDay({ date, insights, hiring: explore.hiring, roles, previous });

mkdirSync(join(dir, "days"), { recursive: true });
writeFileSync(dayPath, `${JSON.stringify(day)}\n`);
// One role per line, so the daily git diff is just the roles that changed.
writeFileSync(statePath, `${JSON.stringify(state, null, 1)}\n`);

console.log(
  `${date}: ${state.active.length} open remote roles, ${day.opened.length} opened and ${day.closed.length} closed since ${day.since ?? "the start"}${day.baseline ? " (baseline)" : ""}.`,
);

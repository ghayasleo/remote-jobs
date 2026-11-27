// Builds the data snapshot (every company profile and every job board's open
// roles) and uploads it to Vercel Blob, as the hourly cron (/api/cron/snapshot)
// does in production. Use it to seed a new Blob store, or to look at the data:
//
//   npm run snapshot:refresh            # build and upload (needs BLOB_READ_WRITE_TOKEN in .env.local)
//   npm run snapshot:refresh -- --dry   # build only; writes snapshot.json to the given path or the cwd
import { readFileSync, writeFileSync } from "node:fs";
import { get, put } from "@vercel/blob";
import type { Board } from "../lib/data/job-boards/providers";
import { buildSnapshot, type Snapshot } from "../lib/data/snapshot-build";

const SNAPSHOT_PATH = "snapshot/v1.json";
const dry = process.argv.includes("--dry");
const out = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "snapshot.json";

const boards = (JSON.parse(readFileSync(new URL("../data/job-boards.json", import.meta.url), "utf8")) as {
  boards: Record<string, Board>;
}).boards;

let previous: Snapshot | null = null;
if (!dry && process.env.BLOB_READ_WRITE_TOKEN) {
  const result = await get(SNAPSHOT_PATH, { access: "public" }).catch(() => null);
  if (result?.statusCode === 200) previous = (await new Response(result.stream).json()) as Snapshot;
}

const { snapshot, stats } = await buildSnapshot(boards, previous);
const body = JSON.stringify(snapshot);
console.log({ ...stats, megabytes: +(body.length / 1e6).toFixed(2) });

if (dry) {
  writeFileSync(out, body);
  console.log(`Wrote ${out}`);
} else {
  const blob = await put(SNAPSHOT_PATH, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  console.log(`Uploaded ${blob.url}`);
}

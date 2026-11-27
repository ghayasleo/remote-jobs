import "server-only";

import { get as getBlob, put } from "@vercel/blob";
import boardsFile from "@/data/job-boards.json";
import type { Board } from "./job-boards/providers";
import { buildSnapshot, type Snapshot, type SnapshotStats } from "./snapshot-build";

export type { Snapshot } from "./snapshot-build";

/** Board per company slug, found by scripts/find-job-boards.mts. */
export const BOARDS = (boardsFile as { boards: Record<string, Board> }).boards;

const SNAPSHOT_PATH = "snapshot/v1.json";
// How long a server keeps its copy before checking Blob for a newer one. The
// snapshot itself changes hourly.
const FRESH_MS = 5 * 60 * 1000;
// Without a stored snapshot (local development before the first refresh), a
// page builds one itself, so it gets the old per-board deadline.
const LIVE_DEADLINE_MS = 30_000;

// Only a finished snapshot is shared, never a pending download: a "use cache"
// function that waits on a promise another one started can hang (development
// mode reports it as a deadlock).
let memo: { snapshot: Snapshot; loadedAt: number } | null = null;

const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function downloadSnapshot(): Promise<Snapshot | null> {
  if (!blobConfigured()) return null;
  try {
    const result = await getBlob(SNAPSHOT_PATH, { access: "public" });
    if (!result || result.statusCode !== 200) return null;
    const snapshot = (await new Response(result.stream).json()) as Snapshot;
    return snapshot?.version === 1 && Array.isArray(snapshot.companies) ? snapshot : null;
  } catch {
    return null;
  }
}

/**
 * The latest snapshot: read from Blob at most every five minutes per server,
 * or built live when Blob has none yet.
 */
export async function readSnapshot(): Promise<Snapshot> {
  if (memo && Date.now() - memo.loadedAt < FRESH_MS) return memo.snapshot;
  const snapshot =
    (await downloadSnapshot()) ??
    memo?.snapshot ??
    (await buildSnapshot(BOARDS, null, { deadlineMs: LIVE_DEADLINE_MS })).snapshot;
  memo = { snapshot, loadedAt: Date.now() };
  return snapshot;
}

/** Reads every source again and replaces the stored snapshot. Run by the hourly cron. */
export async function refreshSnapshot(): Promise<SnapshotStats & { builtAt: string }> {
  if (!blobConfigured()) throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  const previous = await downloadSnapshot();
  const { snapshot, stats } = await buildSnapshot(BOARDS, previous);
  await put(SNAPSHOT_PATH, JSON.stringify(snapshot), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    // Servers re-check every few minutes; the CDN may keep a copy for one.
    cacheControlMaxAge: 60,
  });
  memo = { snapshot, loadedAt: Date.now() };
  return { ...stats, builtAt: snapshot.builtAt };
}

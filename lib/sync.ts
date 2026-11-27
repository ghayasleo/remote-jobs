"use client";

import { useEffect, useSyncExternalStore } from "react";
import { signOut, useProfile } from "./auth/client";
import { SAVED_CHANGE_EVENT, applySyncedCompanies, forgetSaved, savedChanges, type SavedChange } from "./saved";
import { TRACKER_CHANGE_EVENT, allTrackedJobs, forgetTracked, replaceTracked } from "./tracker";
import { cleanTrackedJob, mergeTracked, type TrackedJob } from "./tracker-model";

// Keeps saved jobs, the tracker and saved companies in step with the
// signed-in account: once on load, then shortly after each change here.

export type SyncState = { status: "off" | "syncing" | "synced" | "error"; at: string | null };

let state: SyncState = { status: "off", at: null };
const listeners = new Set<() => void>();
const setState = (next: SyncState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export function useSyncState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

const DEBOUNCE_MS = 1200;
let applying = false;
let inFlight: Promise<void> | null = null;
let again = false;

async function syncNow() {
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    setState({ status: "syncing", at: state.at });
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobs: allTrackedJobs(), companies: savedChanges() }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { jobs: unknown[]; companies: SavedChange[] };
      const remote = body.jobs.map(cleanTrackedJob).filter((job): job is TrackedJob => job !== null);
      // Merge again here, so a change made while the request was in flight isn't lost.
      applying = true;
      replaceTracked(mergeTracked(allTrackedJobs(), remote));
      const local = new Map(savedChanges().map((change) => [change.slug, change]));
      for (const change of body.companies) {
        const mine = local.get(change.slug);
        if (!mine || change.updatedAt >= mine.updatedAt) local.set(change.slug, change);
      }
      applySyncedCompanies([...local.values()]);
      applying = false;
      setState({ status: "synced", at: new Date().toISOString() });
    } catch {
      applying = false;
      setState({ status: "error", at: state.at });
    } finally {
      inFlight = null;
      if (again) {
        again = false;
        void syncNow();
      }
    }
  })();
  return inFlight;
}

/**
 * Signs out, then forgets what's saved in this browser, so the next person to
 * sign in here doesn't get it. The account keeps it: one last sync goes first,
 * and if that fails (offline) the copy stays here rather than being lost.
 */
export async function signOutAndForget({ deleteAccount = false } = {}) {
  if (!deleteAccount) await syncNow();
  const synced = deleteAccount || state.status === "synced";
  const ok = await signOut({ deleteAccount });
  if (ok && synced) {
    forgetTracked();
    forgetSaved();
  }
  return ok;
}

/** Mounted once in the layout. Does nothing while signed out. */
export function useAccountSync() {
  const profile = useProfile();
  const signedIn = profile !== null;

  useEffect(() => {
    if (!signedIn) {
      setState({ status: "off", at: null });
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (applying) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    };
    void syncNow();
    window.addEventListener(TRACKER_CHANGE_EVENT, schedule);
    window.addEventListener(SAVED_CHANGE_EVENT, schedule);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(TRACKER_CHANGE_EVENT, schedule);
      window.removeEventListener(SAVED_CHANGE_EVENT, schedule);
    };
  }, [signedIn]);
}

export function AccountSync() {
  useAccountSync();
  return null;
}

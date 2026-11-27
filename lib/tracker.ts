"use client";

import { useSyncExternalStore } from "react";
import {
  NOTE_MAX,
  TRACKER_MAX,
  cleanTrackedJob,
  trackKey,
  withStatus,
  type TrackStatus,
  type TrackedJob,
} from "./tracker-model";

// Saved jobs and where each application stands, in this browser
// (localStorage). When signed in, lib/sync.ts mirrors it to the account.

const STORAGE_KEY = "remote-jobs:tracker";
export const TRACKER_CHANGE_EVENT = "remote-jobs:tracker-change";
const EMPTY: TrackedJob[] = [];

let snapshot: { raw: string | null; all: TrackedJob[]; live: TrackedJob[] } = { raw: null, all: EMPTY, live: EMPTY };

function parse(raw: string | null): TrackedJob[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    const items = Array.isArray(value) ? value : [];
    return items.map(cleanTrackedJob).filter((job): job is TrackedJob => job !== null);
  } catch {
    return EMPTY;
  }
}

function readAll(): typeof snapshot {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked: behave as empty.
  }
  if (raw !== snapshot.raw) {
    const all = parse(raw);
    const live = all.filter((job) => !job.deleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    snapshot = { raw, all, live };
  }
  return snapshot;
}

function write(all: TrackedJob[]) {
  // Oldest tombstones go first if the list ever gets too long.
  const kept = all.length > TRACKER_MAX ? [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, TRACKER_MAX) : all;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(TRACKER_CHANGE_EVENT));
  return true;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(TRACKER_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TRACKER_CHANGE_EVENT, onChange);
  };
}

const live = () => readAll().live;

/** Every tracked job, most recently changed first. */
export function useTrackedJobs(): TrackedJob[] {
  return useSyncExternalStore(subscribe, live, () => EMPTY);
}

export function useTrackedJob(key: string): TrackedJob | undefined {
  return useTrackedJobs().find((job) => job.key === key);
}

/** Everything, removals included, for syncing. */
export const allTrackedJobs = () => readAll().all;

const now = () => new Date().toISOString();

function update(key: string, change: (job: TrackedJob) => TrackedJob) {
  const all = readAll().all;
  const job = all.find((candidate) => candidate.key === key);
  if (!job) return;
  write(all.map((candidate) => (candidate === job ? change(job) : candidate)));
}

export type SavableJob = { company: string; companyName: string; domain: string | null; id: string; title: string; location: string };

/** Saves a job, or brings back one that was removed. Returns false if storage is blocked. */
export function saveJob(job: SavableJob, status: TrackStatus = "saved"): boolean {
  const key = trackKey(job);
  const time = now();
  const others = readAll().all.filter((candidate) => candidate.key !== key);
  const fresh: TrackedJob = {
    key,
    company: job.company,
    companyName: job.companyName,
    domain: job.domain,
    id: job.id,
    title: job.title,
    location: job.location,
    status: "saved",
    note: "",
    savedAt: time,
    appliedAt: null,
    updatedAt: time,
  };
  return write([...others, status === "saved" ? fresh : withStatus(fresh, status, time)]);
}

export function removeJob(key: string) {
  update(key, (job) => ({ ...job, deleted: true, updatedAt: now() }));
}

/** Puts a removed job back exactly as it was (for Undo). */
export function restoreJob(job: TrackedJob) {
  const others = readAll().all.filter((candidate) => candidate.key !== job.key);
  write([...others, { ...job, deleted: undefined, updatedAt: now() }]);
}

export function setStatus(key: string, status: TrackStatus) {
  update(key, (job) => withStatus(job, status, now()));
}

export function setNote(key: string, note: string) {
  update(key, (job) => ({ ...job, note: note.slice(0, NOTE_MAX), updatedAt: now() }));
}

/** Replaces everything (after a sync, or an import merged by the caller). */
export function replaceTracked(all: TrackedJob[]) {
  return write(all);
}

"use client";

import { useSyncExternalStore } from "react";

// Saved companies live in this browser (localStorage), newest first. Every
// component reading them stays in sync, across tabs too. When signed in,
// lib/sync.ts mirrors them to the account using the change times kept in META_KEY.

const STORAGE_KEY = "remote-jobs:saved";
const META_KEY = "remote-jobs:saved-meta";
export const SAVED_CHANGE_EVENT = "remote-jobs:saved-change";
const CHANGE_EVENT = SAVED_CHANGE_EVENT;
const EMPTY: string[] = [];

let snapshot: { raw: string | null; slugs: string[] } = { raw: null, slugs: EMPTY };

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((slug): slug is string => typeof slug === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, disabled cookies): behave as empty.
  }
  // Same string, same array: useSyncExternalStore needs a stable snapshot.
  if (raw !== snapshot.raw) snapshot = { raw, slugs: parse(raw) };
  return snapshot.slugs;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useSavedSlugs(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useIsSaved(slug: string): boolean {
  return useSavedSlugs().includes(slug);
}

/** When each company was last saved or un-saved here: { slug: { saved, updatedAt } }. */
export type SavedChange = { slug: string; saved: boolean; updatedAt: string };

function readMeta(): Record<string, { saved: boolean; updatedAt: string }> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(META_KEY) ?? "{}");
    return value && typeof value === "object" ? (value as Record<string, { saved: boolean; updatedAt: string }>) : {};
  } catch {
    return {};
  }
}

/** Every save and un-save on this device, for syncing. Companies saved before meta existed count as saved now. */
export function savedChanges(): SavedChange[] {
  const meta = readMeta();
  const time = new Date().toISOString();
  for (const slug of read()) meta[slug] ??= { saved: true, updatedAt: time };
  return Object.entries(meta).map(([slug, { saved, updatedAt }]) => ({ slug, saved, updatedAt }));
}

function writeSaved(next: string[], changed: string[]) {
  const meta = readMeta();
  const time = new Date().toISOString();
  for (const slug of changed) meta[slug] = { saved: next.includes(slug), updatedAt: time };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

/** Saves or un-saves a company. Returns true if it's now saved. */
export function toggleSaved(slug: string): boolean {
  const current = read();
  const next = current.includes(slug) ? current.filter((saved) => saved !== slug) : [slug, ...current];
  if (!writeSaved(next, [slug])) return current.includes(slug);
  return next.includes(slug);
}

/** Replaces the whole list, e.g. to undo "Clear all". */
export function replaceSaved(slugs: string[]) {
  const current = read();
  const changed = [...new Set([...current, ...slugs])].filter((slug) => current.includes(slug) !== slugs.includes(slug));
  writeSaved(slugs, changed);
}

/** Drops this browser's copy without recording removals: on sign-out, the account keeps it. */
export function forgetSaved() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(META_KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Takes the account's merged list after a sync: saved ones newest first, with their change times. */
export function applySyncedCompanies(changes: SavedChange[]) {
  const next = changes
    .filter((change) => change.saved)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((change) => change.slug);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify(Object.fromEntries(changes.map(({ slug, saved, updatedAt }) => [slug, { saved, updatedAt }]))),
    );
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

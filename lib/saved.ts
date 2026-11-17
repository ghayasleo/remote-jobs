"use client";

import { useSyncExternalStore } from "react";

// Saved companies live in this browser only (localStorage), newest first.
// Every component reading them stays in sync, across tabs too.

const STORAGE_KEY = "remote-jobs:saved";
const CHANGE_EVENT = "remote-jobs:saved-change";
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

/** Saves or un-saves a company. Returns true if it's now saved. */
export function toggleSaved(slug: string): boolean {
  const current = read();
  const next = current.includes(slug) ? current.filter((saved) => saved !== slug) : [slug, ...current];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return current.includes(slug);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next.includes(slug);
}

/** Replaces the whole list, e.g. to undo "Clear all". */
export function replaceSaved(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

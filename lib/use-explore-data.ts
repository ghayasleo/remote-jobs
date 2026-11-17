"use client";

import { useSyncExternalStore } from "react";
import type { ExploreData } from "@/lib/data/explore-data";

// The full company list, fetched once per visit from /data/explore.json and
// shared by Explore and Saved. The service worker keeps a copy for offline use.

const URL = "/data/explore.json";
let data: ExploreData | null = null;
let failed = false;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function load() {
  request ??= fetch(URL)
    .then((response) => {
      if (!response.ok) throw new Error(`${URL}: ${response.status}`);
      return response.json() as Promise<ExploreData>;
    })
    .then((json) => {
      data = json;
      failed = false;
    })
    .catch(() => {
      failed = true;
      request = null; // allow a retry
    })
    .finally(notify);
  return request;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!data) void load();
  return () => {
    listeners.delete(listener);
  };
}

/** The full list, or null until it has loaded. */
export function useExploreData(): ExploreData | null {
  return useSyncExternalStore(subscribe, () => data, () => null);
}

export function useExploreDataFailed(): boolean {
  return useSyncExternalStore(subscribe, () => failed, () => false);
}

export function retryExploreData() {
  failed = false;
  notify();
  void load();
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * A JSON file fetched once per visit and shared by every component that needs
 * it (e.g. /data/explore.json). The service worker keeps a copy for offline use.
 */
export function createJsonStore<T>(url: string) {
  let data: T | null = null;
  let failed = false;
  let request: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function load() {
    request ??= fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        return response.json() as Promise<T>;
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

  return {
    /** The data, or null until it has loaded. */
    useData: () => useSyncExternalStore(subscribe, () => data, () => null),
    useFailed: () => useSyncExternalStore(subscribe, () => failed, () => false),
    retry() {
      failed = false;
      notify();
      void load();
    },
  };
}

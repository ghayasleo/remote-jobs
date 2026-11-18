"use client";

import { useEffect, useSyncExternalStore } from "react";

/** "now" fetches straight away; "soon" waits for the first interaction or an idle moment. */
export type LoadWhen = "now" | "soon";

// A page that already shows what the visitor came for (e.g. the first companies,
// rendered on the server) can wait: the download and the re-render it causes
// then never compete with the first paint or the first tap.
const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "focusin"] as const;
const IDLE_DELAY_MS = 6000;

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

  let scheduled = false;
  function loadSoon() {
    if (data || request || scheduled) return;
    scheduled = true;
    const go = () => {
      for (const event of INTERACTION_EVENTS) window.removeEventListener(event, go, true);
      window.clearTimeout(timer);
      void load();
    };
    for (const event of INTERACTION_EVENTS) window.addEventListener(event, go, { passive: true, capture: true });
    const timer = window.setTimeout(go, IDLE_DELAY_MS);
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    /** The data, or null until it has loaded. */
    useData(when: LoadWhen = "now") {
      useEffect(() => {
        if (data) return;
        if (when === "now") void load();
        else loadSoon();
      }, [when]);
      return useSyncExternalStore(subscribe, () => data, () => null);
    },
    useFailed: () => useSyncExternalStore(subscribe, () => failed, () => false),
    retry() {
      failed = false;
      notify();
      void load();
    },
  };
}

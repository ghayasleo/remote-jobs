"use client";

import { useCallback, useSyncExternalStore } from "react";

// Page state kept in the URL query string, so views can be shared and survive
// Back. Reads window.location directly (not useSearchParams), so pages using
// it still prerender with their content in the HTML.

const CHANGE_EVENT = "url-state-change";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function createUrlState<T extends object>(
  parse: (query: string) => T,
  serialize: (state: T) => string,
  defaults: T,
) {
  let snapshot: { query: string; state: T } = { query: "", state: defaults };
  const getSnapshot = () => {
    const query = window.location.search;
    if (query !== snapshot.query) snapshot = { query, state: parse(query) };
    return snapshot.state;
  };

  type Update = Partial<T> | ((current: T) => Partial<T>);

  return function useUrlState() {
    const state = useSyncExternalStore(subscribe, getSnapshot, () => defaults);
    const setState = useCallback((update: Update) => {
      const current = getSnapshot();
      const next = { ...current, ...(typeof update === "function" ? update(current) : update) };
      // Next.js keeps its router in sync with history.replaceState.
      window.history.replaceState(null, "", `${window.location.pathname}${serialize(next)}${window.location.hash}`);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);
    return [state, setState] as const;
  };
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PARAMS, parseParams, serializeParams, type ExploreParams } from "./explore";

// Explore's filters live in the URL so they can be shared and survive Back.
// Read straight from window.location (not useSearchParams) so the page can
// still be prerendered with the full company list.

const CHANGE_EVENT = "explore-params-change";
let snapshot: { query: string; params: ExploreParams } = { query: "", params: DEFAULT_PARAMS };

function getSnapshot(): ExploreParams {
  const query = window.location.search;
  if (query !== snapshot.query) snapshot = { query, params: parseParams(query) };
  return snapshot.params;
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

type Update = Partial<ExploreParams> | ((current: ExploreParams) => Partial<ExploreParams>);

export function useExploreParams() {
  const params = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PARAMS);

  const setParams = useCallback((update: Update) => {
    const current = getSnapshot();
    const next = { ...current, ...(typeof update === "function" ? update(current) : update) };
    const url = `${window.location.pathname}${serializeParams(next)}${window.location.hash}`;
    // Next.js keeps its router in sync with history.replaceState.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [params, setParams] as const;
}

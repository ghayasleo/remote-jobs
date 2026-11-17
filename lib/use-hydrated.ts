"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False in the prerendered HTML and during hydration, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

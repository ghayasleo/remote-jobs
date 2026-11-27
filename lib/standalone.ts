"use client";

import { useSyncExternalStore } from "react";

export { APP_HOME } from "./app-home";

const query = () => window.matchMedia("(display-mode: standalone)");

/** True inside the installed app (Android, desktop, and iOS home-screen apps). */
export function isStandalone() {
  return query().matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function subscribe(onChange: () => void) {
  const media = query();
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useStandalone() {
  return useSyncExternalStore(subscribe, isStandalone, () => false);
}

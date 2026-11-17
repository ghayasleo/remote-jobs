"use client";

import { useSyncExternalStore } from "react";
import { CONSENT_KEY } from "./google-tags";

// The visitor's analytics cookie choice, kept in this browser.

export type Consent = "granted" | "denied";
type State = { choice: Consent | null; open: boolean };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Time zones in the EEA, UK and Switzerland (plus the rest of Europe, which
// is harmless): the people we ask before setting analytics cookies. Google
// applies the matching consent default by IP, so this only decides who sees
// the question.
const ASK_ZONES = /^(Europe|Arctic)\/|^Atlantic\/(Azores|Canary|Faroe|Madeira|Reykjavik)$/;

function asksFirst() {
  try {
    return ASK_ZONES.test(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return false;
  }
}

function readChoice(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

const SERVER: State = { choice: null, open: false };
let state: State | null = null;
const listeners = new Set<() => void>();

function current(): State {
  if (!state) {
    const choice = readChoice();
    state = { choice, open: choice === null && asksFirst() };
  }
  return state;
}

function update(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useConsent() {
  return useSyncExternalStore(subscribe, current, () => SERVER);
}

export function setConsent(choice: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Private mode: the choice still applies to this visit.
  }
  window.gtag?.("consent", "update", { analytics_storage: choice });
  update({ choice, open: false });
}

/** Shows the question again, e.g. from "Cookie choices". */
export function openConsent() {
  update({ ...current(), open: true });
}

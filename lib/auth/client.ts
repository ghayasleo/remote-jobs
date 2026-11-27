"use client";

import { useSyncExternalStore } from "react";
import { readProfile, type Profile } from "./profile";

// Who's signed in, read from the readable profile cookie: no request needed.
const AUTH_EVENT = "rj:auth";
let cached: { raw: string; profile: Profile | null } = { raw: "", profile: null };

function snapshot(): Profile | null {
  const raw = document.cookie;
  if (raw !== cached.raw) cached = { raw, profile: readProfile(raw) };
  return cached.profile;
}

function subscribe(listener: () => void) {
  window.addEventListener(AUTH_EVENT, listener);
  // Another tab may sign in or out.
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener(AUTH_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}

/** The signed-in person's name and photo, or null. Always null on the server and the first render. */
export function useProfile(): Profile | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export const notifyAuthChanged = () => window.dispatchEvent(new Event(AUTH_EVENT));

// The sign-in dialog lives once in the layout; anything can open it.
const OPEN_EVENT = "rj:sign-in";
export const openSignIn = (reason?: string) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: reason }));
export function onOpenSignIn(listener: (reason: string | undefined) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<string | undefined>).detail);
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

export async function signOut({ deleteAccount = false } = {}) {
  const response = await fetch(`/api/auth/session${deleteAccount ? "?account=delete" : ""}`, { method: "DELETE" });
  window.google?.accounts.id.disableAutoSelect();
  notifyAuthChanged();
  return response.ok;
}

/** Sends Google's ID token to the server, which sets the session. */
export async function signInWithCredential(credential: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ credential }),
  }).catch(() => null);
  if (!response) return { ok: false, error: "You seem to be offline. Please try again." };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: body?.error ?? "Signing in didn't work. Please try again." };
  }
  notifyAuthChanged();
  return { ok: true };
}

// Google Identity Services, loaded only when someone opens the sign-in dialog.
type GoogleId = {
  initialize: (options: Record<string, unknown>) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
  disableAutoSelect: () => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let gis: Promise<GoogleId> | null = null;
export function loadGoogleIdentity(): Promise<GoogleId> {
  gis ??= new Promise<GoogleId>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("GIS")));
    script.onerror = () => {
      gis = null;
      reject(new Error("Couldn't load Google sign-in"));
    };
    document.head.appendChild(script);
  });
  return gis;
}

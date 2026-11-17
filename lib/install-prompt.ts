"use client";

import { useSyncExternalStore } from "react";

// "Install app": Chrome/Edge/Android offer a prompt we can trigger ourselves;
// iOS needs Share → Add to Home Screen; installed apps need nothing.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = "installed" | "prompt" | "ios" | "unsupported";

let deferredPrompt: InstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Call once, early: the browser fires beforeinstallprompt shortly after load. */
export function captureInstallPrompt() {
  const onPrompt = (event: Event) => {
    event.preventDefault(); // we offer our own button instead of the browser's banner
    deferredPrompt = event as InstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferredPrompt = null;
    justInstalled = true;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

function getState(): InstallState {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (justInstalled || standalone) return "installed";
  if (deferredPrompt) return "prompt";
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iOS ? "ios" : "unsupported";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getState, () => "unsupported");
}

export async function promptInstall() {
  const prompt = deferredPrompt;
  if (!prompt) return;
  await prompt.prompt();
  await prompt.userChoice;
  deferredPrompt = null; // a prompt can only be used once
  notify();
}

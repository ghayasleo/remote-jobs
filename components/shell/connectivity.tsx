"use client";

import { useEffect } from "react";
import { WifiOffIcon } from "lucide-react";
import { useOffline } from "next/offline";
import { captureInstallPrompt } from "@/lib/install-prompt";

/** A quiet notice while offline. Next.js retries navigations once we're back. */
export function OfflineNotice() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="border-b bg-hiring text-hiring-foreground">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm font-medium sm:px-6">
        <WifiOffIcon className="size-4 shrink-0" aria-hidden />
        You’re offline. Pages you’ve opened still work, and we’ll reconnect automatically.
      </p>
    </div>
  );
}

/** Registers public/sw.js in production builds and listens for the install prompt. */
export function ServiceWorker() {
  useEffect(() => captureInstallPrompt(), []);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // The app works without it; it only adds offline support.
    });
  }, []);
  return null;
}

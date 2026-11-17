"use client";

import { ANALYTICS_ENABLED } from "@/lib/google-tags";
import { openConsent } from "@/lib/consent";
import { cn } from "@/lib/utils";

/** Reopens the cookie question. Hidden when no Google tags are configured. */
export function CookieChoicesButton({ className, children = "Cookie choices" }: { className?: string; children?: React.ReactNode }) {
  if (!ANALYTICS_ENABLED) return null;
  return (
    <button type="button" onClick={openConsent} className={cn("text-left", className)}>
      {children}
    </button>
  );
}

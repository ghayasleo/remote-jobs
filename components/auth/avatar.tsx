"use client";

import { useState } from "react";
import { initials, type Profile } from "@/lib/auth/profile";
import { cn } from "@/lib/utils";

/** The signed-in person's Google photo, or their initials. */
export function Avatar({ profile, className }: { profile: Profile; className?: string }) {
  const [failed, setFailed] = useState(false);
  const box = cn("grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-secondary-foreground", className);
  if (!profile.picture || failed) {
    return (
      <span aria-hidden className={box}>
        {initials(profile.name)}
      </span>
    );
  }
  return (
    // A tiny external photo; next/image would only add a round trip through the optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.picture}
      alt=""
      referrerPolicy="no-referrer"
      className={box}
      onError={() => setFailed(true)}
    />
  );
}

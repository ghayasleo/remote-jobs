"use client";

import { useEffect } from "react";
import { notifyAuthChanged, useProfile } from "@/lib/auth/client";

/**
 * Development only: keeps the test user signed in on localhost (see
 * app/api/auth/dev). Mounted by the layout only under `next dev` with
 * NEXT_PUBLIC_DEV_LOGIN=1.
 */
export function DevAutoLogin() {
  const profile = useProfile();
  useEffect(() => {
    if (profile) return;
    fetch("/api/auth/dev", { method: "POST" })
      .then((response) => response.ok && notifyAuthChanged())
      .catch(() => {});
  }, [profile]);
  return null;
}

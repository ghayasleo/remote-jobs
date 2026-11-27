"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_HOME, useStandalone } from "@/lib/standalone";

/** The logo link: the home page on the web, Jobs inside the installed app. */
export function HomeLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const standalone = useStandalone();
  return (
    <Link href={standalone ? APP_HOME : "/"} className={className} aria-label="RemoteJobs home">
      {children}
    </Link>
  );
}

/** Catches in-app navigations to "/" (the inline script only runs on full page loads). */
export function StandaloneHomeRedirect() {
  const standalone = useStandalone();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (standalone && pathname === "/") router.replace(APP_HOME);
  }, [standalone, pathname, router]);
  return null;
}

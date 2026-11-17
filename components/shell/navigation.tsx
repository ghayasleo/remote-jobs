"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Counts in-app page views so "Back" can return to the previous screen (with
// its filters and scroll position intact) instead of starting over.
let pageViews = 0;

export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    pageViews += 1;
  }, [pathname]);
  return null;
}

export function BackButton({ fallbackHref = "/", label = "All companies" }: { fallbackHref?: string; label?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="-ml-3 h-11 rounded-full px-3 text-muted-foreground hover:text-foreground"
      onClick={() => (pageViews > 1 ? router.back() : router.push(fallbackHref))}
    >
      <ArrowLeftIcon className="size-5" aria-hidden />
      {label}
    </Button>
  );
}

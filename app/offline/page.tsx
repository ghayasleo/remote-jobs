import type { Metadata } from "next";
import Link from "next/link";
import { BookmarkIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

// Served by the service worker when a page can't be loaded without a connection.
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-hiring text-hiring-foreground">
        <WifiOffIcon className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold">You’re offline</h1>
      <p className="mt-2 text-muted-foreground">
        This page wasn’t saved for offline use yet. Your saved companies and pages you’ve already opened
        still work.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" className="h-11 rounded-full px-5">
          <Link href="/dashboard">
            <BookmarkIcon aria-hidden /> Saved companies
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-5">
          <Link href="/">Try again</Link>
        </Button>
      </div>
    </div>
  );
}

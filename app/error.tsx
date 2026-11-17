"use client";

import Link from "next/link";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-hiring text-hiring-foreground">
        <TriangleAlertIcon className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold">Something went wrong loading this page</h1>
      <p className="mt-2 text-muted-foreground">
        It’s usually a hiccup fetching the latest data. Trying again tends to fix it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" className="h-11 rounded-full px-5" onClick={() => reset()}>
          <RotateCwIcon aria-hidden /> Try again
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11 rounded-full px-5">
          <Link href="/">Back to Explore</Link>
        </Button>
      </div>
    </div>
  );
}

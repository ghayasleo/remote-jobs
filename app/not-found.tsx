import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <CompassIcon className="size-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold">We couldn’t find that page</h1>
      <p className="mt-2 text-muted-foreground">
        The company may have been renamed or removed from the list. Searching for it usually finds where it went.
      </p>
      <Button asChild size="lg" className="mt-8 h-11 rounded-full px-5">
        <Link href="/companies">Search all companies</Link>
      </Button>
    </div>
  );
}

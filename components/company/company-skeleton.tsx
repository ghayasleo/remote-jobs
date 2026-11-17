import { Skeleton } from "@/components/ui/skeleton";

/** Shown instantly while a company page streams in. */
export function CompanySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading company" className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-6">
      <Skeleton className="h-11 w-36 rounded-full" />
      <div className="mt-4 flex items-start gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mt-6 h-[4.5rem] rounded-2xl" />
      <div className="mt-8 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="mt-8 h-48 rounded-2xl" />
    </div>
  );
}

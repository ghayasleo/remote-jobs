"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookmarkIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { CompanyRow } from "@/components/company/company-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isRecent, type ExploreCompany } from "@/lib/explore";
import { replaceSaved, useSavedSlugs } from "@/lib/saved";
import { retryExploreData, useExploreData, useExploreDataFailed } from "@/lib/use-explore-data";
import { useHydrated } from "@/lib/use-hydrated";

export function SavedCompanies({ embedded = false }: { embedded?: boolean }) {
  const hydrated = useHydrated();
  const slugs = useSavedSlugs();
  const data = useExploreData();
  const failed = useExploreDataFailed();
  const bySlug = useMemo(
    () => new Map((data?.companies ?? []).map((company) => [company.slug, company])),
    [data],
  );
  const hiring = data?.hiring ?? {};
  const saved = slugs.map((slug) => bySlug.get(slug)).filter((company): company is ExploreCompany => !!company);
  // Only meaningful once the full list has loaded.
  const removedUpstream = data ? slugs.length - saved.length : 0;
  const hiringCount = saved.filter((company) => company.slug in hiring).length;
  const ready = hydrated && (slugs.length === 0 || data !== null);

  const clearAll = () => {
    const previous = slugs;
    replaceSaved([]);
    toast(`Cleared ${previous.length} saved ${previous.length === 1 ? "company" : "companies"}`, {
      action: { label: "Undo", onClick: () => replaceSaved(previous) },
      duration: 8000, // long enough to change your mind about a whole list
    });
  };

  return (
    <div className={embedded ? "pb-4" : "mx-auto max-w-3xl pb-10"}>
      <header className={embedded ? "flex items-end justify-between gap-4 px-4 pb-4 sm:px-6" : "flex items-end justify-between gap-4 px-4 pt-6 pb-4 sm:px-6"}>
        <div>
          {!embedded && <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Saved companies</h1>}
          <p className={embedded ? "text-muted-foreground" : "mt-1.5 text-muted-foreground"}>
            {!ready ? (
              "Loading your list…"
            ) : saved.length > 0 ? (
              <>
                {saved.length} saved
                {hiringCount > 0 && (
                  <>
                    , <span className="font-semibold text-foreground">{hiringCount} hiring right now</span>
                  </>
                )}
                .
              </>
            ) : (
              "Your shortlist, kept on this device."
            )}
          </p>
        </div>
        {ready && saved.length > 0 && (
          <Button variant="ghost" className="h-10 shrink-0 rounded-full px-3 text-muted-foreground" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </header>

      {failed && !data && slugs.length > 0 ? (
        <div role="alert" className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm sm:mx-6">
          Couldn’t load your saved companies. Check your connection and try again.
          <Button variant="outline" className="h-10 rounded-full px-4" onClick={retryExploreData}>
            Try again
          </Button>
        </div>
      ) : !ready ? (
        <SavedSkeleton />
      ) : saved.length === 0 ? (
        removedUpstream === 0 && <EmptySaved />
      ) : (
        <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
          {saved.map((company) => (
            <CompanyRow
              key={company.slug}
              company={company}
              hiring={hiring[company.slug]}
              isNew={isRecent(company, data!.newSince)}
            />
          ))}
        </ul>
      )}

      {ready && removedUpstream > 0 && (
        <p className="mx-4 mt-4 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground sm:mx-6">
          {removedUpstream} saved {removedUpstream === 1 ? "company is" : "companies are"} no longer on the list.
          <Button
            variant="link"
            className="h-auto px-0"
            onClick={() => replaceSaved(slugs.filter((slug) => bySlug.has(slug)))}
          >
            Remove {removedUpstream === 1 ? "it" : "them"}
          </Button>
        </p>
      )}
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div aria-hidden className="space-y-px border-y sm:mx-6 sm:rounded-2xl sm:border">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-3.5 px-4 py-4 sm:px-5">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySaved() {
  return (
    <div className="mx-4 rounded-2xl border border-dashed px-6 py-14 text-center sm:mx-6">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <BookmarkIcon className="size-6" aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-semibold">Nothing saved yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        Tap the <BookmarkIcon className="inline size-4 align-[-0.15em]" aria-label="bookmark" /> on any company to keep
        it here. Your list stays on this device and works offline.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 rounded-full px-5">
          <Link href="/companies">Explore companies</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full px-5">
          <Link href="/companies?hiring=true">
            <SparklesIcon aria-hidden /> Who’s hiring now
          </Link>
        </Button>
      </div>
    </div>
  );
}

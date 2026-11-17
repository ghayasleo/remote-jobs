"use client";

import { ArrowUpDownIcon, SearchXIcon } from "lucide-react";
import { CompanyRow } from "@/components/company/company-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChoiceMenu } from "@/components/choice-menu";
import { SORTS, isRecent, type ExploreCompany, type HiringCounts, type SortKey } from "@/lib/explore";
import { useLoadMore } from "@/lib/use-load-more";
import type { ActiveFilter } from "./filters";

export function SortMenu({ value, onChange }: { value: SortKey; onChange: (sort: SortKey) => void }) {
  return <ChoiceMenu label="Sort by" icon={ArrowUpDownIcon} value={value} options={SORTS} onChange={onChange} />;
}

/** The matching companies, revealed a page at a time as you scroll. */
export function ResultList({
  companies,
  hiring,
  newSince,
  filters,
  onClearAll,
  pending = false,
}: {
  companies: ExploreCompany[];
  hiring: HiringCounts;
  newSince: string;
  filters: ActiveFilter[];
  onClearAll: () => void;
  /** More companies are still loading (only the first page is in the HTML). */
  pending?: boolean;
}) {
  const { limit, hasMore, sentinel, showMore } = useLoadMore(companies.length);

  if (companies.length === 0) return <EmptyResults filters={filters} onClearAll={onClearAll} />;

  return (
    <ul className="divide-y border-y lg:rounded-2xl lg:border">
      {companies.slice(0, limit).map((company) => (
        <CompanyRow
          key={company.slug}
          company={company}
          hiring={hiring[company.slug]}
          isNew={isRecent(company, newSince)}
        />
      ))}
      {pending && !hasMore && (
        <li aria-busy="true" className="px-4 py-4 sm:px-5">
          <RowSkeleton />
          <span className="sr-only">Loading more companies</span>
        </li>
      )}
      {hasMore && (
        <li ref={sentinel} className="flex justify-center px-4 py-6">
          <Button variant="outline" className="h-11 rounded-full px-6" onClick={showMore}>
            Show more ({companies.length - limit} left)
          </Button>
        </li>
      )}
    </ul>
  );
}

function RowSkeleton() {
  return (
    <div aria-hidden className="flex gap-3.5">
      <Skeleton className="size-11 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/** Placeholder rows while a filtered view waits for the full list. */
export function ListSkeleton() {
  return (
    <div aria-busy="true" className="divide-y border-y lg:rounded-2xl lg:border">
      <span className="sr-only">Loading companies</span>
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="px-4 py-4 sm:px-5">
          <RowSkeleton />
        </div>
      ))}
    </div>
  );
}

function EmptyResults({ filters, onClearAll }: { filters: ActiveFilter[]; onClearAll: () => void }) {
  return (
    <div className="mx-4 rounded-2xl border border-dashed px-6 py-14 text-center sm:mx-6 lg:mx-0">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <SearchXIcon className="size-6" aria-hidden />
      </span>
      <h3 className="mt-5 text-lg font-semibold">No companies match all of that</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        Try loosening one filter. Each one below is a single tap to remove.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {filters.slice(0, 4).map((filter) => (
          <Button key={filter.id} variant="outline" className="h-10 rounded-full px-4" onClick={filter.remove}>
            Remove {filter.label}
          </Button>
        ))}
        <Button className="h-10 rounded-full px-4" onClick={onClearAll}>
          Clear everything
        </Button>
      </div>
    </div>
  );
}

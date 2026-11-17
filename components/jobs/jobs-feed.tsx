"use client";

import { useCallback, useMemo } from "react";
import { ArrowUpDownIcon, CalendarIcon, SearchXIcon } from "lucide-react";
import { ChoiceMenu } from "@/components/choice-menu";
import { ActiveFilters, FilterChip, type ActiveFilter } from "@/components/explore/filters";
import { ListSkeleton } from "@/components/explore/results";
import { SearchField } from "@/components/explore/search-field";
import { usePageTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_JOB_PARAMS,
  JOB_CATEGORIES,
  JOB_CATEGORY_KEYS,
  JOB_SORTS,
  POSTED_WITHIN,
  filterJobs,
  serializeJobParams,
  type JobListing,
  type JobParams,
  type PostedWithin,
} from "@/lib/jobs";
import { useLoadMore } from "@/lib/use-load-more";
import { retryJobs, useJobParams, useJobs, useJobsFailed } from "@/lib/use-jobs";
import { JobRow } from "./job-row";

const POSTED_OPTIONS = { any: "Any time", ...POSTED_WITHIN } as const;

function JobList({ jobs, pending }: { jobs: JobListing[]; pending: boolean }) {
  const { limit, hasMore, sentinel, showMore } = useLoadMore(jobs.length);
  return (
    <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
      {jobs.slice(0, limit).map((job) => (
        <JobRow key={`${job.company}-${job.id}`} job={job} />
      ))}
      {pending && !hasMore && (
        <li aria-busy="true" className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
          Loading more roles…
        </li>
      )}
      {hasMore && (
        <li ref={sentinel} className="flex justify-center px-4 py-6">
          <Button variant="outline" className="h-11 rounded-full px-6" onClick={showMore}>
            Show more ({jobs.length - limit} left)
          </Button>
        </li>
      )}
    </ul>
  );
}

/** Every remote role. HTML carries the newest few; the rest loads from /data/jobs.json. */
export function JobsFeed({ preview, total, companies }: { preview: JobListing[]; total: number; companies: number }) {
  const [params, setParams] = useJobParams();
  const jobs = useJobs();
  const failed = useJobsFailed();
  const now = usePageTime();
  const results = useMemo(() => (jobs && now !== null ? filterJobs(jobs, params, now) : null), [jobs, params, now]);
  const isDefaultView = serializeJobParams(params) === "";
  const shown = results ?? (isDefaultView ? preview : null);
  const count = results?.length ?? (isDefaultView ? total : null);
  const onSearch = useCallback((q: string) => setParams({ q }), [setParams]);
  const clearAll = () => setParams({ ...DEFAULT_JOB_PARAMS, sort: params.sort });

  const filters: ActiveFilter[] = [
    ...(params.q.trim() ? [{ id: "q", label: `“${params.q.trim()}”`, remove: () => setParams({ q: "" }) }] : []),
    ...params.category.map((category) => ({
      id: `category-${category}`,
      label: JOB_CATEGORIES[category],
      remove: () => setParams((current) => ({ category: current.category.filter((item) => item !== category) })),
    })),
    ...(params.posted ? [{ id: "posted", label: POSTED_WITHIN[params.posted], remove: () => setParams({ posted: "" }) }] : []),
  ];

  const toggleCategory = (category: JobParams["category"][number]) =>
    setParams((current) => ({
      category: current.category.includes(category)
        ? current.category.filter((item) => item !== category)
        : [...current.category, category],
    }));

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <header className="px-4 pt-6 pb-4 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Remote jobs</h1>
        <p className="mt-1.5 text-muted-foreground">
          <span className="font-semibold text-foreground">{total} remote roles</span> at {companies} companies, straight
          from their job boards and refreshed every hour.
        </p>
      </header>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-(--z-sticky) border-b bg-background px-4 py-3 sm:px-6">
        <SearchField value={params.q} onChange={onSearch} placeholder="Search roles, companies or places" />
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:flex-wrap sm:px-6">
          {JOB_CATEGORY_KEYS.filter((key) => key !== "other").map((category) => (
            <FilterChip
              key={category}
              pressed={params.category.includes(category)}
              onPressedChange={() => toggleCategory(category)}
            >
              {JOB_CATEGORIES[category]}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 sm:px-6">
        <h2 className="text-sm font-medium" aria-live="polite">
          {count === null ? (
            "Finding roles…"
          ) : (
            <>
              <span className="tabular-nums">{count}</span> {count === 1 ? "role" : "roles"}
            </>
          )}
        </h2>
        <div className="flex">
          <ChoiceMenu
            label="Posted"
            icon={CalendarIcon}
            value={params.posted || "any"}
            options={POSTED_OPTIONS}
            onChange={(posted) => setParams({ posted: posted === "any" ? "" : (posted as PostedWithin) })}
          />
          <ChoiceMenu label="Sort by" icon={ArrowUpDownIcon} value={params.sort} options={JOB_SORTS} onChange={(sort) => setParams({ sort })} />
        </div>
      </div>
      <ActiveFilters filters={filters} onClearAll={clearAll} className="px-4 pb-3 sm:px-6" />

      {failed && !jobs && (
        <div role="alert" className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm sm:mx-6">
          Couldn’t load every role, so search and filters are paused.
          <Button variant="outline" className="h-10 rounded-full px-4" onClick={retryJobs}>
            Try again
          </Button>
        </div>
      )}

      {shown === null ? (
        <div className="sm:mx-6">
          <ListSkeleton />
        </div>
      ) : shown.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-dashed px-6 py-14 text-center sm:mx-6">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <SearchXIcon className="size-6" aria-hidden />
          </span>
          <h3 className="mt-5 text-lg font-semibold">No remote roles match all of that</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Try loosening a filter.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {filters.slice(0, 4).map((filter) => (
              <Button key={filter.id} variant="outline" className="h-10 rounded-full px-4" onClick={filter.remove}>
                Remove {filter.label}
              </Button>
            ))}
            <Button className="h-10 rounded-full px-4" onClick={clearAll}>
              Clear everything
            </Button>
          </div>
        </div>
      ) : (
        <JobList key={serializeJobParams({ ...params, sort: "newest" })} jobs={shown} pending={!jobs && !failed} />
      )}
    </div>
  );
}

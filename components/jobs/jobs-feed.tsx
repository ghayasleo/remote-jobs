"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDownIcon, BotIcon, CalendarIcon, SearchXIcon } from "lucide-react";
import { AlertButton } from "@/components/alerts/alert-button";
import { ChoiceMenu } from "@/components/choice-menu";
import { CopyFeedButton } from "@/components/copy-feed-button";
import { CountrySelect } from "@/components/jobs/country-select";
import { ActiveFilters, FilterChip, FilterSheet } from "@/components/explore/filters";
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
  activeJobFilterCount,
  filterJobs,
  serializeJobParams,
  type JobListing,
  type PostedWithin,
} from "@/lib/jobs";
import { useLoadMore } from "@/lib/use-load-more";
import { retryJobs, useJobParams, useJobs, useJobsFailed } from "@/lib/use-jobs";
import { JobFilterPanel, describeJobFilters, toggleJobParam } from "./job-filters";
import { JobRow } from "./job-row";

const POSTED_OPTIONS = { any: "Any time", ...POSTED_WITHIN } as const;

function JobList({ jobs, pending }: { jobs: JobListing[]; pending: boolean }) {
  const { limit, hasMore, sentinel, showMore } = useLoadMore(jobs.length);
  return (
    <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border lg:mx-0">
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
  const isDefaultView = serializeJobParams(params) === "";
  // The newest roles are in the HTML, so the full list can wait.
  const jobs = useJobs(isDefaultView ? "soon" : "now");
  const failed = useJobsFailed();
  const now = usePageTime();
  const results = useMemo(() => (jobs && now !== null ? filterJobs(jobs, params, now) : null), [jobs, params, now]);
  const shown = results ?? (isDefaultView ? preview : null);
  const count = results?.length ?? (isDefaultView ? total : null);
  const onSearch = useCallback((q: string) => setParams({ q }), [setParams]);
  const clearAll = () => setParams({ ...DEFAULT_JOB_PARAMS, sort: params.sort });

  const filters = describeJobFilters(params, setParams);

  return (
    <div className="mx-auto max-w-6xl pb-10 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-10 lg:px-6">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-8 pr-1">
          <JobFilterPanel params={params} setParams={setParams} />
        </div>
      </aside>

      <div className="min-w-0 lg:py-8">
        <header className="px-4 pt-6 pb-4 sm:px-6 lg:px-0 lg:pt-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Remote jobs</h1>
          <p className="mt-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground">{total} remote roles</span> at {companies} companies, straight
            from their job boards and refreshed every hour.{" "}
            <Link href="/new" className="font-medium text-primary underline underline-offset-4">
              See what’s new this week
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyFeedButton
              path={`/feeds/jobs.xml${serializeJobParams({ ...params, sort: "newest" })}`}
              className="h-9 px-3.5 text-sm"
            >
              {isDefaultView ? "Follow new roles by RSS" : "Follow this search by RSS"}
            </CopyFeedButton>
            <AlertButton
              query={serializeJobParams({ ...params, sort: "newest" })}
              label={filters.map((filter) => filter.label).join(" · ")}
            />
            <Button asChild variant="outline" className="h-9 rounded-full px-3.5 text-sm">
              <Link href="/ai">
                <BotIcon aria-hidden />
                Search from Claude or ChatGPT
              </Link>
            </Button>
          </div>
        </header>

        {/* On phones the search and quick filters stay pinned under the top bar. */}
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-(--z-sticky) border-b bg-background px-4 py-3 sm:px-6 lg:static lg:border-0 lg:px-0 lg:py-0">
          <SearchField value={params.q} onChange={onSearch} placeholder="Search roles, companies or places" />
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
            <FilterSheet
              count={activeJobFilterCount(params)}
              resultLabel={count === null ? "Show results" : `Show ${count} ${count === 1 ? "role" : "roles"}`}
              onClear={() => setParams({ ...DEFAULT_JOB_PARAMS, q: params.q, sort: params.sort })}
            >
              <JobFilterPanel params={params} setParams={setParams} />
            </FilterSheet>
            <CountrySelect value={params.country} onChange={(country) => setParams({ country })} placeholder="Where I live" />
            <FilterChip pressed={params.pay} onPressedChange={(pay) => setParams({ pay })}>
              Pay listed
            </FilterChip>
            {JOB_CATEGORY_KEYS.filter((key) => key !== "other").map((category) => (
              <FilterChip
                key={category}
                pressed={params.category.includes(category)}
                onPressedChange={() => toggleJobParam(setParams, "category", category)}
              >
                {JOB_CATEGORIES[category]}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 sm:px-6 lg:px-0 lg:pt-6">
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
        <ActiveFilters filters={filters} onClearAll={clearAll} className="px-4 pb-3 sm:px-6 lg:px-0" />

        {failed && !jobs && (
          <div role="alert" className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm sm:mx-6 lg:mx-0">
            Couldn’t load every role, so search and filters are paused.
            <Button variant="outline" className="h-10 rounded-full px-4" onClick={retryJobs}>
              Try again
            </Button>
          </div>
        )}

        {shown === null ? (
          <div className="sm:mx-6 lg:mx-0">
            <ListSkeleton />
          </div>
        ) : shown.length === 0 ? (
          <div className="mx-4 rounded-2xl border border-dashed px-6 py-14 text-center sm:mx-6 lg:mx-0">
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
    </div>
  );
}

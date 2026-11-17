"use client";

import { useCallback, useMemo } from "react";
import type { ExploreData } from "@/lib/data/explore-data";
import { DEFAULT_PARAMS, filterCompanies, serializeParams } from "@/lib/explore";
import { useExploreParams } from "@/lib/use-explore-params";
import { ActiveFilters, FilterChip, FilterPanel, FilterSheet, describeFilters } from "./filters";
import { ResultList, SortMenu } from "./results";
import { SearchField } from "./search-field";

export function Explore({ companies, hiring, newSince }: ExploreData) {
  const [params, setParams] = useExploreParams();
  const results = useMemo(
    () => filterCompanies(companies, params, hiring, newSince),
    [companies, params, hiring, newSince],
  );
  const filters = describeFilters(params, setParams);
  const onSearch = useCallback((q: string) => setParams({ q }), [setParams]);
  const clearAll = () => setParams({ ...DEFAULT_PARAMS, sort: params.sort });
  const hiringCount = Object.keys(hiring).length;

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-10 lg:px-6">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto py-8 pr-1">
          <FilterPanel params={params} setParams={setParams} />
        </div>
      </aside>

      <div className="min-w-0 lg:py-8">
        <header className="px-4 pt-6 pb-4 sm:px-6 lg:px-0 lg:pt-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Find your next remote team</h1>
          <p className="mt-1.5 text-muted-foreground">
            {companies.length} remote-friendly tech companies,{" "}
            <span className="font-semibold text-foreground">{hiringCount} hiring right now.</span>
          </p>
        </header>

        {/* On phones the search and quick filters stay pinned under the top bar. */}
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-(--z-sticky) border-b bg-background px-4 py-3 sm:px-6 lg:static lg:border-0 lg:px-0 lg:py-0">
          <SearchField value={params.q} onChange={onSearch} />
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
            <FilterSheet params={params} setParams={setParams} resultCount={results.length} />
            <FilterChip pressed={params.hiring} onPressedChange={(hiring) => setParams({ hiring })}>
              Hiring now
            </FilterChip>
            <FilterChip
              pressed={params.policy.includes("fully-remote")}
              onPressedChange={(on) =>
                setParams((current) => ({
                  policy: on
                    ? [...current.policy, "fully-remote"]
                    : current.policy.filter((policy) => policy !== "fully-remote"),
                }))
              }
            >
              Fully remote
            </FilterChip>
            <FilterChip
              pressed={params.region.includes("worldwide")}
              onPressedChange={(on) =>
                setParams((current) => ({
                  region: on
                    ? [...current.region, "worldwide"]
                    : current.region.filter((region) => region !== "worldwide"),
                }))
              }
            >
              Hires worldwide
            </FilterChip>
            <FilterChip pressed={params.recent} onPressedChange={(recent) => setParams({ recent })}>
              Recently added
            </FilterChip>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 sm:px-6 lg:px-0 lg:pt-6">
          <h2 className="text-sm font-medium" aria-live="polite">
            <span className="tabular-nums">{results.length}</span> {results.length === 1 ? "company" : "companies"}
          </h2>
          <SortMenu value={params.sort} onChange={(sort) => setParams({ sort })} />
        </div>
        <ActiveFilters filters={filters} onClearAll={clearAll} />

        {/* A new search or filter starts the list from the top again. */}
        <ResultList
          key={serializeParams({ ...params, sort: "recommended" })}
          companies={results}
          hiring={hiring}
          newSince={newSince}
          filters={filters}
          onClearAll={clearAll}
        />
        <p className="px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-0">
          Company data from the community-run remoteintech/remote-jobs list, refreshed daily. Open roles
          refresh hourly.
        </p>
      </div>
    </div>
  );
}

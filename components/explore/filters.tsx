"use client";

import { useId } from "react";
import { CheckIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Toggle } from "@/components/ui/toggle";
import {
  COMPANY_SIZES,
  REMOTE_POLICIES,
  TECHS,
  companySizeLabels,
  remotePolicyLabels,
  techLabels,
} from "@/lib/data/labels";
import {
  DEFAULT_PARAMS,
  REGION_FILTER_KEYS,
  REGION_FILTERS,
  activeFilterCount,
  type ExploreParams,
} from "@/lib/explore";
import type { useExploreParams } from "@/lib/use-explore-params";
import { cn } from "@/lib/utils";

type SetParams = ReturnType<typeof useExploreParams>[1];
type ListKey = "region" | "policy" | "stack" | "size";

function toggleIn<K extends ListKey>(setParams: SetParams, key: K, value: ExploreParams[K][number]) {
  setParams((current) => {
    const list = current[key] as string[];
    return { [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
  });
}

export function FilterChip({
  pressed,
  onPressedChange,
  children,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Toggle
      variant="outline"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        // Same width on and off: the 18px the tick and its gap take when on
        // come out of the side padding (2 × 18px off; 8px + 10px on), so
        // picking a filter never pushes the next chip onto a new line.
        "h-8 shrink-0 gap-1 rounded-full bg-background px-4.5 text-[0.8125rem] transition-colors duration-150 pointer-coarse:h-11 pointer-coarse:text-sm",
        "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:pr-2.5 data-[state=on]:pl-2 data-[state=on]:text-primary-foreground hover:data-[state=on]:bg-primary/90",
        className,
      )}
    >
      {pressed && <CheckIcon className="size-3.5" aria-hidden />}
      {children}
    </Toggle>
  );
}

function FilterGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section role="group" aria-labelledby={id}>
      <h3 id={id} className="text-sm font-semibold">
        {title}
      </h3>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5 pointer-coarse:gap-2">{children}</div>
    </section>
  );
}

/** Every filter. Shown in the desktop sidebar and the phone filter sheet. */
export function FilterPanel({ params, setParams }: { params: ExploreParams; setParams: SetParams }) {
  return (
    <div className="space-y-7">
      <FilterGroup title="Show only">
        <FilterChip pressed={params.hiring} onPressedChange={(hiring) => setParams({ hiring })}>
          Hiring now
        </FilterChip>
        <FilterChip pressed={params.recent} onPressedChange={(recent) => setParams({ recent })}>
          Recently added
        </FilterChip>
      </FilterGroup>

      <FilterGroup title="Where you’re based" hint="Includes companies that hire worldwide or across regions.">
        {REGION_FILTER_KEYS.map((key) => (
          <FilterChip
            key={key}
            pressed={params.region.includes(key)}
            onPressedChange={() => toggleIn(setParams, "region", key)}
          >
            {REGION_FILTERS[key].label}
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup title="Remote policy">
        {REMOTE_POLICIES.map((policy) => (
          <FilterChip
            key={policy}
            pressed={params.policy.includes(policy)}
            onPressedChange={() => toggleIn(setParams, "policy", policy)}
          >
            {remotePolicyLabels[policy]}
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup title="Tech stack" hint="Shows companies using any of the ones you pick.">
        {TECHS.map((tech) => (
          <FilterChip
            key={tech}
            pressed={params.stack.includes(tech)}
            onPressedChange={() => toggleIn(setParams, "stack", tech)}
          >
            {techLabels[tech]}
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup title="Company size" hint="Number of people at the company.">
        {COMPANY_SIZES.map((size) => (
          <FilterChip
            key={size}
            pressed={params.size.includes(size)}
            onPressedChange={() => toggleIn(setParams, "size", size)}
          >
            {companySizeLabels[size]}
          </FilterChip>
        ))}
      </FilterGroup>
    </div>
  );
}

/** Phone: a "Filters" button that opens every filter in a bottom sheet. */
export function FilterSheet({
  params,
  setParams,
  resultCount,
}: {
  params: ExploreParams;
  setParams: SetParams;
  /** null while the full list is still loading. */
  resultCount: number | null;
}) {
  const count = activeFilterCount(params);
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="h-9 shrink-0 rounded-full px-3.5 pointer-coarse:h-11">
          <SlidersHorizontalIcon aria-hidden />
          Filters
          {count > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-semibold text-primary-foreground tabular-nums">
              {count}
              <span className="sr-only"> active</span>
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[88dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg">Filters</DrawerTitle>
          <DrawerDescription>Changes apply as you go.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto overscroll-contain px-4 pb-6">
          <FilterPanel params={params} setParams={setParams} />
        </div>
        <DrawerFooter className="flex-row gap-3 border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            className="h-12 rounded-full px-5"
            disabled={count === 0}
            onClick={() => setParams({ ...DEFAULT_PARAMS, q: params.q, sort: params.sort })}
          >
            Clear all
          </Button>
          <DrawerClose asChild>
            <Button className="h-12 flex-1 rounded-full text-base">
              {resultCount === null
                ? "Show results"
                : `Show ${resultCount} ${resultCount === 1 ? "company" : "companies"}`}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export type ActiveFilter = { id: string; label: string; remove: () => void };

/** Every applied filter as a removable item, for pills and the empty state. */
export function describeFilters(params: ExploreParams, setParams: SetParams): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (params.q.trim()) filters.push({ id: "q", label: `“${params.q.trim()}”`, remove: () => setParams({ q: "" }) });
  if (params.hiring) filters.push({ id: "hiring", label: "Hiring now", remove: () => setParams({ hiring: false }) });
  if (params.recent) filters.push({ id: "recent", label: "Recently added", remove: () => setParams({ recent: false }) });
  for (const key of params.region)
    filters.push({ id: `region-${key}`, label: REGION_FILTERS[key].label, remove: () => toggleIn(setParams, "region", key) });
  for (const key of params.policy)
    filters.push({ id: `policy-${key}`, label: remotePolicyLabels[key], remove: () => toggleIn(setParams, "policy", key) });
  for (const key of params.stack)
    filters.push({ id: `stack-${key}`, label: techLabels[key], remove: () => toggleIn(setParams, "stack", key) });
  for (const key of params.size)
    filters.push({ id: `size-${key}`, label: `Size ${companySizeLabels[key]}`, remove: () => toggleIn(setParams, "size", key) });
  return filters;
}

export function ActiveFilters({
  filters,
  onClearAll,
  className = "px-4 pb-3 sm:px-6 lg:px-0",
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
  className?: string;
}) {
  if (filters.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-secondary pl-3 text-sm font-medium text-secondary-foreground"
        >
          {filter.label}
          <button
            type="button"
            onClick={filter.remove}
            aria-label={`Remove filter: ${filter.label}`}
            className="grid size-8 place-items-center rounded-full transition-colors hover:bg-primary/10"
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <Button variant="link" className="h-8 px-1.5 text-sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}

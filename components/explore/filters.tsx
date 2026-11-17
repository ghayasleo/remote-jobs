"use client";

import { useId } from "react";
import { CheckIcon, ChevronDownIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/** A type of filter, so several picks of one type can share a single pill. */
export type FilterKind = { key: string; label: string; clear: () => void };

export type ActiveFilter = {
  id: string;
  /** Stands on its own: the pill, and "Remove …" in the empty state. */
  label: string;
  remove: () => void;
  kind?: FilterKind;
  /** Shorter label inside its type's menu, where the type is already named. */
  option?: string;
};

/** Every applied filter as a removable item, for pills and the empty state. */
export function describeFilters(params: ExploreParams, setParams: SetParams): ActiveFilter[] {
  const region: FilterKind = { key: "region", label: "Region", clear: () => setParams({ region: [] }) };
  const policy: FilterKind = { key: "policy", label: "Remote policy", clear: () => setParams({ policy: [] }) };
  const stack: FilterKind = { key: "stack", label: "Tech stack", clear: () => setParams({ stack: [] }) };
  const size: FilterKind = { key: "size", label: "Company size", clear: () => setParams({ size: [] }) };

  const filters: ActiveFilter[] = [];
  if (params.q.trim()) filters.push({ id: "q", label: `“${params.q.trim()}”`, remove: () => setParams({ q: "" }) });
  if (params.hiring) filters.push({ id: "hiring", label: "Hiring now", remove: () => setParams({ hiring: false }) });
  if (params.recent) filters.push({ id: "recent", label: "Recently added", remove: () => setParams({ recent: false }) });
  for (const key of params.region)
    filters.push({ id: `region-${key}`, kind: region, label: REGION_FILTERS[key].label, remove: () => toggleIn(setParams, "region", key) });
  for (const key of params.policy)
    filters.push({ id: `policy-${key}`, kind: policy, label: remotePolicyLabels[key], remove: () => toggleIn(setParams, "policy", key) });
  for (const key of params.stack)
    filters.push({ id: `stack-${key}`, kind: stack, label: techLabels[key], remove: () => toggleIn(setParams, "stack", key) });
  for (const key of params.size)
    filters.push({
      id: `size-${key}`,
      kind: size,
      label: `Size ${companySizeLabels[key]}`,
      option: companySizeLabels[key],
      remove: () => toggleIn(setParams, "size", key),
    });
  return filters;
}

type FilterGroup = { kind: FilterKind; filters: ActiveFilter[] };

/** Filters in order, with two or more picks of one type folded into a group. */
function groupFilters(filters: ActiveFilter[]): (ActiveFilter | FilterGroup)[] {
  const entries: (ActiveFilter | FilterGroup)[] = [];
  const groups = new Map<string, FilterGroup>();
  for (const filter of filters) {
    if (!filter.kind) {
      entries.push(filter);
      continue;
    }
    let group = groups.get(filter.kind.key);
    if (!group) {
      group = { kind: filter.kind, filters: [] };
      groups.set(filter.kind.key, group);
      entries.push(group);
    }
    group.filters.push(filter);
  }
  return entries.flatMap((entry) => ("filters" in entry && entry.filters.length === 1 ? entry.filters : [entry]));
}

const pillClass = "inline-flex h-8 items-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground";

function FilterPill({ filter }: { filter: ActiveFilter }) {
  return (
    <span className={cn(pillClass, "gap-1 pl-3")}>
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
  );
}

/** Several picks of one type: "Tech stack 3", opening a checklist to untick any of them. */
function FilterGroupPill({ group: { kind, filters } }: { group: FilterGroup }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          pillClass,
          "gap-1.5 pr-2.5 pl-3 outline-none transition-colors duration-150 hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-primary/10",
        )}
      >
        {kind.label}
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums">
          {filters.length}
          <span className="sr-only"> selected</span>
        </span>
        <ChevronDownIcon className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-48 rounded-xl p-1.5">
        <DropdownMenuLabel>{kind.label}</DropdownMenuLabel>
        {filters.map((filter) => (
          <DropdownMenuCheckboxItem
            key={filter.id}
            checked
            // Stay open, so several can be unticked in a row.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={filter.remove}
            className="h-9 rounded-lg"
          >
            {filter.option ?? filter.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={kind.clear} className="h-9 rounded-lg">
          <XIcon aria-hidden />
          Remove all {filters.length}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      {groupFilters(filters).map((entry) =>
        "filters" in entry ? (
          <FilterGroupPill key={entry.kind.key} group={entry} />
        ) : (
          <FilterPill key={entry.id} filter={entry} />
        ),
      )}
      <Button variant="link" className="h-8 px-1.5 text-sm" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  );
}

"use client";

import { FilterChip, FilterGroup, type ActiveFilter, type FilterKind } from "@/components/explore/filters";
import {
  COMPANY_SIZES,
  REMOTE_POLICIES,
  TECHS,
  companySizeLabels,
  remotePolicyLabels,
  techLabels,
} from "@/lib/data/labels";
import {
  JOB_CATEGORIES,
  JOB_CATEGORY_KEYS,
  JOB_REGIONS,
  JOB_REGION_KEYS,
  POSTED_WITHIN,
  type JobListParam,
  type JobParams,
} from "@/lib/jobs";
import type { useJobParams } from "@/lib/use-jobs";

type SetJobParams = ReturnType<typeof useJobParams>[1];

/** Turns one value of a list filter on or off. */
export function toggleJobParam<K extends JobListParam>(setParams: SetJobParams, key: K, value: JobParams[K][number]) {
  setParams((current) => {
    const list = current[key] as string[];
    return { [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] } as Partial<JobParams>;
  });
}

/** Every filter for the Jobs feed. Shown in the desktop sidebar and the phone filter sheet. */
export function JobFilterPanel({ params, setParams }: { params: JobParams; setParams: SetJobParams }) {
  const chips = <K extends JobListParam>(key: K, values: readonly JobParams[K][number][], labels: Record<string, string>) =>
    values.map((value) => (
      <FilterChip
        key={value}
        pressed={(params[key] as string[]).includes(value)}
        onPressedChange={() => toggleJobParam(setParams, key, value)}
      >
        {labels[value]}
      </FilterChip>
    ));

  return (
    <div className="space-y-7">
      <FilterGroup title="Show only">
        <FilterChip pressed={params.pay} onPressedChange={(pay) => setParams({ pay })}>
          Pay listed
        </FilterChip>
      </FilterGroup>

      <FilterGroup title="Kind of work">
        {chips(
          "category",
          JOB_CATEGORY_KEYS.filter((key) => key !== "other"),
          JOB_CATEGORIES,
        )}
      </FilterGroup>

      <FilterGroup
        title="Where you can work from"
        hint="Read from each role’s location. Roles open anywhere always count; ones that only say “Remote” don’t."
      >
        {chips("where", JOB_REGION_KEYS, JOB_REGIONS)}
      </FilterGroup>

      <FilterGroup title="Company’s remote policy">{chips("policy", REMOTE_POLICIES, remotePolicyLabels)}</FilterGroup>

      <FilterGroup title="Company size" hint="Number of people at the company.">
        {chips("size", COMPANY_SIZES, companySizeLabels)}
      </FilterGroup>

      <FilterGroup title="Company’s tech stack" hint="The company uses any of the ones you pick.">
        {chips("stack", TECHS, techLabels)}
      </FilterGroup>
    </div>
  );
}

/** Every applied Jobs filter as a removable item, for pills and the empty state. */
export function describeJobFilters(params: JobParams, setParams: SetJobParams): ActiveFilter[] {
  const kind = (key: JobListParam, label: string): FilterKind => ({ key, label, clear: () => setParams({ [key]: [] }) });
  const list = <K extends JobListParam>(key: K, filterKind: FilterKind, label: (value: string) => string, option?: (value: string) => string) =>
    (params[key] as string[]).map(
      (value): ActiveFilter => ({
        id: `${key}-${value}`,
        kind: filterKind,
        label: label(value),
        option: option?.(value),
        remove: () => toggleJobParam(setParams, key, value as JobParams[K][number]),
      }),
    );

  const filters: ActiveFilter[] = [];
  if (params.q.trim()) filters.push({ id: "q", label: `“${params.q.trim()}”`, remove: () => setParams({ q: "" }) });
  filters.push(...list("category", kind("category", "Kind of work"), (value) => JOB_CATEGORIES[value as keyof typeof JOB_CATEGORIES]));
  filters.push(...list("where", kind("where", "Location"), (value) => JOB_REGIONS[value as keyof typeof JOB_REGIONS]));
  if (params.posted) filters.push({ id: "posted", label: POSTED_WITHIN[params.posted], remove: () => setParams({ posted: "" }) });
  if (params.pay) filters.push({ id: "pay", label: "Pay listed", remove: () => setParams({ pay: false }) });
  filters.push(
    ...list("policy", kind("policy", "Remote policy"), (value) => remotePolicyLabels[value as keyof typeof remotePolicyLabels]),
  );
  filters.push(
    ...list(
      "size",
      kind("size", "Company size"),
      (value) => `Size ${companySizeLabels[value as keyof typeof companySizeLabels]}`,
      (value) => companySizeLabels[value as keyof typeof companySizeLabels],
    ),
  );
  filters.push(...list("stack", kind("stack", "Tech stack"), (value) => techLabels[value as keyof typeof techLabels]));
  return filters;
}

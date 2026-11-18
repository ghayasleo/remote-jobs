"use client";

import { ChevronDownIcon, MapPinIcon } from "lucide-react";
import { COUNTRY_LIST, JOB_REGIONS, JOB_REGION_KEYS, countryFromSlug, countrySlug } from "@/lib/jobs";
import { cn } from "@/lib/utils";

const GROUPS = JOB_REGION_KEYS.filter((region) => region !== "anywhere").map((region) => ({
  region,
  countries: COUNTRY_LIST.filter((country) => country.region === region).sort((a, b) => a.name.localeCompare(b.name)),
}));

/**
 * "Where I live": a chip showing the chosen country, with a native select
 * laid invisibly over it, so phones open their own picker and the chip is
 * only as wide as its label (a bare select is as wide as its longest option).
 */
export function CountrySelect({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (slug: string) => void;
  placeholder: string;
  className?: string;
}) {
  const country = countryFromSlug(value);
  return (
    <span
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background pr-2.5 pl-3 text-[0.8125rem] font-medium transition-colors duration-150 hover:bg-muted has-[select:focus-visible]:border-ring has-[select:focus-visible]:ring-3 has-[select:focus-visible]:ring-ring/50 pointer-coarse:h-9",
        country && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      <MapPinIcon className={cn("size-3.5", !country && "text-muted-foreground")} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{country?.name ?? placeholder}</span>
      <ChevronDownIcon className={cn("size-3.5", !country && "text-muted-foreground")} aria-hidden />
      <select
        aria-label="Where you live"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="">{placeholder}</option>
        {GROUPS.map(({ region, countries }) => (
          <optgroup key={region} label={JOB_REGIONS[region]}>
            {countries.map(({ name }) => (
              <option key={name} value={countrySlug(name)}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </span>
  );
}

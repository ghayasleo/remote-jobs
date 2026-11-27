"use client";

import { ChevronDownIcon, ClockIcon } from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { TIME_ZONE_OFFSETS, deviceOffset, formatOffset } from "@/lib/timezones";
import { cn } from "@/lib/utils";

/** Pick a UTC offset, or take this device's in one tap. */
export function TimeZoneSelect({ value, onChange, className }: { value: string; onChange: (tz: string) => void; className?: string }) {
  const hydrated = useHydrated();
  const mine = hydrated ? deviceOffset() : null;
  return (
    <div className={cn("grid gap-2", className)}>
      <label className="relative flex">
        <span className="sr-only">Your time zone</span>
        <ClockIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-full border bg-background pr-9 pl-10 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Any time zone</option>
          {TIME_ZONE_OFFSETS.map((offset) => (
            <option key={offset} value={String(offset)}>
              {formatOffset(offset)}
              {offset === mine ? " (yours)" : ""}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </label>
      {mine !== null && value !== String(mine) && (
        <button
          type="button"
          onClick={() => onChange(String(mine))}
          className="justify-self-start rounded-full text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Use mine ({formatOffset(mine)})
        </button>
      )}
    </div>
  );
}

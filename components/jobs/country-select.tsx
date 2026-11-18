"use client";

import { useState } from "react";
import { ChevronDownIcon, LoaderCircleIcon, MapPinIcon } from "lucide-react";
import { toast } from "sonner";
import { COUNTRY_LIST, JOB_REGIONS, JOB_REGION_KEYS, countryFromSlug, countrySlug } from "@/lib/jobs";
import { cn } from "@/lib/utils";

const GROUPS = JOB_REGION_KEYS.filter((region) => region !== "anywhere").map((region) => ({
  region,
  countries: COUNTRY_LIST.filter((country) => country.region === region).sort((a, b) => a.name.localeCompare(b.name)),
}));

/** The option that asks for the browser's location instead of picking a country. */
const LOCATE = "__locate";

type Located = { supported: true; name: string; slug: string } | { supported: false; name: string | null };

/** The browser's position, rounded to about a kilometre: plenty to tell the country. */
function currentPosition() {
  return new Promise<{ lat: number; lon: number }>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: Math.round(coords.latitude * 100) / 100, lon: Math.round(coords.longitude * 100) / 100 }),
      reject,
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    ),
  );
}

const isDenied = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 1;

/**
 * "Where I live": a chip showing the chosen country, with a native select
 * laid invisibly over it, so phones open their own picker and the chip is
 * only as wide as its label (a bare select is as wide as its longest option).
 * Its first option finds the country from the device's location.
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
  const [locating, setLocating] = useState(false);
  const country = countryFromSlug(value);

  async function locate() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser can’t share its location", { description: "Pick your country from the list instead." });
      return;
    }
    setLocating(true);
    try {
      const position = await currentPosition();
      const response = await fetch("/api/locate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(position),
      });
      if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
      const found = (await response.json()) as Located;
      if (found.supported) {
        onChange(found.slug);
        toast.success(`Showing roles open to people in ${found.name}`);
      } else {
        toast(`${found.name ?? "Your country"} isn’t on the list yet`, {
          description: "Pick the closest country, or choose Anywhere under “Where you can work from”.",
        });
      }
    } catch (error) {
      toast.error(isDenied(error) ? "Location access is off" : "Couldn’t find your location", {
        description: isDenied(error)
          ? "Allow it in your browser’s site settings, or pick your country from the list."
          : "Try again, or pick your country from the list.",
      });
    } finally {
      setLocating(false);
    }
  }

  const Icon = locating ? LoaderCircleIcon : MapPinIcon;
  return (
    <span
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border bg-background pr-2.5 pl-3 text-[0.8125rem] font-medium transition-colors duration-150 hover:bg-muted has-[select:focus-visible]:border-ring has-[select:focus-visible]:ring-3 has-[select:focus-visible]:ring-ring/50 pointer-coarse:h-9",
        country && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      <Icon className={cn("size-3.5", !country && "text-muted-foreground", locating && "motion-safe:animate-spin")} aria-hidden />
      <span className="min-w-0 flex-1 truncate" aria-live="polite">
        {locating ? "Finding you…" : (country?.name ?? placeholder)}
      </span>
      <ChevronDownIcon className={cn("size-3.5", !country && "text-muted-foreground")} aria-hidden />
      <select
        aria-label="Where you live"
        value={value}
        disabled={locating}
        onChange={(event) => {
          if (event.target.value === LOCATE) void locate();
          else onChange(event.target.value);
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-progress"
      >
        <option value="">{placeholder}</option>
        <option value={LOCATE}>Use my current location</option>
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

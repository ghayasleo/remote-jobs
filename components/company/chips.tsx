import { GlobeIcon } from "lucide-react";
import { label, regionLabels } from "@/lib/data/labels";
import { cn } from "@/lib/utils";

// Region colours are meaningful, never decorative, and always come with a
// text label (WCAG: colour is never the only signal).
const REGION_STYLES: Record<string, string> = {
  worldwide: "bg-region-worldwide text-region-worldwide-foreground",
  americas: "bg-region-americas text-region-americas-foreground",
  europe: "bg-region-europe text-region-europe-foreground",
  "americas-europe": "bg-region-americas-europe text-region-americas-europe-foreground",
  "asia-pacific": "bg-region-asia-pacific text-region-asia-pacific-foreground",
  other: "bg-region-other text-region-other-foreground",
};

const chip = "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap";

export function RegionChip({ region, className }: { region: string; className?: string }) {
  return (
    <span className={cn(chip, "font-semibold", REGION_STYLES[region] ?? REGION_STYLES.other, className)}>
      <GlobeIcon className="size-3" aria-hidden />
      {label(regionLabels, region) || "Other"}
    </span>
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(chip, "border text-muted-foreground", className)}>{children}</span>;
}

export function hiringLabel({ total, remote }: { total: number; remote: number }) {
  return remote > 0
    ? `${remote} remote role${remote === 1 ? "" : "s"}`
    : `${total} open role${total === 1 ? "" : "s"}`;
}

export function HiringBadge({ total, remote, className }: { total: number; remote: number; className?: string }) {
  return (
    <span className={cn(chip, "bg-hiring font-semibold text-hiring-foreground", className)}>
      <span className="size-1.5 rounded-full bg-sun ring-2 ring-sun/30" aria-hidden />
      Hiring · {hiringLabel({ total, remote })}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-secondary px-2 text-[0.6875rem] font-bold text-secondary-foreground">
      New
    </span>
  );
}

import { BRAND, SUN_PATHS } from "@/lib/brand-mark";
import { cn } from "@/lib/utils";

/** The striped sun on its own. Decorative. */
export function Sun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-hidden>
      {SUN_PATHS.map((d) => (
        <path key={d} d={d} fill={BRAND.sun} />
      ))}
    </svg>
  );
}

/** The app icon: the sun on an ink tile. Decorative unless labelled. */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <rect width="512" height="512" rx="116" fill={BRAND.ink} />
      {/* A faint edge so the tile still separates from a dark page. */}
      <rect x="4" y="4" width="504" height="504" rx="112" fill="none" stroke={BRAND.white} strokeOpacity="0.1" strokeWidth="8" />
      <g transform="translate(110 110) scale(2.92)">
        {SUN_PATHS.map((d) => (
          <path key={d} d={d} fill={BRAND.sun} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The logo: "remotejobs" in one ink colour, with the sun as the "o". Its
 * accessible name comes from the link around it ("Remote Jobs, home").
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline text-[1.375rem] leading-none font-extrabold tracking-[-0.04em] text-foreground",
        className,
      )}
    >
      rem
      <Sun className="mx-[0.015em] size-[0.7em] translate-y-[0.075em]" />
      tejobs
    </span>
  );
}

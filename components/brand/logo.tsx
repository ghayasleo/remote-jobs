import { BRAND, GLYPH } from "@/lib/brand-mark";
import { cn } from "@/lib/utils";

/** The app icon: a sun rising over the horizon. Decorative unless labelled. */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  const { sun, horizon, path, rays } = GLYPH;
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <rect width="512" height="512" rx="116" fill={BRAND.violet} />
      {rays.map((ray) => (
        <line key={`${ray.x2}-${ray.y2}`} {...ray} stroke={BRAND.sun} strokeWidth="22" strokeLinecap="round" />
      ))}
      <path d={sun} fill={BRAND.sun} />
      <rect {...horizon} rx={horizon.height / 2} fill={BRAND.white} />
      <rect {...path} rx={path.height / 2} fill={BRAND.white} opacity="0.7" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[1.0625rem] font-bold tracking-tight">Remote Jobs</span>
    </span>
  );
}

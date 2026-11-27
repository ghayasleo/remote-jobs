import { cn } from "@/lib/utils";

/** The title of a dashboard screen, with a line of detail and its actions. */
export function ScreenHeading({
  title,
  detail,
  actions,
  className,
}: {
  title: React.ReactNode;
  detail?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-[clamp(1.75rem,3.5vw,2.25rem)] leading-tight font-extrabold tracking-[-0.03em]">{title}</h1>
        {detail && <div className="mt-1.5 text-muted-foreground">{detail}</div>}
      </div>
      {actions && <div className="flex gap-1">{actions}</div>}
    </header>
  );
}

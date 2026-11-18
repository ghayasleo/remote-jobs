import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, PauseIcon } from "lucide-react";
import { MOMENTUM, type Momentum } from "@/lib/momentum";
import { cn } from "@/lib/utils";

const STYLES: Record<Momentum, string> = {
  growing: "bg-hiring text-hiring-foreground",
  started: "bg-hiring text-hiring-foreground",
  steady: "bg-secondary text-secondary-foreground",
  slowing: "border text-muted-foreground",
  paused: "bg-destructive/10 text-destructive",
};
const ICONS = { growing: ArrowUpRightIcon, started: ArrowUpRightIcon, steady: MinusIcon, slowing: ArrowDownRightIcon, paused: PauseIcon };

/** A company's hiring momentum: always a word and an icon, never colour alone. */
export function MomentumChip({ label, className }: { label: Momentum; className?: string }) {
  const Icon = ICONS[label];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", STYLES[label], className)}>
      <Icon className="size-3.5" aria-hidden />
      {MOMENTUM[label]}
    </span>
  );
}

import { MomentumChip } from "@/components/market/momentum-chip";
import { Sparkline } from "@/components/market/sparkline";
import type { MomentumResult } from "@/lib/momentum";
import { formatDate } from "@/lib/format";

const number = new Intl.NumberFormat("en");
const roles = (count: number) => `${number.format(count)} remote ${count === 1 ? "role" : "roles"}`;

/**
 * How a company's hiring is moving. What's known today (roles posted in the
 * last 30 days, the kinds of work) shows straight away; the label, the trend
 * line and opened/closed counts appear once the daily history covers them.
 */
export function HiringMomentum({
  postedLast30,
  mix,
  trend,
  series,
  opened30,
  closed30,
  hasOpenings,
}: {
  postedLast30: number;
  mix: { label: string; count: number }[];
  trend: MomentumResult | null;
  series: number[];
  opened30: number;
  closed30: number;
  hasOpenings: boolean;
}) {
  return (
    <section aria-labelledby="momentum-title" className="rounded-2xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="momentum-title" className="text-base font-bold tracking-tight">
          Hiring momentum
        </h2>
        {trend && <MomentumChip label={trend.label} />}
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-semibold">{roles(postedLast30)}</span> posted in the last 30 days
          </p>
          {hasOpenings && (opened30 > 0 || closed30 > 0) && (
            <p className="text-muted-foreground">
              {number.format(opened30)} opened · {number.format(closed30)} closed since we started counting
            </p>
          )}
          {trend && (
            <p className="text-muted-foreground">
              {roles(trend.now)} open now, {trend.then === trend.now ? "the same as" : `${trend.now > trend.then ? "up" : "down"} from ${number.format(trend.then)}`} on{" "}
              {formatDate(trend.since)}
            </p>
          )}
          {mix.length > 0 && (
            <p className="text-muted-foreground">Most open remote roles: {mix.map((kind) => `${kind.label} (${kind.count})`).join(", ")}</p>
          )}
        </div>
        <Sparkline values={series} className="text-primary" />
      </div>
      {!trend && (
        <p className="mt-3 text-xs text-muted-foreground">
          The trend appears once a week of daily records exists for this company.
        </p>
      )}
    </section>
  );
}

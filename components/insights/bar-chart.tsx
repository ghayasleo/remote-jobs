"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BarRow = { label: string; value: number; href?: string; detail?: string };

const number = new Intl.NumberFormat("en");

/**
 * A ranked horizontal bar chart. Every row is one link with its value printed at
 * the bar's tip; hover or focus shows extra detail; a table view follows.
 */
export function BarChart({ caption, rows, unit }: { caption: string; rows: BarRow[]; unit: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <figure>
      <ul aria-label={caption} className="space-y-0.5">
        {rows.map((row) => {
          const share = (row.value / max) * 100;
          const body = (
            <>
              <span className="truncate text-sm font-medium">{row.label}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  // Square at the baseline, rounded at the data end; never wider than its row.
                  className="h-4 min-w-0.5 rounded-r-[4px] bg-chart-bar transition-[filter] duration-150 group-hover:brightness-110 group-focus-visible:brightness-110"
                  style={{ width: `calc((100% - 3.5rem) * ${share / 100})` }}
                />
                <span className="text-sm tabular-nums">
                  {number.format(row.value)}
                  <span className="sr-only"> {unit}</span>
                </span>
              </span>
            </>
          );
          const rowClass =
            "group grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted focus-visible:bg-muted sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]";
          const trigger = row.href ? (
            <Link href={row.href} className={rowClass}>
              {body}
            </Link>
          ) : (
            <div tabIndex={0} className={cn(rowClass, "outline-none")}>
              {body}
            </div>
          );
          return (
            <li key={row.label}>
              {row.detail ? (
                <Tooltip>
                  <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                  <TooltipContent side="top">{row.detail}</TooltipContent>
                </Tooltip>
              ) : (
                trigger
              )}
            </li>
          );
        })}
      </ul>
      <details className="mt-2 px-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              <th scope="col" className="py-1.5 font-medium">Name</th>
              <th scope="col" className="py-1.5 text-right font-medium">{unit}</th>
              {rows.some((row) => row.detail) && <th scope="col" className="py-1.5 pl-4 font-medium">Detail</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <th scope="row" className="py-1.5 font-normal">{row.label}</th>
                <td className="py-1.5 text-right tabular-nums">{number.format(row.value)}</td>
                {rows.some((r) => r.detail) && <td className="py-1.5 pl-4 text-muted-foreground">{row.detail ?? ""}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

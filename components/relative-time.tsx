"use client";

import { useSyncExternalStore } from "react";
import { formatDate } from "@/lib/format";

const DAY = 86_400_000;
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTo(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < 60 * 60_000) return relative.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return relative.format(Math.round(diff / (60 * 60_000)), "hour");
  if (abs < 30 * DAY) return relative.format(Math.round(diff / DAY), "day");
  if (abs < 365 * DAY) return relative.format(Math.round(diff / (30 * DAY)), "month");
  return relative.format(Math.round(diff / (365 * DAY)), "year");
}

const noop = () => () => {};
// One "now" per page load: a snapshot must not change between reads.
let pageLoadedAt: number | null = null;
const getNow = () => (pageLoadedAt ??= Date.now());

/** "3 days ago" in the browser; a plain date in the prerendered HTML. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const now = useSyncExternalStore(noop, getNow, () => null);
  return (
    <time dateTime={iso} title={formatDate(iso)} className={className}>
      {now === null ? formatDate(iso) : relativeTo(iso, now)}
    </time>
  );
}

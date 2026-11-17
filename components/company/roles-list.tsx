"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, ChevronRightIcon } from "lucide-react";
import { FilterChip } from "@/components/explore/filters";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import type { OpenRoles, Role, Workplace } from "@/lib/data/job-boards";
import { isPlaceholderRole, jobPath } from "@/lib/jobs";
import { cn } from "@/lib/utils";

const INITIAL_ROLES = 8;

const WORKPLACE: Record<Workplace, { label: string; className: string }> = {
  remote: { label: "Remote", className: "bg-region-worldwide text-region-worldwide-foreground" },
  hybrid: { label: "Hybrid", className: "bg-region-other text-region-other-foreground" },
  onsite: { label: "On-site", className: "border text-muted-foreground" },
};

const rowLink =
  "group flex items-start justify-between gap-3 font-semibold outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline";
const rowIcon =
  "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5";

function RoleRow({ role, company }: { role: Role; company: string }) {
  const workplace = role.workplace ? WORKPLACE[role.workplace] : null;
  const details = [role.location, role.team, role.employmentType].filter(Boolean);
  return (
    <li className="relative px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5">
      {/* Remote roles have their own page here; others go straight to the board. */}
      {role.workplace === "remote" && !isPlaceholderRole(role.title) ? (
        <Link href={jobPath({ company, id: role.id })} className={rowLink}>
          <span>{role.title}</span>
          <ChevronRightIcon className={rowIcon} aria-hidden />
        </Link>
      ) : (
        <a href={role.url} target="_blank" rel="noopener noreferrer" className={rowLink}>
          <span>{role.title}</span>
          <ArrowUpRightIcon className={`${rowIcon} group-hover:-translate-y-0.5`} aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {workplace && (
          <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold", workplace.className)}>
            {workplace.label}
          </span>
        )}
        {details.length > 0 && <span>{details.join(" · ")}</span>}
      </div>
      {(role.salary || role.postedAt) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {role.salary && <span className="font-medium">{role.salary}</span>}
          {role.postedAt && (
            <span className="text-muted-foreground">
              Posted <RelativeTime iso={role.postedAt} />
            </span>
          )}
        </div>
      )}
    </li>
  );
}

export function RolesList({ data, company }: { data: OpenRoles; company: string }) {
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const roles = remoteOnly ? data.roles.filter((role) => role.workplace === "remote") : data.roles;
  const shown = expanded ? roles : roles.slice(0, INITIAL_ROLES);
  const canToggleRemote = data.remote > 0 && data.remote < data.total;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{data.total}</span> open{" "}
          {data.total === 1 ? "role" : "roles"}
          {data.remote > 0 && (
            <>
              , <span className="font-semibold text-foreground tabular-nums">{data.remote}</span> remote
            </>
          )}{" "}
          · via {data.providerLabel} · updated <RelativeTime iso={data.fetchedAt} />
        </p>
        {canToggleRemote && (
          <FilterChip pressed={remoteOnly} onPressedChange={setRemoteOnly}>
            Remote only
          </FilterChip>
        )}
      </div>

      <ul className="mt-4 divide-y rounded-2xl border">
        {shown.map((role) => (
          <RoleRow key={role.id} role={role} company={company} />
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {roles.length > INITIAL_ROLES && (
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show fewer" : `Show all ${roles.length}`}
          </Button>
        )}
        <Button asChild variant="ghost" className="h-11 rounded-full px-4">
          <a href={data.boardUrl} target="_blank" rel="noopener noreferrer">
            Every role on {data.providerLabel}
            <ArrowUpRightIcon aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      </div>
      {data.total > data.roles.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {data.roles.length} of {data.total}, remote roles and newest first.
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BriefcaseIcon, ChevronDownIcon, DownloadIcon, StickyNoteIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { CompanyLogo } from "@/components/company/company-logo";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { jobPath } from "@/lib/jobs";
import { allTrackedJobs, removeJob, replaceTracked, restoreJob, setNote, setStatus, useTrackedJobs } from "@/lib/tracker";
import {
  TRACK_STATUSES,
  TRACK_STATUS_KEYS,
  cleanTrackedJob,
  mergeTracked,
  type TrackStatus,
  type TrackedJob,
} from "@/lib/tracker-model";
import { cn } from "@/lib/utils";

function StatusSelect({ job }: { job: TrackedJob }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Status of {job.title}</span>
      <select
        value={job.status}
        onChange={(event) => setStatus(job.key, event.target.value as TrackStatus)}
        className="h-9 appearance-none rounded-full border bg-background pr-8 pl-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10"
      >
        {TRACK_STATUS_KEYS.map((status) => (
          <option key={status} value={status}>
            {TRACK_STATUSES[status]}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </label>
  );
}

/** One saved job: title and company, then its status, date, note and remove. */
function TrackedRow({ job }: { job: TrackedJob }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job.note);
  const remove = () => {
    removeJob(job.key);
    toast(`Removed “${job.title}”`, { action: { label: "Undo", onClick: () => restoreJob(job) } });
  };
  const save = () => {
    if (draft !== job.note) setNote(job.key, draft);
    setEditing(false);
  };
  const when = job.appliedAt ? (
    <>
      Applied <RelativeTime iso={job.appliedAt} />
    </>
  ) : (
    <>
      Saved <RelativeTime iso={job.savedAt} />
    </>
  );
  const actions = (
    <>
      <StatusSelect job={job} />
      <Button
        variant="ghost"
        size="icon"
        aria-label={job.note ? `Edit the note for ${job.title}` : `Add a note to ${job.title}`}
        aria-expanded={editing}
        onClick={() => {
          setDraft(job.note);
          setEditing((open) => !open);
        }}
        className={cn("size-9 rounded-full", job.note ? "text-foreground" : "text-muted-foreground")}
      >
        <StickyNoteIcon className="size-4" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={remove} aria-label={`Remove ${job.title}`} className="size-9 rounded-full text-muted-foreground">
        <Trash2Icon className="size-4" aria-hidden />
      </Button>
    </>
  );

  return (
    <li className="relative px-4 py-3.5 transition-colors duration-150 hover:bg-muted/50 has-[a:focus-visible]:bg-muted/50 sm:px-5">
      <div className="flex items-center gap-3.5">
        <CompanyLogo name={job.companyName} domain={job.domain} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link
              href={jobPath({ company: job.company, id: job.id, title: job.title })}
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
            >
              {job.title}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {[job.companyName, job.location].filter(Boolean).join(" · ")}
            <span className="sm:hidden"> · {when}</span>
          </p>
          {job.note && !editing && (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-foreground/80">
              <StickyNoteIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{job.note}</span>
            </p>
          )}
        </div>
        <span className="hidden w-32 shrink-0 text-right text-sm text-muted-foreground sm:block">{when}</span>
        <div className="relative z-10 hidden shrink-0 items-center gap-1 sm:flex">{actions}</div>
      </div>
      <div className="relative z-10 mt-2.5 flex items-center gap-1 pl-[3.625rem] sm:hidden">{actions}</div>
      {editing && (
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
          }}
          maxLength={2000}
          rows={3}
          placeholder="Who you talked to, next steps, salary they mentioned…"
          aria-label={`Note for ${job.title}`}
          className="relative z-10 mt-3 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:ml-[3.625rem] sm:w-[calc(100%-3.625rem)]"
        />
      )}
    </li>
  );
}

function exportJson(jobs: TrackedJob[]) {
  const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `remotejobs-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function ImportButton() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            const parsed: unknown = JSON.parse(await file.text());
            const jobs = (Array.isArray(parsed) ? parsed : []).map(cleanTrackedJob).filter((job): job is TrackedJob => job !== null);
            if (jobs.length === 0) throw new Error("empty");
            replaceTracked(mergeTracked(allTrackedJobs(), jobs));
            toast.success(`Imported ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`);
          } catch {
            toast.error("That file isn't a RemoteJobs tracker export.");
          }
        }}
      />
      <Button variant="ghost" className="h-10 rounded-full px-3 text-muted-foreground" onClick={() => input.current?.click()}>
        <UploadIcon aria-hidden />
        Import
      </Button>
    </>
  );
}

function EmptyTracker() {
  return (
    <div className="rounded-2xl border border-dashed px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
        <BriefcaseIcon className="size-6" aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-semibold">No saved jobs yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
        Save any role with its bookmark, then move it from Saved to Applied, Interviewing and Offer as things happen. Add
        notes as you go.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 rounded-full px-5">
          <Link href="/jobs">Browse remote jobs</Link>
        </Button>
        <ImportButton />
      </div>
    </div>
  );
}

/** Saved jobs and where each application stands, grouped by status. */
export function TrackerView() {
  const jobs = useTrackedJobs();
  const [filter, setFilter] = useState<TrackStatus | "all">("all");
  const counts = Object.fromEntries(TRACK_STATUS_KEYS.map((status) => [status, jobs.filter((job) => job.status === status).length])) as Record<TrackStatus, number>;

  if (jobs.length === 0) return <EmptyTracker />;

  const groups = TRACK_STATUS_KEYS.filter((status) => (filter === "all" || filter === status) && counts[status] > 0);
  return (
    <div className="min-w-0 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]" aria-label="Show applications by status">
          {(["all", ...TRACK_STATUS_KEYS] as const).map((status) => {
            const count = status === "all" ? jobs.length : counts[status];
            if (status !== "all" && count === 0) return null;
            return (
              <li key={status}>
                <button
                  type="button"
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10",
                    filter === status ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {status === "all" ? "All" : TRACK_STATUSES[status]}
                  <span className="tabular-nums opacity-75">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-1">
          <Button variant="ghost" className="h-9 rounded-full px-3 text-muted-foreground" onClick={() => exportJson(jobs)}>
            <DownloadIcon aria-hidden />
            Export
          </Button>
          <ImportButton />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        {groups.map((status) => (
          <section key={status} aria-labelledby={`status-${status}`}>
            <h2 id={`status-${status}`} className="mb-2 flex items-baseline gap-2 px-1 text-sm font-bold">
              {TRACK_STATUSES[status]}
              <span className="font-medium text-muted-foreground tabular-nums">{counts[status]}</span>
            </h2>
            <ul className="divide-y overflow-hidden rounded-2xl border">
              {jobs
                .filter((job) => job.status === status)
                .map((job) => (
                  <TrackedRow key={job.key} job={job} />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

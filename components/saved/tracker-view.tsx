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

function NoteEditor({ job }: { job: TrackedJob }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(job.note);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(job.note);
          setOpen(true);
        }}
        className="relative z-10 mt-2 flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <StickyNoteIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="line-clamp-3 whitespace-pre-line">{job.note || "Add a note"}</span>
      </button>
    );
  }
  const save = () => {
    if (draft !== job.note) setNote(job.key, draft);
    setOpen(false);
  };
  return (
    <textarea
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
      }}
      maxLength={2000}
      rows={3}
      placeholder="Who you talked to, next steps, salary they mentioned…"
      aria-label={`Note for ${job.title}`}
      className="relative z-10 mt-2 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

function StatusSelect({ job }: { job: TrackedJob }) {
  return (
    <label className="relative z-10 inline-flex">
      <span className="sr-only">Status of {job.title}</span>
      <select
        value={job.status}
        onChange={(event) => setStatus(job.key, event.target.value as TrackStatus)}
        className="h-8 appearance-none rounded-full border bg-background pr-7 pl-3 text-xs font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10"
      >
        {TRACK_STATUS_KEYS.map((status) => (
          <option key={status} value={status}>
            {TRACK_STATUSES[status]}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </label>
  );
}

function TrackedCard({ job, compact = false }: { job: TrackedJob; compact?: boolean }) {
  const remove = () => {
    removeJob(job.key);
    toast(`Removed “${job.title}”`, { action: { label: "Undo", onClick: () => restoreJob(job) } });
  };
  return (
    <li className="relative min-w-0 rounded-2xl border bg-card p-4 transition-colors duration-150 has-[a:focus-visible]:border-ring">
      <div className="flex items-start gap-3">
        {!compact && <CompanyLogo name={job.companyName} domain={job.domain} />}
        <div className="min-w-0 flex-1">
          <h3 className="leading-snug font-semibold">
            <Link
              href={jobPath({ company: job.company, id: job.id, title: job.title })}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:underline"
            >
              {job.title}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {[job.companyName, job.location].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={remove}
          aria-label={`Remove ${job.title}`}
          className="relative z-10 -mt-1 -mr-1 size-9 shrink-0 rounded-full text-muted-foreground"
        >
          <Trash2Icon className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusSelect job={job} />
        {job.appliedAt ? (
          <span>
            Applied <RelativeTime iso={job.appliedAt} />
          </span>
        ) : (
          <span>
            Saved <RelativeTime iso={job.savedAt} />
          </span>
        )}
      </div>
      <NoteEditor job={job} />
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

/** Saved jobs and where each application stands: a board on wide screens, a filtered list on phones. */
export function TrackerView() {
  const jobs = useTrackedJobs();
  const [filter, setFilter] = useState<TrackStatus | "all">("all");
  const counts = Object.fromEntries(TRACK_STATUS_KEYS.map((status) => [status, jobs.filter((job) => job.status === status).length])) as Record<TrackStatus, number>;

  if (jobs.length === 0) return <EmptyTracker />;

  const shown = filter === "all" ? jobs : jobs.filter((job) => job.status === filter);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] lg:hidden" aria-label="Show applications by status">
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
                    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" className="h-10 rounded-full px-3 text-muted-foreground" onClick={() => exportJson(jobs)}>
            <DownloadIcon aria-hidden />
            Export
          </Button>
          <ImportButton />
        </div>
      </div>

      {/* Phones and tablets: one list, filtered by status. */}
      <ul className="mt-4 grid grid-cols-1 gap-3 lg:hidden">
        {shown.map((job) => (
          <TrackedCard key={job.key} job={job} />
        ))}
      </ul>

      {/* Wide screens: the board. Each card's status menu moves it between columns. */}
      <div className="mt-4 hidden gap-3 lg:grid lg:grid-cols-5 lg:items-start">
        {TRACK_STATUS_KEYS.map((status) => (
          <section key={status} aria-labelledby={`column-${status}`} className="min-w-0 rounded-2xl bg-muted/60 p-2">
            <h2 id={`column-${status}`} className="flex items-baseline justify-between px-2 pt-1 pb-2 text-sm font-bold">
              {TRACK_STATUSES[status]}
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{counts[status]}</span>
            </h2>
            <ul className="grid grid-cols-1 gap-2">
              {jobs
                .filter((job) => job.status === status)
                .map((job) => (
                  <TrackedCard key={job.key} job={job} compact />
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

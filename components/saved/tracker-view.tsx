"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BriefcaseIcon, ChevronDownIcon, StickyNoteIcon, Trash2Icon, UploadIcon } from "lucide-react";
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

/** One application on the board. */
function TrackedCard({ job }: { job: TrackedJob }) {
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

  return (
    <li className="relative rounded-2xl border bg-card p-3.5 transition-colors duration-150 hover:border-foreground/20 has-[a:focus-visible]:border-ring">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CompanyLogo name={job.companyName} domain={job.domain} size="xs" />
        <span className="truncate">
          <span className="font-semibold text-foreground">{job.companyName}</span>
          {job.location && ` · ${job.location}`}
        </span>
      </p>
      <h3 className="mt-2 line-clamp-2 leading-snug font-semibold">
        <Link
          href={jobPath({ company: job.company, id: job.id, title: job.title })}
          className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
        >
          {job.title}
        </Link>
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {job.appliedAt ? "Applied " : "Saved "}
        <RelativeTime iso={job.appliedAt ?? job.savedAt} />
      </p>
      {job.note && !editing && (
        <p className="mt-1.5 line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">{job.note}</p>
      )}
      <div className="relative z-10 mt-3 flex items-center gap-1">
        <StatusSelect job={job} />
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          aria-label={job.note ? `Edit the note for ${job.title}` : `Add a note to ${job.title}`}
          aria-expanded={editing}
          onClick={() => {
            setDraft(job.note);
            setEditing((open) => !open);
          }}
          className={cn("size-8 rounded-full", job.note ? "text-foreground" : "text-muted-foreground")}
        >
          <StickyNoteIcon className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} aria-label={`Remove ${job.title}`} className="size-8 rounded-full text-muted-foreground">
          <Trash2Icon className="size-4" aria-hidden />
        </Button>
      </div>
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
          className="relative z-10 mt-2.5 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      )}
    </li>
  );
}

export function exportTracker(jobs: TrackedJob[]) {
  const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `remotejobs-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportButton() {
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
      <Button variant="ghost" className="h-9 rounded-full px-3 text-muted-foreground" onClick={() => input.current?.click()}>
        <UploadIcon aria-hidden />
        Import
      </Button>
    </>
  );
}

/**
 * The applications board: one column per status. On wide screens the columns
 * share the width; on narrower ones they keep a comfortable width and the board
 * scrolls sideways on its own. The page itself never scrolls sideways.
 */
export function TrackerView() {
  const jobs = useTrackedJobs();
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <BriefcaseIcon className="size-5" aria-hidden />
        </span>
        <h3 className="mt-4 font-semibold">No applications yet</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Save any role with its bookmark, then move it from Saved to Applied, Interviewing and Offer as things happen.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild className="h-10 rounded-full px-5">
            <Link href="/jobs">Browse remote jobs</Link>
          </Button>
          <ImportButton />
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Applications by status"
      tabIndex={0}
      className="-mx-4 grid auto-cols-[min(17.5rem,82vw)] grid-flow-col snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:auto-cols-[minmax(14rem,1fr)] lg:snap-none [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
    >
      {TRACK_STATUS_KEYS.map((status) => {
        const column = jobs.filter((job) => job.status === status);
        return (
          <section
            key={status}
            aria-labelledby={`column-${status}`}
            className="flex min-w-0 snap-start flex-col rounded-2xl bg-muted/60 p-2"
          >
            <h3 id={`column-${status}`} className="flex items-baseline justify-between px-2 pt-1 pb-2 text-sm font-bold">
              {TRACK_STATUSES[status]}
              <span className="text-xs font-medium text-muted-foreground tabular-nums">{column.length}</span>
            </h3>
            {column.length > 0 ? (
              <ul className="grid grid-cols-1 gap-2">
                {column.map((job) => (
                  <TrackedCard key={job.key} job={job} />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Nothing here yet</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

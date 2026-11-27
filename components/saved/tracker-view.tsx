"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
} from "@dnd-kit/core";
import { BriefcaseIcon, ChevronDownIcon, StickyNoteIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { CompanyLogo } from "@/components/company/company-logo";
import { confirmUnsaveJob } from "@/components/jobs/save-job-button";
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
    <label className="relative inline-flex min-w-0">
      <span className="sr-only">Status of {job.title}</span>
      <select
        value={job.status}
        onChange={(event) => setStatus(job.key, event.target.value as TrackStatus)}
        className="h-8 min-w-0 appearance-none truncate rounded-full border bg-background pr-6 pl-2.5 text-xs font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-10"
      >
        {TRACK_STATUS_KEYS.map((status) => (
          <option key={status} value={status}>
            {TRACK_STATUSES[status]}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </label>
  );
}

// Presses on a card's controls are for the controls, never the start of a drag.
const keepFromDrag = {
  onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: React.SyntheticEvent) => event.stopPropagation(),
};

/** What a card shows: on the board, and following the pointer while it's dragged. */
function CardBody({ job, lifted = false }: { job: TrackedJob; lifted?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job.note);
  const remove = async () => {
    if (!(await confirmUnsaveJob(job))) return;
    removeJob(job.key);
    toast(`Removed “${job.title}”`, { action: { label: "Undo", onClick: () => restoreJob(job) } });
  };
  const save = () => {
    if (draft !== job.note) setNote(job.key, draft);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-3 transition-colors duration-150 hover:border-foreground/20 has-[a:focus-visible]:border-ring",
        lifted && "rotate-2 cursor-grabbing border-foreground/20 shadow-xl",
      )}
    >
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CompanyLogo name={job.companyName} domain={job.domain} size="xs" />
        <span className="truncate">
          <span className="font-semibold text-foreground">{job.companyName}</span>
          {job.location && ` · ${job.location}`}
        </span>
      </p>
      <h3 className="mt-2 line-clamp-2 text-[0.9375rem] leading-snug font-semibold">
        <Link
          href={jobPath({ company: job.company, id: job.id, title: job.title })}
          draggable={false}
          className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
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
      <div className="relative z-10 mt-2.5 flex items-center gap-0.5" {...keepFromDrag}>
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
          className={cn("size-7 shrink-0 rounded-full pointer-coarse:size-9", job.note ? "text-foreground" : "text-muted-foreground")}
        >
          <StickyNoteIcon className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={remove}
          aria-label={`Remove ${job.title}`}
          className="size-7 shrink-0 rounded-full text-muted-foreground pointer-coarse:size-9"
        >
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
          {...keepFromDrag}
          maxLength={2000}
          rows={3}
          placeholder="Who you talked to, next steps, salary they mentioned…"
          aria-label={`Note for ${job.title}`}
          className="relative z-10 mt-2.5 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm select-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      )}
    </div>
  );
}

// A drag ends with the pointer let go over the card; that mustn't also open it.
let lastDragEnd = 0;
const swallowClickAfterDrag = (event: React.MouseEvent) => {
  if (Date.now() - lastDragEnd < 250) {
    event.preventDefault();
    event.stopPropagation();
  }
};

/** A card that can be picked up and dropped on another column. The status menu does the same from the keyboard. */
function TrackedCard({ job }: { job: TrackedJob }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: job.key });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      onClickCapture={swallowClickAfterDrag}
      className={cn("touch-manipulation select-none [-webkit-touch-callout:none] [&_img]:pointer-events-none", isDragging && "opacity-40")}
    >
      <CardBody job={job} />
    </li>
  );
}

function Column({ status, jobs, dragging }: { status: TrackStatus; jobs: TrackedJob[]; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}`}
      className={cn(
        "flex min-h-0 min-w-0 snap-start flex-col rounded-2xl bg-muted/60 ring-primary/60 transition-[background-color,box-shadow] duration-150",
        isOver && "bg-muted ring-2",
      )}
    >
      <h2 id={`column-${status}`} className="flex items-baseline justify-between px-3.5 pt-3 pb-2 text-sm font-bold">
        {TRACK_STATUSES[status]}
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{jobs.length}</span>
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 [scrollbar-width:thin]">
        {jobs.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2">
            {jobs.map((job) => (
              <TrackedCard key={job.key} job={job} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            {dragging ? "Drop here" : "Nothing here yet"}
          </p>
        )}
      </div>
    </section>
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

// Over a column if the pointer is inside one; otherwise whichever the card overlaps most.
const collisions: CollisionDetection = (args) => {
  const inside = pointerWithin(args);
  return inside.length > 0 ? inside : rectIntersection(args);
};

/**
 * The saved jobs board: one column per status, as tall as the screen allows,
 * each scrolling on its own. Cards move between columns by dragging them, or
 * with their status menu. When the columns don't all fit, the board scrolls
 * sideways on its own; the page never does.
 */
export function TrackerView() {
  const jobs = useTrackedJobs();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press first, so a swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <BriefcaseIcon className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 font-semibold">No saved jobs yet</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Save any role with its bookmark, then drag it from Saved to Applied, Interviewing and Offer as things happen.
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

  const byKey = new Map(jobs.map((job) => [job.key, job]));
  const active = activeKey ? byKey.get(activeKey) : undefined;
  const title = (id: string | number) => byKey.get(String(id))?.title ?? "the job";
  const column = (id: string | number) => TRACK_STATUSES[id as TrackStatus] ?? "a column";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${title(active.id)} is over ${column(over.id)}.` : `${title(active.id)} is not over a column.`),
    onDragEnd: ({ active, over }) => (over ? `${title(active.id)} moved to ${column(over.id)}.` : `${title(active.id)} was put back.`),
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisions}
      accessibility={{ announcements }}
      onDragStart={({ active }) => setActiveKey(String(active.id))}
      onDragCancel={() => {
        lastDragEnd = Date.now();
        setActiveKey(null);
      }}
      onDragEnd={({ active, over }) => {
        lastDragEnd = Date.now();
        setActiveKey(null);
        const job = byKey.get(String(active.id));
        if (job && over && over.id !== job.status) setStatus(job.key, over.id as TrackStatus);
      }}
    >
      <div
        role="region"
        aria-label="Saved jobs by status"
        tabIndex={0}
        className="-mx-4 grid h-[max(24rem,calc(100dvh-24.5rem))] auto-cols-[min(17.5rem,82vw)] grid-flow-col grid-rows-[minmax(0,1fr)] snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overflow-y-hidden px-4 pb-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:h-[max(28rem,calc(100dvh-17.5rem))] lg:auto-cols-[minmax(12.5rem,1fr)] lg:snap-none [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
      >
        {TRACK_STATUS_KEYS.map((status) => (
          <Column key={status} status={status} jobs={jobs.filter((job) => job.status === status)} dragging={active !== undefined} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{active ? <CardBody job={active} lifted /> : null}</DragOverlay>
    </DndContext>
  );
}

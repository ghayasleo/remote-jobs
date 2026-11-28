"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BriefcaseIcon, CalendarIcon, CircleIcon, EllipsisIcon, FileTextIcon, PlusIcon, StickyNoteIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { CompanyLogo } from "@/components/company/company-logo";
import { confirmUnsaveJob } from "@/components/jobs/save-job-button";
import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tailorCvFor } from "@/lib/cv-maker/client";
import { CV_MAKER_ENABLED } from "@/lib/features";
import { jobPath } from "@/lib/jobs";
import { allTrackedJobs, moveJob, removeJob, replaceTracked, restoreJob, setNote, setStatus, useTrackedJobs } from "@/lib/tracker";
import {
  TRACK_STATUSES,
  TRACK_STATUS_KEYS,
  boardOrder,
  cleanTrackedJob,
  mergeTracked,
  orderBetween,
  type TrackStatus,
  type TrackedJob,
} from "@/lib/tracker-model";
import { cn } from "@/lib/utils";

/** Each status's colour: the header pill, the count, the lane's tint and the slot a dragged card will land in. */
const STATUS_STYLE: Record<TrackStatus, { pill: string; count: string; lane: string; slot: string; dot: string }> = {
  saved: {
    pill: "bg-violet-500 text-white",
    count: "text-violet-600 dark:text-violet-400",
    lane: "bg-violet-500/[0.06] dark:bg-violet-400/[0.08]",
    slot: "border-violet-500/60 bg-violet-500/10",
    dot: "bg-violet-500",
  },
  applied: {
    pill: "bg-sky-500 text-white",
    count: "text-sky-600 dark:text-sky-400",
    lane: "bg-sky-500/[0.06] dark:bg-sky-400/[0.08]",
    slot: "border-sky-500/60 bg-sky-500/10",
    dot: "bg-sky-500",
  },
  interviewing: {
    pill: "bg-amber-400 text-amber-950",
    count: "text-amber-600 dark:text-amber-400",
    lane: "bg-amber-400/[0.09] dark:bg-amber-400/[0.09]",
    slot: "border-amber-500/60 bg-amber-400/10",
    dot: "bg-amber-400",
  },
  offer: {
    pill: "bg-emerald-500 text-white",
    count: "text-emerald-600 dark:text-emerald-400",
    lane: "bg-emerald-500/[0.06] dark:bg-emerald-400/[0.08]",
    slot: "border-emerald-500/60 bg-emerald-500/10",
    dot: "bg-emerald-500",
  },
  closed: {
    pill: "bg-zinc-500 text-white",
    count: "text-zinc-600 dark:text-zinc-400",
    lane: "bg-zinc-500/[0.07] dark:bg-zinc-400/[0.08]",
    slot: "border-zinc-500/60 bg-zinc-500/10",
    dot: "bg-zinc-500",
  },
};

const isStatus = (id: UniqueIdentifier): id is TrackStatus => TRACK_STATUS_KEYS.includes(id as TrackStatus);

// Presses on a card's controls are for the controls, never the start of a drag.
const keepFromDrag = {
  onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: React.SyntheticEvent) => event.stopPropagation(),
};

/** Move, note and remove. Actions run once the menu has closed, so focus can go where they need it. */
function CardMenu({ job, onNote, onRemove }: { job: TrackedJob; onNote: () => void; onRemove: () => void }) {
  const router = useRouter();
  const pending = useRef<(() => void) | null>(null);
  return (
    <DropdownMenu>
      <span {...keepFromDrag} className="absolute top-2 right-2 z-10">
        <DropdownMenuTrigger
          aria-label={`Options for ${job.title}`}
          className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color] duration-150 outline-none group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-muted data-[state=open]:opacity-100 pointer-coarse:opacity-100"
        >
          <EllipsisIcon className="size-4" aria-hidden />
        </DropdownMenuTrigger>
      </span>
      <DropdownMenuContent
        align="end"
        className="w-52 rounded-xl p-1.5"
        onCloseAutoFocus={(event) => {
          if (!pending.current) return;
          event.preventDefault();
          const action = pending.current;
          pending.current = null;
          action();
        }}
      >
        <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-muted-foreground">Move to</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={job.status} onValueChange={(status) => setStatus(job.key, status as TrackStatus)}>
          {TRACK_STATUS_KEYS.map((status) => (
            <DropdownMenuRadioItem key={status} value={status} className="gap-2 rounded-lg px-2 py-1.5">
              <span aria-hidden className={cn("size-2 rounded-full", STATUS_STYLE[status].dot)} />
              {TRACK_STATUSES[status]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {CV_MAKER_ENABLED && (
          <DropdownMenuItem className="rounded-lg px-2 py-1.5" onSelect={() => (pending.current = () => void tailorCvFor(job.key, (href) => router.push(href)))}>
            <FileTextIcon aria-hidden />
            Tailor my CV
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="rounded-lg px-2 py-1.5" onSelect={() => (pending.current = onNote)}>
          <StickyNoteIcon aria-hidden />
          {job.note ? "Edit note" : "Add a note"}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" className="rounded-lg px-2 py-1.5" onSelect={() => (pending.current = onRemove)}>
          <Trash2Icon aria-hidden />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** What a card shows: on the board, and following the pointer while it's dragged. */
function CardBody({ job, lifted = false }: { job: TrackedJob; lifted?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job.note);
  const openNote = () => {
    setDraft(job.note);
    setEditing(true);
  };
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
        "group relative rounded-lg border bg-card p-3 transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 has-[a:focus-visible]:border-ring",
        lifted && "rotate-[1.5deg] cursor-grabbing border-foreground/20 shadow-2xl",
      )}
    >
      <h3 className="line-clamp-2 pr-7 text-[0.9375rem] leading-snug font-medium">
        <Link
          href={jobPath({ company: job.company, id: job.id, title: job.title })}
          draggable={false}
          className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
        >
          {job.title}
        </Link>
      </h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CompanyLogo name={job.companyName} domain={job.domain} size="xs" />
        <span className="truncate">
          <span className="font-medium text-foreground/80">{job.companyName}</span>
          {job.location && ` · ${job.location}`}
        </span>
      </p>
      {job.note && !editing && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{job.note}</p>
      )}
      <div className="relative z-10 mt-2.5 flex items-center gap-1.5" {...keepFromDrag}>
        <span className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border px-2 text-xs text-muted-foreground">
          <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {job.appliedAt ? "Applied " : "Saved "}
            <RelativeTime iso={job.appliedAt ?? job.savedAt} />
          </span>
        </span>
        <button
          type="button"
          aria-label={job.note ? `Edit the note for ${job.title}` : `Add a note to ${job.title}`}
          aria-expanded={editing}
          onClick={() => (editing ? save() : openNote())}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md border transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
            job.note ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <StickyNoteIcon className="size-3.5" aria-hidden />
        </button>
      </div>
      {!lifted && <CardMenu job={job} onNote={openNote} onRemove={remove} />}
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
          className="relative z-10 mt-2.5 w-full resize-y rounded-md border bg-background px-2.5 py-2 text-sm select-text outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

/**
 * A card that can be picked up. While it's dragged, its place on the board
 * becomes a dashed slot in the colour of the lane it would land in, and the
 * other cards move aside to make room for it.
 */
function SortableCard({ job, status }: { job: TrackedJob; status: TrackStatus }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: job.key });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      onClickCapture={swallowClickAfterDrag}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="touch-manipulation select-none [-webkit-touch-callout:none] [&_img]:pointer-events-none"
    >
      {isDragging ? (
        <div className={cn("rounded-lg border-2 border-dashed", STATUS_STYLE[status].slot)}>
          {/* Invisible, so the slot is exactly the card's size. */}
          <div aria-hidden className="invisible">
            <CardBody job={job} />
          </div>
        </div>
      ) : (
        <CardBody job={job} />
      )}
    </li>
  );
}

function Lane({
  status,
  keys,
  byKey,
  dragging,
}: {
  status: TrackStatus;
  keys: string[];
  byKey: Map<string, TrackedJob>;
  dragging: boolean;
}) {
  // The whole lane takes drops, including the empty space under a short column.
  const { setNodeRef } = useDroppable({ id: status });
  const style = STATUS_STYLE[status];
  return (
    <section ref={setNodeRef} aria-labelledby={`column-${status}`} className="flex min-h-0 min-w-0 snap-start flex-col">
      <div className={cn("flex min-h-0 flex-col rounded-xl", style.lane)}>
        <h2 id={`column-${status}`} className="flex items-center gap-2 px-3 pt-3 pb-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.6875rem] font-bold tracking-wide uppercase",
              style.pill,
            )}
          >
            <CircleIcon className="size-3" strokeWidth={3} aria-hidden />
            {TRACK_STATUSES[status]}
          </span>
          <span className={cn("text-sm font-semibold tabular-nums", style.count)}>{keys.filter((key) => byKey.has(key)).length}</span>
        </h2>
        <div className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-2 pb-2 [scrollbar-width:thin]">
          <SortableContext items={keys} strategy={verticalListSortingStrategy}>
            <ul className="grid grid-cols-1 gap-2">
              {keys.map((key) => {
                const job = byKey.get(key);
                return job ? <SortableCard key={key} job={job} status={status} /> : null;
              })}
            </ul>
          </SortableContext>
          {keys.length === 0 && (
            <p className="px-1.5 pt-0.5 pb-1.5 text-xs text-muted-foreground">{dragging ? "Drop it here" : "Drag a job here"}</p>
          )}
        </div>
        {status === "saved" && (
          <Link
            href="/jobs"
            className={cn(
              "mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium outline-none transition-colors duration-150 hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50",
              style.count,
            )}
          >
            <PlusIcon className="size-4" aria-hidden />
            Find more jobs
          </Link>
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

type Columns = Record<TrackStatus, string[]>;

/**
 * The saved jobs board: one lane per status, at least 300px wide and 700px
 * tall (on phones, as tall as fits above the tab bar). Each lane is as tall
 * as its cards and scrolls on its own past that. Cards are dragged to any
 * place in any lane and stay where they're dropped; their menu moves them
 * from the keyboard. When the lanes don't all fit, the board scrolls sideways
 * within the page's width.
 */
export function TrackerView() {
  const jobs = useTrackedJobs();
  const byKey = useMemo(() => new Map(jobs.map((job) => [job.key, job])), [jobs]);
  const settled = useMemo(
    () =>
      Object.fromEntries(
        TRACK_STATUS_KEYS.map((status) => [
          status,
          jobs
            .filter((job) => job.status === status)
            .sort((a, b) => boardOrder(a) - boardOrder(b))
            .map((job) => job.key),
        ]),
      ) as Columns,
    [jobs],
  );
  // While a card is dragged, the board shows where everything would be if it were dropped now.
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const columns = dragColumns ?? settled;
  const columnsRef = useRef(columns);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const justChangedLane = useRef(false);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press first, so a swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  // After a card changes lane, give the layout a frame to settle before trusting collisions again.
  useEffect(() => {
    const frame = requestAnimationFrame(() => (justChangedLane.current = false));
    return () => cancelAnimationFrame(frame);
  }, [dragColumns]);

  // Over a lane: the nearest card in it, so the slot follows the pointer; over nothing: wherever it last was.
  const collisions: CollisionDetection = useCallback((args) => {
    const inside = pointerWithin(args);
    let overId = getFirstCollision(inside.length > 0 ? inside : rectIntersection(args), "id");
    if (overId != null) {
      if (isStatus(overId)) {
        const keys = columnsRef.current[overId];
        if (keys.length > 0) {
          const nearest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) => keys.includes(String(container.id))),
          });
          overId = nearest[0]?.id ?? overId;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }
    if (justChangedLane.current) lastOverId.current = args.active.id;
    return lastOverId.current ? [{ id: lastOverId.current }] : [];
  }, []);

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

  const laneOf = (id: UniqueIdentifier, cols: Columns = columns): TrackStatus | undefined =>
    isStatus(id) ? id : TRACK_STATUS_KEYS.find((status) => cols[status].includes(String(id)));
  const active = activeKey ? byKey.get(activeKey) : undefined;
  const title = (id: UniqueIdentifier) => byKey.get(String(id))?.title ?? "the job";
  const laneName = (id: UniqueIdentifier) => {
    const lane = laneOf(id);
    return lane ? TRACK_STATUSES[lane] : "a column";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${title(active.id)} is in ${laneName(over.id)}.` : `${title(active.id)} is not over a column.`),
    onDragEnd: ({ active, over }) => (over ? `${title(active.id)} dropped in ${laneName(over.id)}.` : `${title(active.id)} was put back.`),
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  };

  const finish = () => {
    lastDragEnd = Date.now();
    setActiveKey(null);
    setDragColumns(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisions}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements }}
      onDragStart={({ active }) => {
        setActiveKey(String(active.id));
        setDragColumns(settled);
      }}
      onDragOver={({ active, over }) => {
        if (!over) return;
        const from = laneOf(active.id);
        const to = laneOf(over.id);
        if (!from || !to || from === to) return;
        justChangedLane.current = true;
        setDragColumns((current) => {
          const cols = current ?? settled;
          const target = cols[to];
          let index = target.length;
          if (!isStatus(over.id)) {
            const overIndex = target.indexOf(String(over.id));
            const dragged = active.rect.current.translated;
            const below = dragged ? dragged.top > over.rect.top + over.rect.height / 2 : false;
            if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
          }
          return {
            ...cols,
            [from]: cols[from].filter((key) => key !== active.id),
            [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)],
          };
        });
      }}
      onDragCancel={finish}
      onDragEnd={({ active, over }) => {
        const cols = dragColumns;
        finish();
        const key = String(active.id);
        const job = byKey.get(key);
        if (!cols || !over || !job) return;
        const lane = laneOf(key, cols);
        if (!lane) return;
        let list = cols[lane];
        if (!isStatus(over.id) && laneOf(over.id, cols) === lane) {
          const from = list.indexOf(key);
          const to = list.indexOf(String(over.id));
          if (from !== to && to >= 0) list = arrayMove(list, from, to);
        }
        const index = list.indexOf(key);
        if (lane === job.status && settled[lane].indexOf(key) === index) return;
        moveJob(key, lane, orderBetween(byKey.get(list[index - 1]), byKey.get(list[index + 1])));
      }}
    >
      {/* Full-bleed on phones, so a swipe can start at the screen's edge; within the page's width from sm up. */}
      <div
        role="region"
        aria-label="Saved jobs by status"
        tabIndex={0}
        className="-mx-4 grid h-[max(24rem,calc(100dvh-24.5rem))] auto-cols-[minmax(18.75rem,1fr)] grid-flow-col grid-rows-[minmax(0,1fr)] snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:mx-0 sm:scroll-px-0 sm:px-0 md:h-[43.75rem] lg:snap-none [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
      >
        {TRACK_STATUS_KEYS.map((status) => (
          <Lane key={status} status={status} keys={columns[status]} byKey={byKey} dragging={active !== undefined} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
        {active ? <CardBody job={active} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

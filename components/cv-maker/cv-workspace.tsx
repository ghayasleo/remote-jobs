"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CloudOffIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  LightbulbIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProfile } from "@/lib/auth/client";
import { confirmAction } from "@/lib/confirm";
import { compileLatex, engineStatus, onEngineStatus, type EngineStatus } from "@/lib/cv-maker/compile";
import { cvToLatex } from "@/lib/cv-maker/latex";
import { tailorCvFor } from "@/lib/cv-maker/client";
import { starterCv, type CvData, type CvRecord, type CvSummary } from "@/lib/cv-maker/model";
import { GUIDANCE, cvSuggestions, type Suggestion } from "@/lib/cv-maker/suggestions";
import { jobPath } from "@/lib/jobs";
import { cn } from "@/lib/utils";
import { SuggestionsContext, fieldId } from "./fields";
import { CvPreview } from "./preview";
import { AddSection, BasicsEditor, DesignEditor, RemoteEditor, SectionEditor, type Change } from "./sections";

type SaveState = "idle" | "saving" | "saved" | "error";

const fileName = (cv: CvData, extension: string) =>
  `${(cv.basics.name || "CV").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "CV"}-CV.${extension}`;

function download(name: string, bytes: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the LaTeX as a new Overleaf project, using Overleaf's documented "open a snippet" form. */
function openInOverleaf(tex: string, projectName: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://www.overleaf.com/docs";
  form.target = "_blank";
  for (const [name, value] of Object.entries({ encoded_snip: encodeURIComponent(tex), snip_name: projectName, engine: "pdflatex" })) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
  form.remove();
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
      {state === "saving" && <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden />}
      {state === "saved" && <CheckIcon className="size-3.5" aria-hidden />}
      {state === "error" && <CloudOffIcon className="size-3.5" aria-hidden />}
      {state === "saving" ? "Saving" : state === "saved" ? "Saved" : "Couldn't save; retrying"}
    </p>
  );
}

function SuggestionsPanel({ suggestions }: { suggestions: Suggestion[] }) {
  const [open, setOpen] = useState(false);
  const fixes = suggestions.filter((suggestion) => suggestion.level === "fix");
  const tips = suggestions.filter((suggestion) => suggestion.level === "tip");
  const jump = (target: string) => {
    const element = document.getElementById(fieldId(target)) ?? (target === "sections" ? document.getElementById("cv-sections") : null);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
  };
  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bold tracking-tight">Suggestions</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {suggestions.length === 0
              ? "Nothing to fix. Read the do's and don'ts before you send it."
              : [fixes.length > 0 && `${fixes.length} to fix`, tips.length > 0 && `${tips.length} ${tips.length === 1 ? "tip" : "tips"}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="grid gap-5 border-t p-4 sm:px-5">
          {suggestions.length > 0 && (
            <ul className="grid gap-1">
              {[...fixes, ...tips].map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => jump(suggestion.target)}
                    className="flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {suggestion.level === "fix" ? (
                      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Fix" />
                    ) : (
                      <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Tip" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium">{suggestion.title}</span>
                      <span className="block text-xs text-muted-foreground">{suggestion.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {(["do", "dont"] as const).map((kind) => (
              <div key={kind}>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {kind === "do" ? <ThumbsUpIcon className="size-4" aria-hidden /> : <ThumbsDownIcon className="size-4" aria-hidden />}
                  {kind === "do" ? "Do" : "Don't"}
                </p>
                <ul className="mt-1.5 grid gap-1.5 text-sm text-muted-foreground">
                  {GUIDANCE[kind].map((line) => (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** The copies tailored to saved jobs, on the main CV's page. */
function TailoredCopies({ copies, onDelete }: { copies: CvSummary[]; onDelete: (copy: CvSummary) => void }) {
  if (copies.length === 0) return null;
  return (
    <section className="rounded-2xl border bg-card p-4 sm:px-5">
      <h2 className="font-bold tracking-tight">Tailored copies</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">One per saved job. Editing a copy never changes this CV.</p>
      <ul className="mt-3 grid gap-1">
        {copies.map((copy) => (
          <li key={copy.id} className="flex items-center gap-2 rounded-lg transition-colors duration-150 hover:bg-muted">
            <Link
              href={`/dashboard/cv?id=${copy.id}`}
              className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="block truncate font-medium">{copy.title}</span>
              <span className="block text-xs text-muted-foreground">Edited {shortDate(copy.updatedAt)}</span>
            </Link>
            <button
              type="button"
              onClick={() => onDelete(copy)}
              aria-label={`Delete the copy for ${copy.title}`}
              className="mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:bg-background hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Trash2Icon className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExportMenu({ cv, pdf }: { cv: CvData; pdf: Uint8Array | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button className="h-10 rounded-full px-4" disabled={!pdf} onClick={() => pdf && download(fileName(cv, "pdf"), pdf.slice(), "application/pdf")}>
        <DownloadIcon aria-hidden />
        Download PDF
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
          <FileCodeIcon className="size-4" aria-hidden />
          LaTeX
          <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-1.5">
          <DropdownMenuItem className="rounded-lg px-2 py-2" onSelect={() => download(fileName(cv, "tex"), cvToLatex(cv), "application/x-tex")}>
            <DownloadIcon aria-hidden />
            Download the .tex file
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg px-2 py-2" onSelect={() => openInOverleaf(cvToLatex(cv), `${cv.basics.name.trim() || "My"} CV`)}>
            <ExternalLinkIcon aria-hidden />
            <span>
              Open in Overleaf
              <span className="block text-xs text-muted-foreground">Sends this CV&apos;s LaTeX to Overleaf as a new project</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * The CV maker: the editor on the left, the PDF it makes on the right. The
 * CV is LaTeX underneath, typeset in the browser; people only ever see the
 * form, the suggestions and the result.
 */
export function CvWorkspace({ recordId }: { recordId?: string }) {
  const profile = useProfile();
  const router = useRouter();
  const [record, setRecord] = useState<CvRecord | null>(null);
  const [copies, setCopies] = useState<CvSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [cv, setCv] = useState<CvData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [pdf, setPdf] = useState<Uint8Array | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [engine, setEngine] = useState<EngineStatus>(engineStatus());
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const dirty = useRef(false);

  useEffect(() => onEngineStatus(setEngine), []);

  // Load: a tailored CV by id, or the main CV (a fresh one if none is saved yet).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(recordId ? `/api/cv/${recordId}` : "/api/cv");
      if (!response.ok) throw new Error(response.status === 404 ? "This CV doesn't exist, or it isn't yours." : "Couldn't load your CV.");
      if (recordId) {
        const found = (await response.json()) as CvRecord;
        if (!cancelled) {
          setRecord(found);
          setCv(found.data);
        }
      } else {
        const { main, tailored } = (await response.json()) as { main: CvRecord | null; tailored: CvSummary[] };
        if (!cancelled) {
          setRecord(main);
          setCopies(tailored);
          setCv(main?.data ?? starterCv(profile?.name ?? ""));
        }
      }
    })().catch((error: unknown) => !cancelled && setLoadError(error instanceof Error ? error.message : "Couldn't load your CV."));
    return () => {
      cancelled = true;
    };
    // The profile only fills in a brand-new CV's name; changing it later mustn't reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const change: Change = useCallback((edit) => {
    dirty.current = true;
    setCv((previous) => {
      if (!previous) return previous;
      const next = structuredClone(previous);
      edit(next);
      return next;
    });
  }, []);

  // Autosave, a moment after the last change.
  useEffect(() => {
    if (!cv || !dirty.current) return;
    const timer = setTimeout(async () => {
      setSave("saving");
      const response = await fetch(recordId ? `/api/cv/${recordId}` : "/api/cv", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: cv }),
        keepalive: true,
      }).catch(() => null);
      if (response?.ok) {
        dirty.current = false;
        setSave("saved");
      } else {
        setSave("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [cv, recordId]);

  // Re-typeset a moment after the last change.
  const tex = useMemo(() => (cv ? cvToLatex(cv) : null), [cv]);
  useEffect(() => {
    if (!tex) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCompiling(true);
      const result = await compileLatex(tex).catch((error: unknown) => ({ ok: false as const, error: String(error), log: "" }));
      if (cancelled || !result) return;
      setCompiling(false);
      if (result.ok) {
        setPdf(result.pdf);
        setCompileError(null);
      } else {
        setCompileError(result.error);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tex]);

  const suggestions = useMemo(() => (cv ? cvSuggestions(cv, { pages }) : []), [cv, pages]);
  const byTarget = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const suggestion of suggestions) map.set(suggestion.target, [...(map.get(suggestion.target) ?? []), suggestion]);
    return map;
  }, [suggestions]);

  const deleteCopy = async (copy: Pick<CvSummary, "id" | "title">) => {
    const ok = await confirmAction({
      title: "Delete this tailored copy?",
      description: `The CV for ${copy.title} goes, along with any changes you made to it. Your main CV stays as it is.`,
      confirmLabel: "Delete copy",
      destructive: true,
    });
    if (!ok) return false;
    const response = await fetch(`/api/cv/${copy.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      toast.error("Couldn't delete that copy just now. Please try again.");
      return false;
    }
    setCopies((list) => list.filter((item) => item.id !== copy.id));
    return true;
  };

  // A tailored copy, made again from the main CV as it is now.
  const remake = async () => {
    if (!record?.jobKey) return;
    const ok = await confirmAction({
      title: "Make this copy again?",
      description: "It starts over from your main CV as it is now, tailored to this job. Changes you made to this copy are lost.",
      confirmLabel: "Make it again",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    dirty.current = false;
    const response = await fetch(`/api/cv/${record.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      toast.error("Couldn't make the copy again just now. Please try again.");
      return;
    }
    await tailorCvFor(record.jobKey, (href) => router.replace(href));
    setBusy(false);
  };

  if (loadError) {
    return <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">{loadError}</p>;
  }
  if (!cv) return <div className="h-96" aria-busy="true" />;

  const tailored = record?.kind === "tailored";
  const [company, ...rest] = (record?.jobKey ?? "").split("/");
  const jobHref = tailored && company && rest.length > 0 ? jobPath({ company, id: rest.join("/"), title: record?.title ?? "" }) : null;

  return (
    <SuggestionsContext.Provider value={byTarget}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {tailored && (
            <Link
              href="/dashboard/cv"
              className="mb-1 inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              Main CV
            </Link>
          )}
          <h1 className="text-[clamp(1.75rem,3.5vw,2.25rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
            {tailored ? record?.title : "Your CV"}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>{tailored ? "A copy of your main CV for this role. Change it freely; your main CV stays as it is." : "Your complete CV. Tailor a copy to each job from Saved jobs."}</span>
            <SaveStatus state={save} />
          </div>
        </div>
        <ExportMenu cv={cv} pdf={pdf} />
      </header>

      {tailored && record && (
        <section className="mb-6 rounded-2xl border bg-card p-4 sm:p-5">
          <p className="font-semibold">Tailored for this role</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your bullets and skills that match the posting were moved up.
            {record.gaps.length > 0 ? " The posting also mentions these, which your CV doesn't show. Add them only where they're true:" : " Your CV already mentions every skill the posting names."}
          </p>
          {record.gaps.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {record.gaps.map((gap) => (
                <li key={gap} className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  {gap}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {jobHref && (
              <Link href={jobHref} className="font-medium text-primary underline-offset-4 hover:underline">
                Read the posting
              </Link>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={remake}
              className="inline-flex items-center gap-1.5 rounded-md font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {busy ? <LoaderCircleIcon className="size-4 animate-spin" aria-hidden /> : <RefreshCwIcon className="size-4" aria-hidden />}
              Make it again from my main CV
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (await deleteCopy(record)) router.push("/dashboard/cv");
              }}
              className="inline-flex items-center gap-1.5 rounded-md font-medium text-muted-foreground outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            >
              <Trash2Icon className="size-4" aria-hidden />
              Delete this copy
            </button>
          </div>
        </section>
      )}

      {/* Phones: one at a time. */}
      <div className="mb-4 flex rounded-full border p-1 lg:hidden" role="tablist" aria-label="Show">
        {(["edit", "preview"] as const).map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={cn(
              "h-9 flex-1 rounded-full text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
              mobileView === view ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
            )}
          >
            {view === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className={cn("grid min-w-0 content-start gap-4", mobileView === "preview" && "max-lg:hidden")}>
          {!tailored && <TailoredCopies copies={copies} onDelete={deleteCopy} />}
          <SuggestionsPanel suggestions={suggestions} />
          <BasicsEditor cv={cv} change={change} />
          <RemoteEditor cv={cv} change={change} />
          <div className="grid gap-4" id="cv-sections">
            {cv.sections.map((section, index) => (
              <SectionEditor key={section.id} section={section} index={index} count={cv.sections.length} change={change} />
            ))}
            <AddSection change={change} />
          </div>
          <DesignEditor cv={cv} change={change} />
        </div>
        <div className={cn("min-w-0", mobileView === "edit" && "max-lg:hidden")}>
          <div className="lg:sticky lg:top-20">
            <CvPreview pdf={pdf} compiling={compiling} error={compileError} engine={engine} onPages={setPages} />
          </div>
        </div>
      </div>
    </SuggestionsContext.Provider>
  );
}

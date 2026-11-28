"use client";

import { useEffect, useRef, useState } from "react";
import { FileSearchIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import type { EngineStatus } from "@/lib/cv-maker/compile";
import { cn } from "@/lib/utils";

const PDF_WORKER = "/vendor/pdf.worker.min.mjs?v=6.5.438";

type PdfDocument = Awaited<ReturnType<typeof import("pdfjs-dist").getDocument>["promise"]>;

async function openPdf(bytes: Uint8Array): Promise<PdfDocument> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  // pdf.js takes ownership of the buffer it's given, so it gets a copy.
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

/** The text a hiring system gets from this PDF, line by line, in reading order. */
export async function readPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await openPdf(bytes);
  const pages: string[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      if (typeof item.str !== "string") continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line.replace(/\s+/g, " ").trim());
        line = "";
      }
    }
    if (line.trim()) lines.push(line.replace(/\s+/g, " ").trim());
    pages.push(lines.filter(Boolean).join("\n"));
  }
  return pages.join("\n\n— page break —\n\n");
}

/** Draws every page of the PDF to fit the column's width, sharp on high-density screens. */
function PdfPages({ pdf, onPages }: { pdf: Uint8Array; onPages: (count: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = box.current;
    if (!element || width === 0) return;
    let cancelled = false;
    (async () => {
      const doc = await openPdf(pdf);
      if (cancelled) return;
      onPages(doc.numPages);
      const canvases: HTMLCanvasElement[] = [];
      for (let number = 1; number <= doc.numPages; number++) {
        const page = await doc.getPage(number);
        const base = page.getViewport({ scale: 1 });
        const ratio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.className = "block rounded-md bg-white shadow-sm ring-1 ring-black/10";
        canvas.setAttribute("aria-label", `Page ${number} of ${doc.numPages}`);
        await page.render({ canvas, viewport }).promise;
        if (cancelled) return;
        canvases.push(canvas);
      }
      // Swap in all pages at once, so the preview never flickers half-drawn.
      element.replaceChildren(...canvases);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pdf, width, onPages]);

  return <div ref={box} className="grid gap-3" />;
}

export function CvPreview({
  pdf,
  compiling,
  error,
  engine,
  onPages,
}: {
  pdf: Uint8Array | null;
  compiling: boolean;
  error: string | null;
  engine: EngineStatus;
  onPages: (count: number) => void;
}) {
  const [reading, setReading] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (!showText || !pdf) return;
    let cancelled = false;
    readPdfText(pdf).then((text) => !cancelled && setReading(text)).catch(() => !cancelled && setReading(null));
    return () => {
      cancelled = true;
    };
  }, [showText, pdf]);

  return (
    <div className="grid gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          {engine.stage === "loading" ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
              {engine.detail ?? "Preparing LaTeX"}
            </>
          ) : compiling ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
              Updating the PDF
            </>
          ) : error ? (
            <>
              <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
              The last change couldn&apos;t be typeset
            </>
          ) : pdf ? (
            "Live preview"
          ) : (
            "Preview"
          )}
        </p>
        {pdf && (
          <button
            type="button"
            aria-pressed={showText}
            onClick={() => setShowText((value) => !value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
              showText ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <FileSearchIcon className="size-3.5" aria-hidden />
            How a hiring system reads it
          </button>
        )}
      </div>

      {error && (
        <details className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <summary className="cursor-pointer font-medium">The preview shows your last version that worked. Details</summary>
          <pre className="mt-2 max-h-48 overflow-auto text-xs whitespace-pre-wrap text-muted-foreground">{error}</pre>
        </details>
      )}

      {showText && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            The text inside your PDF, in the order a parser reads it. If it&apos;s all here and in a sensible order, hiring systems
            can read your CV.
          </p>
          <pre className="mt-3 max-h-96 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">{reading ?? "Reading…"}</pre>
        </div>
      )}

      <div className={cn("transition-opacity duration-200", compiling && "opacity-70")}>
        {pdf ? (
          <PdfPages pdf={pdf} onPages={onPages} />
        ) : (
          <div className="grid aspect-[1/1.414] place-items-center rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {engine.stage === "failed" ? `LaTeX couldn't start: ${engine.detail ?? "unknown error"}` : "Your CV appears here as you write."}
          </div>
        )}
      </div>
    </div>
  );
}

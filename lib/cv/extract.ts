"use client";

import type { CvDocument } from "./analyze";

// Reads a CV file in the browser. Nothing is uploaded: the file's bytes go to
// pdf.js (for PDFs) or a tiny unzip (for Word files) running on this device.

export const MAX_CV_BYTES = 10 * 1024 * 1024;
const PDF_WORKER = "/vendor/pdf.worker.min.mjs?v=6.5.438";

type TextItem = { str: string; transform: number[]; width: number };

async function readPdf(file: File): Promise<CvDocument> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  let rows = 0;
  let splitRows = 0;
  let leftStarts = 0;
  let rightStarts = 0;
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const width = page.getViewport({ scale: 1 }).width;
    const content = await page.getTextContent();
    // Group the text pieces into rows by their height on the page.
    const byRow = new Map<number, TextItem[]>();
    for (const item of content.items as TextItem[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      byRow.set(y, [...(byRow.get(y) ?? []), item]);
    }
    const sorted = [...byRow.entries()].sort((a, b) => b[0] - a[0]);
    const margin = Math.min(...sorted.map(([, items]) => Math.min(...items.map((item) => item.transform[4]))));
    const lines: string[] = [];
    for (const [, items] of sorted) {
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      rows++;
      const first = items[0].transform[4];
      const last = items.at(-1)!;
      const centered = Math.abs(first - margin - (width - (last.transform[4] + last.width) - margin)) < width * 0.05;
      if (first - margin < width * 0.03) leftStarts++;
      else if (first > width * 0.25 && !centered) rightStarts++;
      // A wide gap between text on the left and text further right: two columns, or a table.
      for (let i = 1; i < items.length; i++) {
        const end = items[i - 1].transform[4] + items[i - 1].width;
        const start = items[i].transform[4];
        if (start - end > width * 0.08 && end < width * 0.6 && start > width * 0.25) {
          splitRows++;
          break;
        }
      }
      lines.push(items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim());
    }
    pages.push(lines.join("\n"));
  }
  return { text: pages.join("\n\n"), kind: "pdf", pages: pdf.numPages, layout: { rows, splitRows, leftStarts, rightStarts } };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

async function readDocx(file: File): Promise<CvDocument> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (entry) => entry.name === "word/document.xml" });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("not a docx");
  const text = strFromU8(xml)
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>|<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITIES[name])
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, kind: "docx", pages: null, layout: null };
}

/** Reads a PDF, Word (.docx) or plain-text CV. Throws a message fit to show when it can't. */
export async function readCvFile(file: File): Promise<CvDocument> {
  if (file.size > MAX_CV_BYTES) throw new Error("That file is over 10 MB. Try exporting a smaller PDF.");
  const name = file.name.toLowerCase();
  try {
    if (file.type === "application/pdf" || name.endsWith(".pdf")) return await readPdf(file);
    if (name.endsWith(".docx")) return await readDocx(file);
    if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
      return { text: await file.text(), kind: "text", pages: null, layout: null };
    }
  } catch {
    throw new Error("We couldn't read that file. If it's password-protected or damaged, try exporting it again.");
  }
  if (name.endsWith(".doc")) throw new Error("Old .doc files can't be read here. Save it as .docx or PDF and try again.");
  throw new Error("Choose a PDF, a Word file (.docx) or a text file.");
}

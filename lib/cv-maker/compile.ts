"use client";

// Compiles the CV's LaTeX to a PDF in the browser, with TeX Live running in
// WebAssembly (Siglum, MIT licensed). The CV never leaves the device: the
// engine downloads its runtime and the TeX packages a document needs, once,
// and keeps them cached for next time.

import type { SiglumCompiler } from "@siglum/engine";

const WORKER_URL = "/vendor/siglum-worker.js?v=0.2.2";

export type EngineStatus = { stage: "idle" | "loading" | "ready" | "failed"; detail?: string };

let compilerPromise: Promise<SiglumCompiler> | null = null;
const statusListeners = new Set<(status: EngineStatus) => void>();
let status: EngineStatus = { stage: "idle" };
const setStatus = (next: EngineStatus) => {
  status = next;
  statusListeners.forEach((listener) => listener(next));
};

export const engineStatus = () => status;
export function onEngineStatus(listener: (status: EngineStatus) => void) {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function loadCompiler(): Promise<SiglumCompiler> {
  compilerPromise ??= (async () => {
    setStatus({ stage: "loading", detail: "Downloading the LaTeX engine (once; it stays cached)" });
    const { SiglumCompiler, resolveRuntime } = await import("@siglum/engine");
    const runtime = await resolveRuntime();
    const compiler = new SiglumCompiler({
      ...runtime,
      workerUrl: WORKER_URL,
      maxRetries: 6,
      onProgress: (stage: string) => {
        if (status.stage === "loading") setStatus({ stage: "loading", detail: `Preparing LaTeX: ${stage}` });
      },
    });
    await compiler.init();
    setStatus({ stage: "ready" });
    return compiler;
  })().catch((error: unknown) => {
    compilerPromise = null;
    setStatus({ stage: "failed", detail: error instanceof Error ? error.message : String(error) });
    throw error;
  });
  return compilerPromise;
}

export type CompileResult = { ok: true; pdf: Uint8Array } | { ok: false; error: string; log: string };

// One compile at a time. While one runs, only the newest request waits; older ones are dropped.
let running: Promise<unknown> = Promise.resolve();
let latest = 0;

export async function compileLatex(source: string): Promise<CompileResult | null> {
  const ticket = ++latest;
  await running.catch(() => {});
  if (ticket !== latest) return null;
  const job = (async (): Promise<CompileResult> => {
    const compiler = await loadCompiler();
    const result = await compiler.compile(source, { engine: "pdflatex" });
    if (result.success) return { ok: true, pdf: new Uint8Array(result.pdf) };
    return { ok: false, error: result.error ?? "LaTeX couldn't build this CV.", log: result.log ?? "" };
  })();
  running = job;
  return job;
}

// Copies browser workers from node_modules into public/vendor/, where pages
// load them from: pdf.js's (reading PDFs) and Siglum's (the CV maker's LaTeX
// compiler). Runs before dev and build; the copies aren't committed (see
// .gitignore).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const vendor = new URL("../public/vendor/", import.meta.url);
mkdirSync(vendor, { recursive: true });

copyFileSync(require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"), new URL("pdf.worker.min.mjs", vendor));

// The package doesn't export its worker's path to Node, so find it next to the entry point.
const siglum = dirname(require.resolve("@siglum/engine"));
copyFileSync(join(siglum, "worker.js"), new URL("siglum-worker.js", vendor));

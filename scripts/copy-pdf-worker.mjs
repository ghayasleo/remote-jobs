// Copies pdf.js's worker into public/, where the CV check loads it from. Runs
// before dev and build; the copy isn't committed (see .gitignore).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const source = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
mkdirSync(new URL("../public/vendor/", import.meta.url), { recursive: true });
copyFileSync(source, new URL("../public/vendor/pdf.worker.min.mjs", import.meta.url));

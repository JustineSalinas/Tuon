// Keeps public/pdf.worker.min.mjs in sync with the installed pdfjs-dist.
// The worker is served from our own origin rather than a CDN so PDF import
// still works on a flaky connection and without a third-party request.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const src = resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const dest = resolve("public/pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn("[copy-pdf-worker] pdfjs-dist not installed yet; skipping.");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-pdf-worker] public/pdf.worker.min.mjs updated");

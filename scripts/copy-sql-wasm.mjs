// Keeps public/sql-wasm.wasm in sync with the installed sql.js. The JS glue
// is bundled normally through the npm package; only the wasm binary has to
// be a static asset sql.js can `fetch()` at runtime, served from our own
// origin for the same reason copy-pdf-worker.mjs does: Anki import still
// works on a flaky connection and without a third-party request.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const src = resolve("node_modules/sql.js/dist/sql-wasm.wasm");
const dest = resolve("public/sql-wasm.wasm");

if (!existsSync(src)) {
  console.warn("[copy-sql-wasm] sql.js not installed yet; skipping.");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-sql-wasm] public/sql-wasm.wasm updated");

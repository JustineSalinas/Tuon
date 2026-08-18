/**
 * Writes a downloaded Firebase service-account JSON into .env.local as a
 * single-line, correctly-quoted value.
 *
 * The downloaded file is pretty-printed across ~12 lines, and .env files are
 * line-based — pasting it by hand is the single most common way this variable
 * ends up broken. This never prints the key.
 *
 *   node scripts/set-service-account.mjs <path-to-downloaded.json>
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Looks for a freshly downloaded service-account key so nobody has to type a
 * path. Firebase names them `<project>-firebase-adminsdk-<hash>.json`.
 */
function discover() {
  const dirs = [
    process.cwd(),
    join(homedir(), "Downloads"),
    join(homedir(), "Desktop"),
    join(homedir(), "Documents"),
  ];
  const hits = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    let names = [];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/\.json$/i.test(name)) continue;
      if (!/adminsdk|service.?account/i.test(name)) continue;
      const full = join(dir, name);
      try {
        hits.push({ full, mtime: statSync(full).mtimeMs });
      } catch {
        /* unreadable, skip */
      }
    }
  }
  hits.sort((a, b) => b.mtime - a.mtime);
  return hits[0]?.full ?? null;
}

const explicit = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const discovered = explicit ? null : discover();
const source = explicit ?? discovered;

if (!source) {
  console.error("Could not find a service-account key.");
  console.error("");
  console.error("  1. Open https://console.firebase.google.com/project/tuon-1673l9ve/settings/serviceaccounts/adminsdk");
  console.error("  2. Click \"Generate new private key\" — it downloads a .json file");
  console.error("  3. Run this again (it checks Downloads, Desktop, Documents, and this folder)");
  console.error("");
  console.error("Or pass the path directly:");
  console.error("  node scripts/set-service-account.mjs \"C:/Users/you/Downloads/that-file.json\"");
  process.exit(1);
}

if (discovered) console.log(`Found ${discovered}`);

const path = resolve(source);
if (!existsSync(path)) {
  console.error(`No file at ${path}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(path, "utf8"));
} catch (error) {
  console.error(`That file is not valid JSON: ${error.message}`);
  process.exit(1);
}

const required = ["type", "project_id", "client_email", "private_key"];
const missing = required.filter((key) => !parsed[key]);
if (missing.length) {
  console.error(`Not a service-account key — missing: ${missing.join(", ")}`);
  process.exit(1);
}
if (parsed.type !== "service_account") {
  console.error(`Expected type "service_account", got "${parsed.type}"`);
  process.exit(1);
}

// One line, single-quoted. JSON.stringify escapes the PEM's newlines as \n,
// which is exactly what the admin client expects to un-escape.
const value = `FIREBASE_SERVICE_ACCOUNT_KEY='${JSON.stringify(parsed)}'`;

const envPath = resolve(".env.local");
const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const next = /^FIREBASE_SERVICE_ACCOUNT_KEY=.*$/m.test(env)
  ? env.replace(/^FIREBASE_SERVICE_ACCOUNT_KEY=.*$/m, value)
  : `${env.trimEnd()}\n${value}\n`;

writeFileSync(envPath, next, "utf8");

console.log("Wrote FIREBASE_SERVICE_ACCOUNT_KEY to .env.local");
console.log(`  project_id:   ${parsed.project_id}`);
console.log(`  client_email: ${parsed.client_email.replace(/^[^@]+/, "***")}`);
console.log(`  private_key:  present (${parsed.private_key.length} chars, not shown)`);

if (process.argv.includes("--delete-source")) {
  unlinkSync(path);
  console.log(`  deleted ${source}`);
} else {
  console.log(`\nDelete ${source} when you're done — it is a live credential.`);
}

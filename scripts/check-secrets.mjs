#!/usr/bin/env node
/**
 * Blocks a commit that contains a credential.
 *
 * This exists because GitHub's secret scanning and push protection are free on
 * *public* repos only — making this repo private turned them off. This is the
 * replacement, and in one way it is better: it refuses the commit rather than
 * the push, so the secret never enters history at all. A secret that reaches a
 * commit is compromised even if the push is blocked, because rewriting history
 * is something people forget to do.
 *
 *   npm run check:secrets           # staged changes (what the hook runs)
 *   npm run check:secrets -- --all  # every tracked file
 *
 * Patterns are deliberately narrow. A checker that cries wolf gets bypassed
 * with --no-verify within a week, at which point it protects nothing.
 */
import { execFileSync } from "node:child_process";

const ALL = process.argv.includes("--all");

const PATTERNS = [
  { name: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "PayMongo secret key", re: /sk_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: "PayMongo webhook secret", re: /whsk_[A-Za-z0-9]{16,}/ },
  { name: "OpenAI API key", re: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "AWS access key id", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  {
    name: "Service-account JSON",
    // The pair together, not either alone: "client_email" appears innocently
    // in this repo's own type definitions and comments.
    re: /"private_key"\s*:\s*"[^"]{40,}/,
  },
  {
    name: "Google API key",
    // NEXT_PUBLIC_ Firebase keys are browser-visible by design and legitimately
    // appear in .env.example as an empty value — only flag one with a value
    // that is NOT on a NEXT_PUBLIC_ line.
    re: /(?<!NEXT_PUBLIC_[A-Z_]{0,40}=)AIza[A-Za-z0-9_-]{35}/,
  },
];

/** Files git will not have as text, or that legitimately hold examples. */
const SKIP = [
  /^public\/pdf\.worker\.min\.mjs$/,
  /^package-lock\.json$/,
  /^scripts\/check-secrets\.mjs$/, // the patterns themselves
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function stagedFiles() {
  return git(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
    .split("\n")
    .filter(Boolean);
}

function trackedFiles() {
  return git(["ls-files"]).split("\n").filter(Boolean);
}

function contentOf(file) {
  try {
    // Read the STAGED blob, not the working tree: they can differ, and the
    // staged version is the one about to become a commit.
    return ALL ? git(["show", `HEAD:${file}`]) : git(["show", `:${file}`]);
  } catch {
    return null;
  }
}

const files = (ALL ? trackedFiles() : stagedFiles()).filter(
  (file) => !SKIP.some((re) => re.test(file)),
);

const findings = [];

for (const file of files) {
  const content = contentOf(file);
  if (content === null) continue;

  content.split("\n").forEach((line, i) => {
    for (const { name, re } of PATTERNS) {
      if (re.test(line)) {
        findings.push({ file, line: i + 1, name });
        break;
      }
    }
  });
}

// An untracked .env file is fine — that is what .gitignore is for. A STAGED
// one is the mistake this catches, and it is the most common one.
const stagedEnv = (ALL ? [] : stagedFiles()).filter(
  (file) => /(^|\/)\.env($|\.)/.test(file) && file !== ".env.example",
);
for (const file of stagedEnv) {
  findings.push({ file, line: 0, name: "environment file staged for commit" });
}

if (findings.length === 0) {
  console.log(`No credentials found in ${files.length} file(s).`);
  process.exit(0);
}

console.error("\nBLOCKED: something that looks like a credential is staged.\n");
for (const f of findings) {
  console.error(`  ${f.file}${f.line ? `:${f.line}` : ""}  ${f.name}`);
}
console.error(
  "\nUnstage it, move the value into .env.local, and rotate the credential —" +
    "\nassume anything that got this far is already compromised." +
    "\n\nIf this is a false positive, add the path to SKIP in" +
    "\nscripts/check-secrets.mjs rather than reaching for --no-verify.\n",
);
process.exit(1);

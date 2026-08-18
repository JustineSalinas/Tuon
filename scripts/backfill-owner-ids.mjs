#!/usr/bin/env node
/**
 * One-off migration: stamp `ownerId` on flashcards written before the review
 * queue moved to a collection-group query.
 *
 * Cards without it are invisible to that query, so they silently vanish from
 * review, the calendar, and stats. Run this once after deploying:
 *
 *   npm run migrate:owner-ids           # report only
 *   npm run migrate:owner-ids -- --write
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_KEY from .env.local. Never prints the key.
 */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

function loadServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = env
      .split(/\r?\n/)
      .find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT_KEY="));
    if (!line) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not in .env.local.");
    raw = line.slice("FIREBASE_SERVICE_ACCOUNT_KEY=".length).trim();
    if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith('"') && raw.endsWith('"'))
    ) {
      raw = raw.slice(1, -1);
    }
  }
  const parsed = JSON.parse(raw);
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

const account = loadServiceAccount();
initializeApp({
  credential: cert({
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key,
  }),
});
const db = getFirestore();

console.log(
  `Project ${account.project_id} — ${WRITE ? "WRITING" : "dry run (pass --write to apply)"}\n`,
);

let scanned = 0;
let missing = 0;
let fixed = 0;

const users = await db.collection("users").listDocuments();
for (const userRef of users) {
  const sets = await userRef.collection("studySets").listDocuments();
  for (const setRef of sets) {
    const cards = await setRef.collection("flashcards").get();
    // A batch is capped at 500 writes; sets hold at most ~15 cards, so one
    // batch per set is always safely under.
    const batch = db.batch();
    let pending = 0;

    for (const card of cards.docs) {
      scanned += 1;
      if (card.get("ownerId") === userRef.id) continue;
      missing += 1;
      if (!WRITE) continue;
      batch.update(card.ref, { ownerId: userRef.id });
      pending += 1;
    }

    if (pending > 0) {
      await batch.commit();
      fixed += pending;
    }
  }
}

console.log(`Scanned ${scanned} flashcards.`);
console.log(`${missing} were missing a correct ownerId.`);
if (WRITE) console.log(`${fixed} updated.`);
else if (missing > 0) console.log("\nRe-run with --write to apply.");

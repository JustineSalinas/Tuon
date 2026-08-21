#!/usr/bin/env node
/**
 * What students think of the generated cards.
 *
 * Two signals, deliberately shown side by side because they mean different
 * things and the difference is the whole point:
 *
 *   REPORTED  a student pressed thumbs-down. An explicit "this card is wrong".
 *   LOW EASE  SM-2 has dropped the ease factor because the card keeps being
 *             failed. That is ambiguous — a hard concept looks identical to a
 *             badly written card from the algorithm's side.
 *
 * A card that is BOTH reported and low-ease is almost certainly a bad card.
 * A card that is only low-ease is probably just hard, and should be left
 * alone. Tune the prompt against the first group, not the second.
 *
 *   npm run cards:quality
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_KEY from .env.local. Never prints the key.
 */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/** Below this, SM-2 has been beaten up by repeated failures. */
const AT_RISK_EASE = 2.0;

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

/** Fetch a card's text, or null if it has since been deleted. */
async function cardText(userId, studySetId, flashcardId) {
  const snap = await db
    .collection("users").doc(userId)
    .collection("studySets").doc(studySetId)
    .collection("flashcards").doc(flashcardId)
    .get();
  if (!snap.exists) return null;
  return { front: snap.get("front"), back: snap.get("back") };
}

const reports = await db.collectionGroup("cardReports").get();
const logs = await db.collectionGroup("reviewLogs").get();

// flashcardId -> ease, for cross-referencing.
const easeById = new Map();
for (const d of logs.docs) {
  const ease = d.get("easeFactor");
  if (typeof ease === "number") easeById.set(d.id, ease);
}

console.log(`\n${reports.size} reported card(s), ${logs.size} scheduling record(s).\n`);

if (reports.size === 0) {
  console.log("Nothing reported yet. Come back once students have used it.\n");
} else {
  const rows = [];
  for (const d of reports.docs) {
    // users/{uid}/cardReports/{flashcardId}
    const userId = d.ref.parent.parent?.id;
    const studySetId = d.get("studySetId");
    if (!userId || !studySetId) continue;
    const text = await cardText(userId, studySetId, d.id);
    rows.push({
      id: d.id,
      ease: easeById.get(d.id) ?? null,
      text,
      reportedAt: d.get("reportedAt")?.toDate?.().toISOString().slice(0, 10),
    });
  }

  // Reported AND struggling first — that overlap is the strongest signal.
  rows.sort((a, b) => (a.ease ?? 9) - (b.ease ?? 9));

  for (const r of rows) {
    const verdict =
      r.ease === null
        ? "reported, never reviewed"
        : r.ease < AT_RISK_EASE
          ? `REPORTED + low ease ${r.ease.toFixed(2)} — likely a bad card`
          : `reported, ease ${r.ease.toFixed(2)} — probably just disliked`;
    console.log(`  ${verdict}   (${r.reportedAt ?? "?"})`);
    if (r.text) {
      console.log(`     Q: ${String(r.text.front).slice(0, 100)}`);
      console.log(`     A: ${String(r.text.back).slice(0, 100)}`);
    } else {
      console.log("     (card has since been deleted)");
    }
    console.log();
  }
}

// The other half: struggling but never reported. Mostly genuinely hard.
const struggling = [...easeById.entries()].filter(([, e]) => e < AT_RISK_EASE);
const reportedIds = new Set(reports.docs.map((d) => d.id));
const quietlyHard = struggling.filter(([id]) => !reportedIds.has(id));
console.log(
  `${quietlyHard.length} card(s) are being failed repeatedly but nobody reported them — ` +
    "usually hard concepts rather than bad cards. Leave them alone.\n",
);

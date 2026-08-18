/**
 * Firestore security rules tests, run against the local emulator.
 *
 * Rules are the actual security boundary of this app — not the route guards,
 * which are only convenience redirects. Sharing made them non-trivial, and a
 * mistake in them is silent and total. These prove the boundary rather than
 * asserting it.
 *
 *   npm run test:rules
 */
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

const ALICE = "alice-uid";
const MALLORY = "mallory-uid";

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const env = await initializeTestEnvironment({
  projectId: "tuon-rules-test",
  firestore: {
    rules: readFileSync("firestore.rules", "utf8"),
    host: "127.0.0.1",
    port: 8080,
  },
});

const alice = env.authenticatedContext(ALICE).firestore();
const mallory = env.authenticatedContext(MALLORY).firestore();
const anon = env.unauthenticatedContext().firestore();

/** Seeds documents bypassing rules, the way the Admin SDK would. */
async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

const profile = (uid) => `users/${uid}`;
const note = (uid, id) => `users/${uid}/notes/${id}`;
const set = (uid, id) => `users/${uid}/studySets/${id}`;
const card = (uid, s, id) => `users/${uid}/studySets/${s}/flashcards/${id}`;

const validNote = {
  title: "Le Chatelier",
  content: "Equilibrium shifts to counteract a disturbance.",
  courseTag: "General Chemistry 1",
};
const validSet = {
  title: "Gen Chem 1",
  flashcardCount: 8,
  quizQuestionCount: 5,
  source: "ai",
  isShared: false,
  noteId: "n1",
  courseTag: null,
};
const validCard = { front: "Q", back: "A", order: 0 };

await env.clearFirestore();
await seed(async (db) => {
  await setDoc(doc(db, profile(ALICE)), {
    email: "alice@example.com",
    displayName: "Alice",
    educationLevel: "grade_11",
    strand: "stem",
    courses: ["General Chemistry 1"],
    onboardingCompleted: true,
    plan: "free",
    aiGenerationsUsedThisPeriod: 3,
  });
  await setDoc(doc(db, set(ALICE, "private1")), { ...validSet, isShared: false });
  await setDoc(doc(db, card(ALICE, "private1", "c1")), validCard);
  await setDoc(doc(db, set(ALICE, "shared1")), { ...validSet, isShared: true });
  await setDoc(doc(db, card(ALICE, "shared1", "c1")), validCard);
});

console.log("\nOwnership");

await check("a user can read their own profile", async () => {
  await assertSucceeds(getDoc(doc(alice, profile(ALICE))));
});

await check("a stranger cannot read someone else's profile", async () => {
  await assertFails(getDoc(doc(mallory, profile(ALICE))));
});

await check("a stranger cannot read someone else's notes", async () => {
  await seed((db) => setDoc(doc(db, note(ALICE, "n1")), validNote));
  await assertFails(getDoc(doc(mallory, note(ALICE, "n1"))));
});

await check("an anonymous visitor cannot read a private set", async () => {
  await assertFails(getDoc(doc(anon, set(ALICE, "private1"))));
});

console.log("\nThe paywall cannot be forged");

await check("a user cannot promote their own plan", async () => {
  await assertFails(updateDoc(doc(alice, profile(ALICE)), { plan: "pro" }));
});

await check("a user cannot reset their own generation counter", async () => {
  // Seeded at 3, so writing 0 is a genuine mutation. (Writing the *same*
  // value is a no-op — affectedKeys is empty — and is correctly allowed,
  // since it changes nothing.)
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), { aiGenerationsUsedThisPeriod: 0 }),
  );
});

await check("a no-op write to a protected field changes nothing and is harmless", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), { aiGenerationsUsedThisPeriod: 3 }),
  );
});

await check("a user cannot create their own profile document", async () => {
  await assertFails(
    setDoc(doc(alice, profile("brand-new-uid")), { plan: "pro" }),
  );
});

await check("a user CAN edit the fields meant for them", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), {
      displayName: "Alice A.",
      courses: ["General Biology 1"],
    }),
  );
});

console.log("\nConsent");

await check("a student can record their own consent", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), {
      termsAcceptedVersion: "2026-08-18",
      termsAcceptedAt: serverTimestamp(),
      isAdult: false,
      guardianConsent: true,
    }),
  );
});

await check("consent cannot be backdated to a client-chosen time", async () => {
  // The point of pinning to request.time: an acceptance record is worthless
  // if the person accepting gets to choose when it says it happened.
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), {
      termsAcceptedVersion: "2026-08-18",
      termsAcceptedAt: new Date("2020-01-01T00:00:00Z"),
      isAdult: true,
      guardianConsent: false,
    }),
  );
});

await check("consent flags must be booleans", async () => {
  await assertFails(updateDoc(doc(alice, profile(ALICE)), { isAdult: "yes" }));
});

await check("ordinary profile edits still work after consent is on record", async () => {
  // The acceptance time is pinned to request.time, so an unchanged
  // termsAcceptedAt riding along on a later edit must not trip that check.
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), { displayName: "Alice B." }),
  );
});

console.log("\nWrite validation — the cost-abuse boundary");

await check("a note over the size ceiling is rejected", async () => {
  await assertFails(
    setDoc(doc(alice, note(ALICE, "huge")), {
      ...validNote,
      content: "x".repeat(120001),
    }),
  );
});

await check("a note within the ceiling is accepted", async () => {
  await assertSucceeds(
    setDoc(doc(alice, note(ALICE, "ok")), { ...validNote, content: "x".repeat(1000) }),
  );
});

await check("unexpected fields on a note are rejected", async () => {
  await assertFails(
    setDoc(doc(alice, note(ALICE, "extra")), { ...validNote, isAdmin: true }),
  );
});

await check("a non-string note title is rejected", async () => {
  await assertFails(
    setDoc(doc(alice, note(ALICE, "bad")), { ...validNote, title: 12345 }),
  );
});

await check("a flashcard with an empty front is rejected", async () => {
  await assertFails(
    setDoc(doc(alice, card(ALICE, "private1", "empty")), { front: "", back: "A" }),
  );
});

await check("a card cannot be stamped with someone else's ownerId", async () => {
  // This is the whole security argument for the collection-group query: if a
  // card could claim a foreign owner, it would surface in that student's
  // review queue.
  await assertFails(
    setDoc(doc(alice, card(ALICE, "private1", "forged")), {
      front: "Q",
      back: "A",
      order: 0,
      ownerId: MALLORY,
    }),
  );
});

await check("a card stamped with its real owner is accepted", async () => {
  await assertSucceeds(
    setDoc(doc(alice, card(ALICE, "private1", "owned")), {
      front: "Q",
      back: "A",
      order: 0,
      ownerId: ALICE,
    }),
  );
});

await check("a collection-group card query only returns your own cards", async () => {
  await seed((db) =>
    setDoc(doc(db, card(MALLORY, "mset", "m1")), { ...validCard, ownerId: MALLORY }),
  );
  const mine = await assertSucceeds(
    getDocs(query(collectionGroup(alice, "flashcards"), where("ownerId", "==", ALICE))),
  );
  assert.ok(mine.size > 0, "own cards come back");
  assert.ok(
    mine.docs.every((d) => d.data().ownerId === ALICE),
    "no other student's cards leak in",
  );
});

await check("a collection-group query for someone else's cards is refused", async () => {
  await assertFails(
    getDocs(query(collectionGroup(alice, "flashcards"), where("ownerId", "==", MALLORY))),
  );
});

await check("a quiz question whose answer key is out of range is rejected", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/studySets/private1/quizQuestions/q1`), {
      question: "Pick",
      choices: ["a", "b", "c", "d"],
      correctIndex: 9,
    }),
  );
});

await check("a review log with an impossible ease factor is rejected", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/reviewLogs/c1`), {
      flashcardId: "c1",
      studySetId: "private1",
      easeFactor: 999,
      intervalDays: 1,
      repetitions: 1,
      nextReviewAt: new Date(),
      lastRating: "good",
    }),
  );
});

await check("a review log with an invalid rating is rejected", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/reviewLogs/c2`), {
      flashcardId: "c2",
      studySetId: "private1",
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 1,
      nextReviewAt: new Date(),
      lastRating: "trivial",
    }),
  );
});

await check("a valid review log is accepted", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/reviewLogs/c3`), {
      flashcardId: "c3",
      studySetId: "private1",
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
      nextReviewAt: new Date(),
      lastReviewedAt: new Date(),
      lastRating: "good",
    }),
  );
});

console.log("\nSharing boundary");

await check("anyone can read a shared set", async () => {
  await assertSucceeds(getDoc(doc(anon, set(ALICE, "shared1"))));
});

await check("anyone can read a shared set's flashcards", async () => {
  await assertSucceeds(getDocs(collection(anon, `users/${ALICE}/studySets/shared1/flashcards`)));
});

await check("sharing one set does NOT expose the others", async () => {
  await assertFails(getDoc(doc(anon, set(ALICE, "private1"))));
});

await check("a stranger cannot LIST the library even when a set is shared", async () => {
  await assertFails(getDocs(collection(anon, `users/${ALICE}/studySets`)));
});

await check("a stranger cannot write to a shared set", async () => {
  await assertFails(updateDoc(doc(mallory, set(ALICE, "shared1")), { title: "Hijacked" }));
});

await check("a stranger cannot add cards to a shared set", async () => {
  await assertFails(setDoc(doc(mallory, card(ALICE, "shared1", "evil")), validCard));
});

await check("a stranger cannot delete a shared set", async () => {
  await assertFails(deleteDoc(doc(mallory, set(ALICE, "shared1"))));
});

await check("unsharing revokes access immediately", async () => {
  await seed((db) => updateDoc(doc(db, set(ALICE, "shared1")), { isShared: false }));
  await assertFails(getDoc(doc(anon, set(ALICE, "shared1"))));
  await seed((db) => updateDoc(doc(db, set(ALICE, "shared1")), { isShared: true }));
});

await check("review history is never shared", async () => {
  await seed((db) =>
    setDoc(doc(db, `users/${ALICE}/reviewLogs/c1`), {
      flashcardId: "c1",
      studySetId: "shared1",
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 1,
      nextReviewAt: new Date(),
      lastRating: "good",
    }),
  );
  await assertFails(getDoc(doc(anon, `users/${ALICE}/reviewLogs/c1`)));
});

console.log("\nCatch-all");

await check("the rate-limit ledger is invisible to clients", async () => {
  // Server-owned: if a student could read or clear it, the anti-farming layer
  // would be theirs to switch off.
  await assertFails(getDoc(doc(alice, "rateLimits/generate_1.2.3.4_0")));
  await assertFails(setDoc(doc(alice, "rateLimits/generate_1.2.3.4_0"), { count: 0 }));
});

await check("the moderation queue is invisible to clients", async () => {
  await assertFails(getDocs(collection(alice, "reports")));
  await assertFails(setDoc(doc(alice, "reports/forged"), { status: "closed" }));
});

await check("the billing ledger is invisible to clients", async () => {
  // The webhook's idempotency claim. A client that could delete an entry could
  // replay a paid event; one that could write a profile's plan would not even
  // need to.
  await assertFails(getDoc(doc(alice, "billingEvents/evt_1")));
  await assertFails(setDoc(doc(alice, "billingEvents/evt_1"), { type: "payment.paid" }));
});

await check("a user cannot grant themselves a paid subscription", async () => {
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), { planStatus: "active" }),
  );
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), { planExpiresAt: serverTimestamp() }),
  );
});

await check("nothing outside /users is writable", async () => {
  await assertFails(setDoc(doc(alice, "config/flags"), { admin: true }));
});

await env.cleanup();
console.log(`\n${passed} checks passed.\n`);
assert.ok(passed > 0);

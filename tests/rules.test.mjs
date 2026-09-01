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
  documentId,
  query,
  serverTimestamp,
  Timestamp,
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

await check("every education level the app offers is accepted", async () => {
  for (const educationLevel of ["grade_11", "grade_12", "college", "board_review"]) {
    await assertSucceeds(
      updateDoc(doc(alice, profile(ALICE)), { educationLevel }),
    );
  }
});

await check("an invented education level is rejected", async () => {
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), { educationLevel: "phd" }),
  );
});

await check("every SHS track DepEd actually has is accepted", async () => {
  // Regression guard: the rules enumerate strands, so adding a track to
  // curriculum.ts without adding it here locks those students out silently.
  for (const strand of [
    "stem", "abm", "humss", "gas",
    "tvl_he", "tvl_ict", "tvl_ia", "tvl_afa",
    "sports", "arts",
  ]) {
    await assertSucceeds(updateDoc(doc(alice, profile(ALICE)), { strand }));
  }
});

await check("an invented strand is still rejected", async () => {
  await assertFails(updateDoc(doc(alice, profile(ALICE)), { strand: "wizardry" }));
});

await check("a student can set and clear their school", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), { school: "Batangas State University" }),
  );
  await assertSucceeds(updateDoc(doc(alice, profile(ALICE)), { school: null }));
});

await check("an over-long school name is rejected", async () => {
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), { school: "x".repeat(121) }),
  );
});

await check("a reviewer can set and clear their exam date", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), { examDate: "2026-10-05" }),
  );
  await assertSucceeds(updateDoc(doc(alice, profile(ALICE)), { examDate: null }));
});

await check("a malformed exam date is rejected", async () => {
  // The clamp silently does nothing on an unparseable value, so a bad date
  // would disable exam scheduling without any visible error. Reject at write.
  for (const bad of ["05/10/2026", "2026-10", "tomorrow", "2026-10-05T00:00:00Z"]) {
    await assertFails(updateDoc(doc(alice, profile(ALICE)), { examDate: bad }));
  }
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

await check("a student may turn typed recall on and off", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), { typedRecall: false }),
  );
  await assertSucceeds(
    updateDoc(doc(alice, profile(ALICE)), { typedRecall: true }),
  );
});

await check("typed recall must be a boolean", async () => {
  await assertFails(
    updateDoc(doc(alice, profile(ALICE)), { typedRecall: "yes" }),
  );
});


await check("a quiz question may name the card it tests", async () => {
  const q = doc(alice, `users/${ALICE}/studySets/private1/quizQuestions/q2`);
  await assertSucceeds(
    setDoc(q, {
      question: "Where do the light-dependent reactions occur?",
      choices: ["Stroma", "Thylakoid membrane", "Cytoplasm", "Matrix"],
      correctIndex: 1,
      order: 0,
      flashcardId: "card-abc",
    }),
  );
  // Older sets carry no link at all, and must stay writable.
  await assertSucceeds(
    setDoc(q, {
      question: "Where do the light-dependent reactions occur?",
      choices: ["Stroma", "Thylakoid membrane", "Cytoplasm", "Matrix"],
      correctIndex: 1,
      order: 0,
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

await check("a student can report a card as wrong", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/cardReports/c1`), {
      studySetId: "private1",
      flashcardId: "c1",
      reportedAt: serverTimestamp(),
    }),
  );
});

await check("a report cannot claim to be about a different card", async () => {
  // The doc id IS the flashcard id; a mismatch would corrupt the join the
  // quality script relies on.
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/cardReports/c1`), {
      studySetId: "private1",
      flashcardId: "some-other-card",
      reportedAt: serverTimestamp(),
    }),
  );
});

await check("a stranger cannot read someone else's card reports", async () => {
  await assertFails(getDoc(doc(mallory, `users/${ALICE}/cardReports/c1`)));
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


/* --- the organiser --------------------------------------------------------
   One collection holding three shapes, so the branch in the validator is the
   thing worth testing: each kind must accept what it needs and refuse what
   belongs to another kind. */

await check("a todo can be undated", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/planItems/t1`), {
      kind: "todo",
      title: "Read chapter 4",
      courseTag: "General Biology 1",
      done: false,
    }),
  );
});

await check("a todo may carry a date and a done flag", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/planItems/t2`), {
      kind: "todo",
      title: "Problem set",
      dueDate: "2026-09-04",
      done: true,
    }),
  );
});

await check("a deadline without a date is refused", async () => {
  // A deadline with no date is a todo, and there is already a kind for that.
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/d1`), {
      kind: "deadline",
      title: "Thesis draft",
    }),
  );
});

await check("a malformed date is refused", async () => {
  // It would silently disable every countdown built on it rather than error.
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/d2`), {
      kind: "deadline",
      title: "Thesis draft",
      dueDate: "next Friday",
    }),
  );
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/d3`), {
      kind: "deadline",
      title: "Thesis draft",
      dueDate: "2026-9-4",
    }),
  );
});

await check("a valid deadline is accepted", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/planItems/d4`), {
      kind: "deadline",
      title: "Thesis draft",
      dueDate: "2026-09-04",
      courseTag: "Research",
    }),
  );
});

await check("a class needs a weekday and a time range", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/planItems/c1`), {
      kind: "class",
      title: "General Biology lecture",
      weekday: 1,
      startMinute: 480,
      endMinute: 570,
      location: "Room 204",
    }),
  );
});

await check("a class that ends before it starts is refused", async () => {
  // It would render as a negative-height block and sort unpredictably.
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/c2`), {
      kind: "class",
      title: "Impossible",
      weekday: 1,
      startMinute: 600,
      endMinute: 540,
    }),
  );
});

await check("a weekday outside the week is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/c3`), {
      kind: "class",
      title: "Eighth day",
      weekday: 7,
      startMinute: 480,
      endMinute: 540,
    }),
  );
});

await check("a class time outside the day is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/c4`), {
      kind: "class",
      title: "Too late",
      weekday: 1,
      startMinute: 1440,
      endMinute: 1500,
    }),
  );
});

await check("an unknown kind is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/x1`), {
      kind: "exam",
      title: "Midterms",
    }),
  );
});

await check("a blank title is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/planItems/x2`), { kind: "todo", title: "" }),
  );
});

await check("a stranger cannot read the organiser", async () => {
  await assertFails(getDoc(doc(mallory, `users/${ALICE}/planItems/t1`)));
});

await check("a study session records real minutes", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/studySessions/s1`), {
      source: "pomodoro",
      day: "2026-08-30",
      minutes: 25,
      courseTag: "General Biology 1",
    }),
  );
});

await check("an overnight session is refused", async () => {
  // A timer left running would log fourteen hours and poison every average
  // built on the log.
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/studySessions/s2`), {
      source: "pomodoro",
      day: "2026-08-30",
      minutes: 900,
    }),
  );
});

await check("negative study time is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/studySessions/s3`), {
      source: "manual",
      day: "2026-08-30",
      minutes: -30,
    }),
  );
});

await check("a session from an unknown source is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `users/${ALICE}/studySessions/s4`), {
      source: "imported",
      day: "2026-08-30",
      minutes: 25,
    }),
  );
});

await check("a session may be edited afterwards", async () => {
  // Editable is the point: a student who studied offline and sees a blank
  // week stops believing the number.
  await assertSucceeds(
    setDoc(doc(alice, `users/${ALICE}/studySessions/s1`), {
      source: "manual",
      day: "2026-08-30",
      minutes: 90,
      courseTag: "General Biology 1",
    }),
  );
});

await check("a stranger cannot read someone else's study time", async () => {
  await assertFails(getDoc(doc(mallory, `users/${ALICE}/studySessions/s1`)));
});


/* --- study groups ---------------------------------------------------------
   Group data is the first thing in Tuon that more than one account can read,
   so these are the checks that matter most in this file. The shape of the risk
   is one-sided: a rule that is too tight annoys a member, and a rule that is
   too loose exposes a minor's notes to someone who was never invited. */

const GROUP = "group1";
const OUTSIDER_GROUP = "group2";

await seed(async (db) => {
  await setDoc(doc(db, `studyGroups/${GROUP}`), {
    name: "Bio review batch",
    courseTag: "General Biology 1",
    ownerId: ALICE,
    memberIds: [ALICE],
    memberCount: 1,
  });
  await setDoc(doc(db, `studyGroups/${GROUP}/members/${ALICE}`), {
    displayName: "Alice",
    role: "owner",
  });
  await setDoc(doc(db, `studyGroups/${OUTSIDER_GROUP}`), {
    name: "Someone else's group",
    ownerId: MALLORY,
    memberIds: [MALLORY],
    memberCount: 1,
  });
  // Alice belongs to GROUP; Mallory belongs only to OUTSIDER_GROUP.
  await setDoc(doc(db, profile(ALICE)), { groupIds: [GROUP] }, { merge: true });
  await setDoc(doc(db, profile(MALLORY)), { groupIds: [OUTSIDER_GROUP] }, { merge: true });
  await setDoc(doc(db, `studyGroups/${GROUP}/sharedSets/shared1`), {
    ownerId: ALICE,
    studySetId: "private1",
    title: "Photosynthesis",
    cardCount: 8,
    sharedByName: "Alice",
  });
});

await check("a member can read their group", async () => {
  await assertSucceeds(getDoc(doc(alice, `studyGroups/${GROUP}`)));
});

await check("a stranger cannot read a group they are not in", async () => {
  await assertFails(getDoc(doc(mallory, `studyGroups/${GROUP}`)));
});

await check("nobody can enumerate every group", async () => {
  // Rules are not filters: an unconstrained query is refused the moment it
  // would return a group the caller is not in. This is what stops the list
  // permission below from becoming a directory of every group in the app.
  await assertFails(getDocs(collection(alice, "studyGroups")));
  await assertFails(getDocs(collection(mallory, "studyGroups")));
});

await check("a student can query the groups they are actually in", async () => {
  // Which is a list operation, and the reason `list` is not simply denied:
  // fetching them one at a time would be a request per group per page load.
  await assertSucceeds(
    getDocs(query(collection(alice, "studyGroups"), where(documentId(), "in", [GROUP]))),
  );
});

await check("naming someone else's group in a query does not get you in", async () => {
  // The obvious attack on the rule above: ask for a specific id you were never
  // invited to. It fails because the returned document would not satisfy it.
  await assertFails(
    getDocs(query(collection(mallory, "studyGroups"), where(documentId(), "in", [GROUP]))),
  );
});

await check("a signed-out visitor sees nothing", async () => {
  await assertFails(getDoc(doc(anon, `studyGroups/${GROUP}`)));
});

await check("a client cannot create a group", async () => {
  // Groups are made by /api/groups/create, which writes the group, the member
  // record and the creator's profile together. A half-created group is one
  // nobody can ever reach.
  await assertFails(
    setDoc(doc(alice, "studyGroups/newgroup"), {
      name: "Mine",
      ownerId: ALICE,
      memberIds: [ALICE],
      memberCount: 1,
    }),
  );
});

await check("a member cannot add themselves to a group", async () => {
  // THE critical one. memberIds is the access-control list; if a client could
  // edit it, anyone could join any group whose id they could guess.
  await assertFails(
    updateDoc(doc(mallory, `studyGroups/${GROUP}`), { memberIds: [ALICE, MALLORY] }),
  );
});

await check("even the owner cannot edit the member list", async () => {
  await assertFails(
    updateDoc(doc(alice, `studyGroups/${GROUP}`), { memberIds: [ALICE, MALLORY] }),
  );
});

await check("the owner may rename the group", async () => {
  await assertSucceeds(
    updateDoc(doc(alice, `studyGroups/${GROUP}`), { name: "Bio batch 2026" }),
  );
});

await check("a member who is not the owner cannot rename it", async () => {
  await assertFails(
    updateDoc(doc(mallory, `studyGroups/${OUTSIDER_GROUP}`), { ownerId: ALICE }),
  );
});

await check("the owner cannot hand ownership to themselves elsewhere", async () => {
  await assertFails(updateDoc(doc(alice, `studyGroups/${GROUP}`), { ownerId: MALLORY }));
});

await check("a client cannot delete a group", async () => {
  await assertFails(deleteDoc(doc(alice, `studyGroups/${GROUP}`)));
});

await check("member records are readable inside the group and nowhere else", async () => {
  await assertSucceeds(getDoc(doc(alice, `studyGroups/${GROUP}/members/${ALICE}`)));
  await assertFails(getDoc(doc(mallory, `studyGroups/${GROUP}/members/${ALICE}`)));
});

await check("a member cannot write a member record", async () => {
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/members/${MALLORY}`), {
      displayName: "Sneaked in",
      role: "member",
    }),
  );
});

await check("invite codes are invisible and unmintable", async () => {
  // Reading them would let anyone enumerate every code in the app; writing
  // them would let anyone mint an invite to a group they are not in.
  await assertFails(getDoc(doc(alice, "groupInvites/ABC123")));
  await assertFails(setDoc(doc(alice, "groupInvites/ABC123"), { groupId: GROUP }));
});

console.log("\n  Sharing a set into a group");

await check("a member can share their own set", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `studyGroups/${GROUP}/sharedSets/s2`), {
      ownerId: ALICE,
      studySetId: "private1",
      title: "Photosynthesis",
      cardCount: 8,
      sharedByName: "Alice",
    }),
  );
});

await check("a member cannot list someone else's set as shared", async () => {
  // It would not grant access, but it would be a convincing lie in the group.
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/sharedSets/s3`), {
      ownerId: MALLORY,
      studySetId: "whatever",
      title: "Not mine",
      cardCount: 1,
      sharedByName: "Alice",
    }),
  );
});

await check("a stranger cannot see what a group is studying", async () => {
  await assertFails(getDoc(doc(mallory, `studyGroups/${GROUP}/sharedSets/shared1`)));
});

await check("a set shared to my group becomes readable to me", async () => {
  await seed(async (db) => {
    await setDoc(
      doc(db, set(ALICE, "grouped1")),
      { title: "Shared with the batch", flashcardCount: 3, quizQuestionCount: 0, sharedWithGroups: [GROUP] },
    );
    await setDoc(doc(db, card(ALICE, "grouped1", "c1")), {
      front: "Q",
      back: "A",
      ownerId: ALICE,
    });
    // Bob is in Alice's group; Mallory is not.
    await setDoc(doc(db, `studyGroups/${GROUP}`), {
      name: "Bio review batch",
      ownerId: ALICE,
      memberIds: [ALICE, "bob-uid"],
      memberCount: 2,
    });
    await setDoc(doc(db, profile("bob-uid")), { groupIds: [GROUP] }, { merge: true });
  });

  const bob = env.authenticatedContext("bob-uid").firestore();
  await assertSucceeds(getDoc(doc(bob, set(ALICE, "grouped1"))));
  await assertSucceeds(getDoc(doc(bob, card(ALICE, "grouped1", "c1"))));
});

await check("a set shared to one group is invisible to another", async () => {
  // The narrow point of sharedWithGroups: it must not behave like isShared,
  // which means anyone with the link.
  await assertFails(getDoc(doc(mallory, set(ALICE, "grouped1"))));
});

await check("group sharing does not expose the rest of the library", async () => {
  const bob = env.authenticatedContext("bob-uid").firestore();
  await assertFails(getDoc(doc(bob, set(ALICE, "private1"))));
  await assertFails(getDocs(collection(bob, `users/${ALICE}/studySets`)));
  await assertFails(getDoc(doc(bob, note(ALICE, "n1"))));
});

await check("a student cannot put themselves in a group to read its sets", async () => {
  // groupIds is server-owned for exactly this reason: if Mallory could add
  // Alice's group to her own profile, every set shared into it would open up.
  await assertFails(updateDoc(doc(mallory, profile(MALLORY)), { groupIds: [GROUP] }));
});

console.log("\n  Group deadlines and presence");

await check("a member can post a group deadline", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `studyGroups/${GROUP}/deadlines/d1`), {
      title: "Practical exam",
      dueDate: "2026-09-15",
      createdBy: ALICE,
      createdByName: "Alice",
    }),
  );
});

await check("a deadline cannot be posted in someone else's name", async () => {
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/deadlines/d2`), {
      title: "Fake",
      dueDate: "2026-09-15",
      createdBy: MALLORY,
      createdByName: "Mallory",
    }),
  );
});

await check("a group deadline needs a real date", async () => {
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/deadlines/d3`), {
      title: "Sometime",
      dueDate: "next week",
      createdBy: ALICE,
      createdByName: "Alice",
    }),
  );
});

await check("an outsider cannot read or write group deadlines", async () => {
  await assertFails(getDoc(doc(mallory, `studyGroups/${GROUP}/deadlines/d1`)));
  await assertFails(
    setDoc(doc(mallory, `studyGroups/${GROUP}/deadlines/d4`), {
      title: "Intruder",
      dueDate: "2026-09-15",
      createdBy: MALLORY,
      createdByName: "Mallory",
    }),
  );
});

await check("a member can publish their own standing", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `studyGroups/${GROUP}/scores/${ALICE}`), {
      displayName: "Alice",
      xp: 240,
      recalls: 140,
      mastered: 10,
      studied: 60,
    }),
  );
});

await check("a member cannot write someone else's standing", async () => {
  // Otherwise one member could put a classmate at the bottom of the table.
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/scores/bob-uid`), {
      displayName: "Bob",
      xp: 0,
      recalls: 0,
      mastered: 0,
      studied: 0,
    }),
  );
});

await check("an absurd score is refused", async () => {
  // These numbers are computed on the member's own device, so the rules cannot
  // prove them — but they can stop a billion appearing in the table.
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/scores/${ALICE}`), {
      displayName: "Alice",
      xp: 999999999,
      recalls: 1,
      mastered: 1,
      studied: 1,
    }),
  );
});

await check("a negative score is refused", async () => {
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/scores/${ALICE}`), {
      displayName: "Alice",
      xp: -10,
      recalls: 0,
      mastered: 0,
      studied: 0,
    }),
  );
});

await check("a stranger cannot read the standings", async () => {
  await assertFails(getDoc(doc(mallory, `studyGroups/${GROUP}/scores/${ALICE}`)));
});

await check("a member can say they are studying", async () => {
  await assertSucceeds(
    setDoc(doc(alice, `studyGroups/${GROUP}/presence/${ALICE}`), {
      displayName: "Alice",
      until: Timestamp.fromDate(new Date(Date.now() + 25 * 60 * 1000)),
    }),
  );
});

await check("a member cannot post presence as someone else", async () => {
  // Otherwise one member could fill a group with fake company.
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/presence/bob-uid`), {
      displayName: "Bob",
      until: Timestamp.fromDate(new Date(Date.now() + 60 * 1000)),
    }),
  );
});

await check("a member can clear their own presence", async () => {
  // Delete carries no document to validate, so a single `allow write` guarded
  // by the shape validator refused it — and a member who stopped studying
  // stayed lit until the entry expired on its own. Found by pausing the timer
  // and looking at the group.
  await assertSucceeds(deleteDoc(doc(alice, `studyGroups/${GROUP}/presence/${ALICE}`)));
});

await check("a member cannot clear someone else's presence", async () => {
  await assertFails(deleteDoc(doc(alice, `studyGroups/${GROUP}/presence/bob-uid`)));
});

await check("presence cannot last forever", async () => {
  // An entry that never expires is a member who appears to be studying for
  // the rest of the year.
  await assertFails(
    setDoc(doc(alice, `studyGroups/${GROUP}/presence/${ALICE}`), {
      displayName: "Alice",
      until: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    }),
  );
});


await env.cleanup();

console.log(`\n${passed} checks passed.\n`);
assert.ok(passed > 0);

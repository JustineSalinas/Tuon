/**
 * The sample study set seeded into every new account.
 *
 * It is written into Firestore with the Admin SDK, which bypasses security
 * rules — so nothing would stop a sample that the user's own client could not
 * legally have written. That failure is silent and nasty: the set appears,
 * looks fine, and then the student cannot edit their own card because the
 * write is rejected. These assert the content against the same limits
 * firestore.rules enforces.
 *
 * The content is also the first thing a new user reads, so a couple of these
 * are about it being a decent set rather than a valid one.
 */
import assert from "node:assert/strict";

import {
  SAMPLE_COURSE_TAG,
  SAMPLE_FLASHCARDS,
  SAMPLE_NOTE,
  SAMPLE_QUIZ,
  SAMPLE_SET_TITLE,
} from "../src/lib/sample-set.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("\nSample study set");

check("the note fits what the rules allow", () => {
  assert.ok(SAMPLE_NOTE.title.length > 0 && SAMPLE_NOTE.title.length <= 140);
  assert.ok(SAMPLE_NOTE.content.length > 0 && SAMPLE_NOTE.content.length <= 120000);
  assert.ok(SAMPLE_NOTE.courseTag.length <= 80);
});

check("the study set fits what the rules allow", () => {
  assert.ok(SAMPLE_SET_TITLE.length > 0 && SAMPLE_SET_TITLE.length <= 140);
  assert.ok(SAMPLE_COURSE_TAG.length <= 80);
  assert.ok(SAMPLE_FLASHCARDS.length <= 500);
  assert.ok(SAMPLE_QUIZ.length <= 100);
});

check("every flashcard fits what the rules allow", () => {
  SAMPLE_FLASHCARDS.forEach((card, i) => {
    assert.ok(card.front.length > 0, `card ${i} front empty`);
    assert.ok(card.front.length <= 400, `card ${i} front too long`);
    assert.ok(card.back.length > 0, `card ${i} back empty`);
    assert.ok(card.back.length <= 1200, `card ${i} back too long`);
  });
});

check("every quiz question fits what the rules allow", () => {
  SAMPLE_QUIZ.forEach((q, i) => {
    assert.ok(q.question.length > 0 && q.question.length <= 600, `q${i} length`);
    assert.ok(q.choices.length >= 2, `q${i} needs at least 2 choices`);
    assert.ok(q.choices.length <= 6, `q${i} may have at most 6 choices`);
    assert.ok(Number.isInteger(q.correctIndex), `q${i} correctIndex must be an int`);
    assert.ok(q.correctIndex >= 0, `q${i} correctIndex below range`);
    assert.ok(q.correctIndex < q.choices.length, `q${i} correctIndex out of range`);
  });
});

check("no quiz choice is blank", () => {
  // A blank option renders as an empty button nobody can interpret.
  SAMPLE_QUIZ.forEach((q, i) =>
    q.choices.forEach((c, j) =>
      assert.ok(c.trim().length > 0, `q${i} choice ${j} is blank`),
    ),
  );
});

check("no quiz question has duplicate choices", () => {
  // Two identical options mean there are two right answers or two wrong ones,
  // and the student cannot tell which they picked.
  SAMPLE_QUIZ.forEach((q, i) => {
    const unique = new Set(q.choices.map((c) => c.trim().toLowerCase()));
    assert.equal(unique.size, q.choices.length, `q${i} has duplicate choices`);
  });
});

check("no two flashcards ask the same thing", () => {
  const fronts = SAMPLE_FLASHCARDS.map((c) => c.front.trim().toLowerCase());
  assert.equal(new Set(fronts).size, fronts.length, "duplicate card fronts");
});

check("the first session is short enough to finish", () => {
  // This is somebody's first thirty seconds in the app. A sample that opens
  // with forty cards teaches that Tuón is a chore.
  assert.ok(
    SAMPLE_FLASHCARDS.length >= 5 && SAMPLE_FLASHCARDS.length <= 12,
    `expected 5-12 cards, got ${SAMPLE_FLASHCARDS.length}`,
  );
});

check("the note says it is a sample and can be deleted", () => {
  // Otherwise it reads as something the app requires, and people leave it
  // sitting in their library forever.
  assert.match(SAMPLE_NOTE.content, /sample/i);
  assert.match(SAMPLE_NOTE.content, /delete/i);
});

console.log(`\n${passed} checks passed.\n`);

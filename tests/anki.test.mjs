/**
 * The pure half of the Anki importer: turning one note's `flds` string into
 * a front/back pair. The zip and SQLite reading around it needs a real
 * `.apkg` fixture to exercise meaningfully, but this transformation is where
 * a wrong answer would be silent — a mangled front or a dropped back reads
 * as "the import worked" right up until the student opens the card.
 */
import assert from "node:assert/strict";

import { stripHtml, toFrontBack } from "../src/lib/anki/import.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const FIELD_SEPARATOR = "\x1f";

console.log("\nStripping Anki's field HTML");

check("line breaks survive as newlines, not spaces", () => {
  assert.equal(stripHtml("line one<br>line two"), "line one\nline two");
});

check("block elements close onto their own line", () => {
  assert.equal(stripHtml("<div>a</div><div>b</div>"), "a\nb");
});

check("inline tags are removed, their text kept", () => {
  assert.equal(stripHtml("<b>bold</b> and <i>italic</i>"), "bold and italic");
});

check("entities decode", () => {
  assert.equal(stripHtml("Tom &amp; Jerry: 5 &lt; 10 &amp;&amp; 10 &gt; 5"), "Tom & Jerry: 5 < 10 && 10 > 5");
});

console.log("\nA note's fields, as a flashcard");

check("a two-field Basic note becomes front and back", () => {
  const card = toFrontBack(["What is H2O?", "Water"].join(FIELD_SEPARATOR));
  assert.deepEqual(card, { front: "What is H2O?", back: "Water" });
});

check("extra fields fold into the back, in order", () => {
  const card = toFrontBack(
    ["Capital of France?", "Paris", "A European capital on the Seine"].join(FIELD_SEPARATOR),
  );
  assert.equal(card.front, "Capital of France?");
  assert.ok(card.back.includes("Paris"));
  assert.ok(card.back.includes("Seine"));
});

check("a cloze note blanks the marker on the front and answers it on the back", () => {
  const card = toFrontBack("The mitochondria is the {{c1::powerhouse}} of the cell");
  assert.equal(card.front, "The mitochondria is the ____ of the cell");
  assert.equal(card.back, "The mitochondria is the powerhouse of the cell");
});

check("multiple cloze markers in one note all blank on the front", () => {
  const card = toFrontBack("{{c1::Mitosis}} makes {{c2::two}} identical cells");
  assert.equal(card.front, "____ makes ____ identical cells");
  assert.equal(card.back, "Mitosis makes two identical cells");
});

check("a note with an empty front is dropped", () => {
  assert.equal(toFrontBack(["", "an answer with no question"].join(FIELD_SEPARATOR)), null);
});

check("a note with no second field is dropped", () => {
  assert.equal(toFrontBack("just one field"), null);
});

check("fields are HTML-stripped before becoming front and back", () => {
  const card = toFrontBack(["<b>Term</b>", "A definition<br>continued"].join(FIELD_SEPARATOR));
  assert.equal(card.front, "Term");
  assert.equal(card.back, "A definition\ncontinued");
});

console.log(`\n${passed} checks passed.`);

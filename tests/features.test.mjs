import assert from "node:assert/strict";
import {
  buildForecast,
  difficultyOf,
  maturityOf,
  maturityBreakdown,
  summarise,
} from "../src/lib/stats/retention.ts";
import {
  exportFilename,
  toAnki,
  toCsv,
  toPrintableHtml,
} from "../src/lib/export/study-set.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const NOW = new Date("2026-08-18T04:00:00.000Z").getTime();

/** Minimal stand-in for a Firestore Timestamp. */
const ts = (date) => ({ toDate: () => date });

function card(id, { interval = null, ease = 2.5, dueInDays = null } = {}) {
  return {
    id,
    front: `Front ${id}`,
    back: `Back ${id}`,
    order: 0,
    studySetId: "set1",
    studySetTitle: "Gen Chem 1",
    courseTag: "General Chemistry 1",
    log:
      interval === null
        ? null
        : {
            flashcardId: id,
            studySetId: "set1",
            easeFactor: ease,
            intervalDays: interval,
            repetitions: 3,
            nextReviewAt: ts(new Date(NOW + (dueInDays ?? 0) * 86_400_000)),
            lastReviewedAt: ts(new Date(NOW)),
            lastRating: "good",
          },
  };
}

console.log("\nMaturity");

check("an unreviewed card is new, regardless of anything else", () => {
  assert.equal(maturityOf(card("a")), "new");
});

check("stages follow the interval boundaries", () => {
  assert.equal(maturityOf(card("b", { interval: 1 })), "learning");
  assert.equal(maturityOf(card("c", { interval: 6 })), "learning");
  assert.equal(maturityOf(card("d", { interval: 7 })), "young");
  assert.equal(maturityOf(card("e", { interval: 29 })), "young");
  assert.equal(maturityOf(card("f", { interval: 30 })), "mature");
});

check("breakdown shares sum to 1 and preserve stage order", () => {
  const cards = [
    card("a"),
    card("b", { interval: 2 }),
    card("c", { interval: 10 }),
    card("d", { interval: 90 }),
  ];
  const rows = maturityBreakdown(cards);
  assert.deepEqual(
    rows.map((r) => r.stage),
    ["new", "learning", "young", "mature"],
  );
  assert.equal(rows.reduce((s, r) => s + r.share, 0), 1);
  assert.ok(rows.every((r) => r.count === 1));
});

check("an empty deck does not divide by zero", () => {
  const rows = maturityBreakdown([]);
  assert.ok(rows.every((r) => r.count === 0 && Number.isFinite(r.share)));
});

console.log("\nForecast");

check("overdue cards collapse into one leading bucket", () => {
  const cards = [
    card("a", { interval: 5, dueInDays: -3 }),
    card("b", { interval: 5, dueInDays: -10 }),
    card("c", { interval: 5, dueInDays: 2 }),
  ];
  const forecast = buildForecast(cards, NOW, 14);
  assert.equal(forecast[0].isOverdue, true);
  assert.equal(forecast[0].count, 2, "both late cards land in one bucket");
  assert.equal(
    forecast.filter((d) => d.isOverdue).length,
    1,
    "exactly one overdue bucket",
  );
});

check("no overdue bucket appears when nothing is late", () => {
  const forecast = buildForecast([card("a", { interval: 5, dueInDays: 3 })], NOW, 14);
  assert.equal(forecast.some((d) => d.isOverdue), false);
  assert.equal(forecast.length, 14);
});

check("cards land on the right day and unreviewed cards are excluded", () => {
  const forecast = buildForecast(
    [card("a", { interval: 5, dueInDays: 3 }), card("b")],
    NOW,
    14,
  );
  const total = forecast.reduce((s, d) => s + d.count, 0);
  assert.equal(total, 1, "the never-reviewed card is not scheduled");
});

check("cards beyond the window are not counted", () => {
  const forecast = buildForecast([card("a", { interval: 60, dueInDays: 40 })], NOW, 14);
  assert.equal(forecast.reduce((s, d) => s + d.count, 0), 0);
});

console.log("\nAt-risk detection");

check("only repeatedly-failed cards count as at risk", () => {
  const cards = [
    card("easy", { interval: 30, ease: 2.5, dueInDays: 5 }),
    card("ok", { interval: 10, ease: 2.1, dueInDays: 5 }),
    card("hard", { interval: 1, ease: 1.6, dueInDays: 5 }),
    card("hardest", { interval: 1, ease: 1.3, dueInDays: 5 }),
  ];
  const s = summarise(cards, NOW);
  assert.equal(s.atRisk.length, 2);
  assert.equal(s.atRisk[0].id, "hardest", "hardest card sorts first");
});

check("summary counts only reviewed cards toward ease and maturity", () => {
  const s = summarise([card("new1"), card("m", { interval: 40, dueInDays: 5 })], NOW);
  assert.equal(s.total, 2);
  assert.equal(s.reviewed, 1);
  assert.equal(s.matureShare, 1, "share is of reviewed cards, not the whole deck");
});

check("a deck with no reviews reports null average ease, not NaN", () => {
  const s = summarise([card("a"), card("b")], NOW);
  assert.equal(s.averageEase, null);
  assert.equal(s.matureShare, 0);
});

check("difficulty is normalised and clamped", () => {
  assert.equal(difficultyOf(2.5), 0);
  assert.equal(difficultyOf(1.3), 1);
  assert.ok(difficultyOf(1.9) > 0 && difficultyOf(1.9) < 1);
  assert.equal(difficultyOf(9), 0, "above default clamps to easiest");
  assert.equal(difficultyOf(0.1), 1, "below floor clamps to hardest");
});

console.log("\nExport");

const payload = {
  studySet: { id: "s", title: "Gen Chem 1", courseTag: "General Chemistry 1" },
  flashcards: [
    { id: "1", front: 'What is "mole"?', back: "6.022e23 particles", order: 0 },
    { id: "2", front: "Line\nbreak", back: "Tab\there", order: 1 },
  ],
  quizQuestions: [
    { id: "q", question: "Pick one", choices: ["a", "b", "c", "d"], correctIndex: 2, order: 0 },
  ],
};

check("CSV doubles embedded quotes rather than breaking the row", () => {
  const csv = toCsv(payload);
  assert.ok(csv.includes('"What is ""mole""?"'));
});

check("CSV leads with a BOM so Excel reads UTF-8", () => {
  assert.equal(toCsv(payload).charCodeAt(0), 0xfeff);
});

check("Anki export removes tabs and converts newlines, or rows would split", () => {
  const anki = toAnki(payload);
  const body = anki.split("\n").filter((l) => l && !l.startsWith("#"));
  assert.equal(body.length, 2, "one line per card");
  assert.ok(body[1].includes("Line<br>break"), "newline became <br>");
  assert.equal(body[1].split("\t").length, 2, "exactly one field separator");
  assert.ok(!body[1].includes("Tab\there"), "literal tab removed");
});

check("Anki header declares the separator and HTML", () => {
  const anki = toAnki(payload);
  assert.ok(anki.startsWith("#separator:tab"));
  assert.ok(anki.includes("#html:true"));
});

check("printable HTML escapes markup instead of injecting it", () => {
  const evil = {
    ...payload,
    flashcards: [{ id: "x", front: "<script>alert(1)</script>", back: "&", order: 0 }],
  };
  const html = toPrintableHtml(evil);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&amp;"));
});

check("printable HTML includes an answer key with letters", () => {
  const html = toPrintableHtml(payload);
  assert.ok(html.includes("Answer key"));
  assert.ok(html.includes("1. C"), "correctIndex 2 renders as C");
});

check("filenames are stripped of path and shell characters", () => {
  assert.equal(exportFilename("Gen Chem 1", "csv"), "Gen-Chem-1.csv");
  assert.equal(exportFilename("../../etc/passwd", "csv"), "etcpasswd.csv");
  assert.equal(exportFilename("", "csv"), "tuon-study-set.csv");
  assert.ok(!exportFilename('a/b\\c:d*e?"f', "txt").match(/[/\\:*?"]/));
});

check("filenames keep non-ASCII letters", () => {
  assert.ok(exportFilename("Tuón Biología", "csv").startsWith("Tuón-Biología"));
});

console.log(`\n${passed} checks passed.\n`);

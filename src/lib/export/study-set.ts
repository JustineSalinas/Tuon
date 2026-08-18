import type { Flashcard, QuizQuestion, StudySet } from "@/lib/types";

/**
 * Exporters for a study set.
 *
 * All of these run entirely in the browser from data already loaded — no
 * server round-trip, no new dependency, and nothing leaves the device unless
 * the student saves the file themselves.
 */

export interface ExportPayload {
  studySet: StudySet;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

/* ---------------------------------------------------------------- CSV ---- */

/** RFC 4180: wrap in quotes and double any embedded quote. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv({ studySet, flashcards }: ExportPayload): string {
  const rows = [
    ["Front", "Back", "Study set", "Subject"].map(csvCell).join(","),
    ...flashcards.map((card) =>
      [card.front, card.back, studySet.title, studySet.courseTag ?? ""]
        .map(csvCell)
        .join(","),
    ),
  ];
  // A leading BOM makes Excel open UTF-8 correctly, which matters for
  // Filipino text with accents and for ñ.
  return `﻿${rows.join("\r\n")}\r\n`;
}

/* --------------------------------------------------------------- Anki ---- */

/**
 * Anki's plain-text importer is tab-separated, one note per line, and treats
 * the field content as HTML. So literal tabs must go (they are the delimiter)
 * and newlines become <br> rather than ending the record.
 */
function ankiField(value: string): string {
  return value
    .replace(/\t/g, " ")
    .replace(/\r\n|\r|\n/g, "<br>")
    .trim();
}

export function toAnki({ studySet, flashcards }: ExportPayload): string {
  const header = [
    "#separator:tab",
    "#html:true",
    `#tags:${(studySet.courseTag ?? "Tuon").replace(/\s+/g, "_")}`,
    "",
  ].join("\n");

  const lines = flashcards.map(
    (card) => `${ankiField(card.front)}\t${ankiField(card.back)}`,
  );
  return header + lines.join("\n") + "\n";
}

/* ------------------------------------------------------- Printable HTML -- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A print-ready document the browser turns into a PDF via its own
 * "Save as PDF". Avoids shipping a PDF library (hundreds of kB) for something
 * every browser already does well.
 */
export function toPrintableHtml({
  studySet,
  flashcards,
  quizQuestions,
}: ExportPayload): string {
  const cards = flashcards
    .map(
      (card, index) => `
      <li class="card">
        <div class="num">${index + 1}</div>
        <div>
          <p class="front">${escapeHtml(card.front)}</p>
          <p class="back">${escapeHtml(card.back)}</p>
        </div>
      </li>`,
    )
    .join("");

  const quiz = quizQuestions.length
    ? `
    <h2>Practice quiz</h2>
    <ol class="quiz">
      ${quizQuestions
        .map(
          (question) => `
        <li>
          <p class="q">${escapeHtml(question.question)}</p>
          <ol class="choices" type="A">
            ${question.choices.map((choice) => `<li>${escapeHtml(choice)}</li>`).join("")}
          </ol>
        </li>`,
        )
        .join("")}
    </ol>
    <h2 class="answers-heading">Answer key</h2>
    <p class="answers">${quizQuestions
      .map((q, i) => `${i + 1}. ${String.fromCharCode(65 + q.correctIndex)}`)
      .join("   ")}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(studySet.title)}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font: 11pt/1.5 Georgia, "Times New Roman", serif;
    color: #1F1B18; background: #fff; margin: 0;
  }
  header { border-bottom: 2px solid #C0603A; padding-bottom: 10px; margin-bottom: 22px; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  .meta { font-size: 9pt; color: #6B6259; margin: 0; }
  h2 { font-size: 13pt; margin: 26px 0 10px; page-break-after: avoid; }
  ul, ol { padding: 0; margin: 0; }
  .card {
    list-style: none; display: flex; gap: 12px;
    padding: 9px 0; border-bottom: 1px solid #E7E2DA;
    page-break-inside: avoid;
  }
  .num { color: #C0603A; font-size: 9pt; min-width: 22px; padding-top: 2px; }
  .front { font-weight: 700; margin: 0 0 3px; }
  .back { margin: 0; color: #3A342E; }
  .quiz > li { margin-bottom: 14px; page-break-inside: avoid; }
  .q { font-weight: 700; margin: 0 0 5px; }
  .choices { margin: 0 0 0 18px; color: #3A342E; }
  .answers-heading { page-break-before: auto; }
  .answers { font-family: ui-monospace, monospace; font-size: 10pt; letter-spacing: .04em; }
  footer { margin-top: 26px; border-top: 1px solid #E7E2DA; padding-top: 8px;
           font-size: 8.5pt; color: #6B6259; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(studySet.title)}</h1>
    <p class="meta">${[
      studySet.courseTag,
      `${flashcards.length} flashcards`,
      quizQuestions.length ? `${quizQuestions.length} quiz questions` : null,
    ]
      .filter(Boolean)
      .join(" · ")}</p>
  </header>

  <h2>Flashcards</h2>
  <ul>${cards}</ul>
  ${quiz}

  <footer>Exported from Tuón</footer>
</body>
</html>`;
}

/* -------------------------------------------------------------- Saving --- */

/** Filesystem-safe filename stem from a study set title. */
export function exportFilename(title: string, extension: string): string {
  const stem =
    title
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "tuon-study-set";
  return `${stem}.${extension}`;
}

export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Prints via a hidden iframe rather than window.open, which pop-up blockers
 * routinely swallow. The iframe is removed once the print dialog closes.
 */
export function printHtml(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      cleanup();
    }
  };
}

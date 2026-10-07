"use client";

/**
 * Reads an Anki `.apkg` export into front/back pairs, client-side.
 *
 * An `.apkg` is a zip around a SQLite database (`collection.anki2` or the
 * newer `collection.anki21`) plus media files. The database is read with
 * sql.js (SQLite compiled to wasm) and the zip with JSZip; both load lazily,
 * same reasoning as pdfjs in `lib/pdf/extract.ts` — their combined bundle is
 * close to 2MB and nobody who isn't importing a deck should pay for it.
 *
 * Deliberately narrow in what it reconstructs. Anki's real rendering pipeline
 * evaluates a note type's HTML templates (conditionals, `{{FrontSide}}`,
 * cloze deletions, per-field CSS) against arbitrary user-defined note types —
 * reproducing that is a project on its own. This instead reads the `notes`
 * table directly: one row per note, fields split on Anki's own 0x1F
 * separator, HTML stripped. For an ordinary two-field "Basic" note that IS
 * the front and back. For a Cloze note, the one case common enough to be
 * worth a special rule, `{{c1::answer}}` becomes a blank on the front and the
 * answer on the back. Anything else — note types with their own custom field
 * layouts — comes through as field 0 vs. the rest, which is not always right
 * but is never silently wrong: the student sees the card and can edit or
 * delete it like any other.
 *
 * Media (images, audio) is not imported. A reference to it survives in the
 * stripped text as the filename Anki used, which at least says something was
 * there.
 */

export const MAX_SOURCE_BYTES = 200 * 1024 * 1024; // 200MB
/** Matches the `flashcardCount` cap `firestore.rules` enforces on a set. */
export const MAX_CARDS = 500;

export interface AnkiCard {
  front: string;
  back: string;
}

export interface AnkiParseResult {
  title: string;
  cards: AnkiCard[];
  /** Notes found before the MAX_CARDS cap and before skipping unusable ones. */
  totalFound: number;
  /** Notes with no usable front or back after stripping. */
  skipped: number;
  truncated: boolean;
}

export type AnkiErrorCode =
  | "tooLarge"
  | "notAnApkg"
  | "noCollection"
  | "unsupportedFormat"
  | "corrupt"
  | "empty";

export class AnkiImportError extends Error {
  constructor(
    message: string,
    public readonly code: AnkiErrorCode,
    public readonly sizeMb?: string,
  ) {
    super(message);
    this.name = "AnkiImportError";
  }
}

const FIELD_SEPARATOR = "\x1f";

export async function parseApkg(file: File): Promise<AnkiParseResult> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AnkiImportError(
      "file too large",
      "tooLarge",
      (file.size / 1024 / 1024).toFixed(1),
    );
  }
  if (!/\.apkg$/i.test(file.name)) {
    throw new AnkiImportError("not an .apkg file", "notAnApkg");
  }

  let JSZip: typeof import("jszip");
  let initSqlJs: typeof import("sql.js");
  try {
    [{ default: JSZip }, { default: initSqlJs }] = await Promise.all([
      import("jszip"),
      import("sql.js"),
    ]);
  } catch (error) {
    throw new AnkiImportError(`reader failed to load: ${String(error)}`, "corrupt");
  }

  const zip = await JSZip.loadAsync(file).catch(() => null);
  if (!zip) {
    throw new AnkiImportError("not a valid zip archive", "corrupt");
  }

  // Newer Anki (2.1.50+) writes collection.anki21b, a zstd-compressed
  // protobuf collection — a different format entirely, not just a renamed
  // SQLite file. Detected separately so the error names the real cause
  // rather than claiming the file is corrupt.
  const entryName = ["collection.anki21", "collection.anki2"].find(
    (name) => zip.file(name) !== null,
  );
  if (!entryName) {
    if (zip.file("collection.anki21b")) {
      throw new AnkiImportError(
        "newer Anki export format is not supported",
        "unsupportedFormat",
      );
    }
    throw new AnkiImportError("no collection database found in archive", "noCollection");
  }

  const dbBytes = await zip.file(entryName)!.async("uint8array");

  const SQL = await initSqlJs({ locateFile: (f) => `/${f}` }).catch((error) => {
    throw new AnkiImportError(`sql.js failed to load: ${String(error)}`, "corrupt");
  });

  let db: InstanceType<typeof SQL.Database>;
  try {
    db = new SQL.Database(dbBytes);
  } catch (error) {
    throw new AnkiImportError(`could not open database: ${String(error)}`, "corrupt");
  }

  let rows: { columns: string[]; values: unknown[][] }[];
  try {
    rows = db.exec("SELECT flds FROM notes ORDER BY id ASC");
  } catch (error) {
    db.close();
    throw new AnkiImportError(`could not read notes: ${String(error)}`, "corrupt");
  }
  db.close();

  const fldsValues = rows[0]?.values.map((row) => String(row[0] ?? "")) ?? [];

  let skipped = 0;
  const cards: AnkiCard[] = [];
  for (const flds of fldsValues) {
    const card = toFrontBack(flds);
    if (!card) {
      skipped += 1;
      continue;
    }
    cards.push(card);
  }

  if (fldsValues.length === 0) {
    throw new AnkiImportError("deck has no notes", "empty");
  }

  const truncated = cards.length > MAX_CARDS;

  return {
    title: titleFromApkgFilename(file.name),
    cards: truncated ? cards.slice(0, MAX_CARDS) : cards,
    totalFound: fldsValues.length,
    skipped,
    truncated,
  };
}

const CLOZE_PATTERN = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;

/** Exported for `tests/anki.test.mjs` — the one part of this module that is
    pure data transformation and worth checking without a real .apkg fixture. */
export function toFrontBack(flds: string): AnkiCard | null {
  const fields = flds.split(FIELD_SEPARATOR).map(stripHtml);

  // Cloze note types put the whole sentence in field 0 with {{c1::word}}
  // markers. A real Cloze renders one card per blank; this makes one card
  // per NOTE instead, blanking every marker at once — a coarser split than
  // Anki's own, but a usable one, and simple to reason about without
  // tracking which card index corresponds to which marker.
  if (CLOZE_PATTERN.test(fields[0] ?? "")) {
    CLOZE_PATTERN.lastIndex = 0;
    const front = fields[0].replace(CLOZE_PATTERN, "____");
    const back = fields[0].replace(CLOZE_PATTERN, "$1");
    return finalise(front, back);
  }

  const front = fields[0] ?? "";
  // More than two fields (e.g. a note type with its own "Extra" or "Source"
  // field) folds everything past the first into the back, in order — losing
  // the original layout, but keeping the content rather than dropping it.
  const back = fields.slice(1).filter(Boolean).join("\n\n");
  return finalise(front, back);
}

/** `firestore.rules`' validFlashcard caps front at 400 chars, back at 1200. */
function finalise(front: string, back: string): AnkiCard | null {
  const f = front.trim().slice(0, 400);
  const b = back.trim().slice(0, 1200);
  if (!f || !b) return null;
  return { front: f, back: b };
}

export function stripHtml(field: string): string {
  return field
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleFromApkgFilename(filename: string): string {
  return (
    filename
      .replace(/\.apkg$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 140) || "Imported deck"
  );
}

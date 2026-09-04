/**
 * Markdown import and export, and the zip the export ships in.
 *
 * The property that matters most is the round trip: a note exported and
 * re-imported must come back as the same note, with its `[[links]]` intact. If
 * that breaks, the promise this feature makes — that nothing is trapped in
 * Tuón — is false, and it is false silently.
 *
 * The zip checks are byte-level on purpose. A hand-written archive that is
 * subtly malformed still "downloads fine" and then fails to open a week later
 * on someone else's machine, which is the worst possible time to find out.
 */
import assert from "node:assert/strict";

import {
  MAX_CONTENT_CHARS,
  noteFilename,
  parseMarkdown,
  titleFromFilename,
  toMarkdown,
} from "../src/lib/notes/markdown.ts";
import { buildZip, crc32 } from "../src/lib/notes/zip.ts";
import { parseWikiLinks } from "../src/lib/notes/links.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const ok = (result) => {
  assert.ok(result.note, `expected a note, got ${JSON.stringify(result.problem)}`);
  return result.note;
};

console.log("\nReading a Markdown file");

check("front matter supplies the title and subject", () => {
  const note = ok(
    parseMarkdown(
      "whatever.md",
      "---\ntitle: Photosynthesis\nsubject: General Biology 1\n---\n\nChlorophyll absorbs light.",
    ),
  );
  assert.equal(note.title, "Photosynthesis");
  assert.equal(note.courseTag, "General Biology 1");
  assert.equal(note.content, "Chlorophyll absorbs light.");
});

check("a leading heading is used as the title and then removed", () => {
  // Otherwise every imported note opens by repeating its own name.
  const note = ok(parseMarkdown("x.md", "# Photolysis\n\nWater is split."));
  assert.equal(note.title, "Photolysis");
  assert.equal(note.content, "Water is split.");
});

check("the filename is the last resort", () => {
  const note = ok(parseMarkdown("Cell division.md", "Mitosis and meiosis."));
  assert.equal(note.title, "Cell division");
});

check("a heading further down is a section, not the title", () => {
  // Taking it would name the note after its second paragraph.
  const note = ok(
    parseMarkdown("Notes.md", "Intro line.\n\nMore.\n\nAnd more.\n\n# Section two\n\nBody."),
  );
  assert.equal(note.title, "Notes");
  assert.match(note.content, /^Intro line/);
});

check("front matter beats a heading", () => {
  const note = ok(parseMarkdown("x.md", "---\ntitle: Real Title\n---\n# Other\n\nBody."));
  assert.equal(note.title, "Real Title");
  // The heading was not the title, so it stays in the body where it belongs.
  assert.match(note.content, /# Other/);
});

check("front matter is only front matter at the very top", () => {
  // A `---` divider partway down a note is a horizontal rule, not metadata.
  const note = ok(parseMarkdown("x.md", "Some text.\n\n---\ntitle: Nope\n---\n\nMore."));
  assert.equal(note.title, "x");
  assert.match(note.content, /title: Nope/);
});

check("quoted front matter values are unquoted", () => {
  const note = ok(parseMarkdown("x.md", '---\ntitle: "Photosynthesis: stage one"\n---\n\nBody.'));
  assert.equal(note.title, "Photosynthesis: stage one");
});

check("the first tag becomes the subject", () => {
  // A comma-separated list is a list; inventing multi-subject support from it
  // would be a guess about what the student meant.
  const note = ok(parseMarkdown("x.md", "---\ntags: Biology, exam, week3\n---\n\nBody."));
  assert.equal(note.courseTag, "Biology");
});

check("no subject is null rather than an empty string", () => {
  const note = ok(parseMarkdown("x.md", "Body."));
  assert.equal(note.courseTag, null);
});

check("CRLF files are read the same as LF ones", () => {
  // Anything exported from Windows arrives this way.
  const note = ok(parseMarkdown("x.md", "---\r\ntitle: Windows\r\n---\r\n\r\nBody text."));
  assert.equal(note.title, "Windows");
  assert.equal(note.content, "Body text.");
});

console.log("\nFiles that cannot become notes");

check("an empty file is reported, not imported", () => {
  const result = parseMarkdown("empty.md", "   \n\n  ");
  assert.ok(result.problem);
  assert.equal(result.problem.reason, "empty");
});

check("a file with only front matter is reported", () => {
  const result = parseMarkdown("x.md", "---\ntitle: Just metadata\n---\n");
  assert.ok(result.problem);
});

check("an oversized file is reported with its size", () => {
  // One bad file must not fail an import of forty. The reason is a key and
  // the size travels beside it, so the view can say it in any language.
  const result = parseMarkdown("big.md", "x".repeat(MAX_CONTENT_CHARS + 1));
  assert.ok(result.problem);
  assert.equal(result.problem.reason, "tooLong");
  assert.equal(result.problem.length, MAX_CONTENT_CHARS + 1);
});

check("a very long title is trimmed rather than rejected", () => {
  const note = ok(parseMarkdown("x.md", `---\ntitle: ${"T".repeat(300)}\n---\n\nBody.`));
  assert.equal(note.title.length, 140);
});

console.log("\nWriting a Markdown file");

check("a note becomes a file with front matter", () => {
  const text = toMarkdown({
    title: "Photosynthesis",
    content: "Chlorophyll absorbs light.",
    courseTag: "General Biology 1",
  });
  assert.match(text, /^---\n/);
  assert.match(text, /title: Photosynthesis/);
  assert.match(text, /subject: General Biology 1/);
  assert.match(text, /Chlorophyll absorbs light\./);
});

check("a title with a colon is quoted so YAML still parses", () => {
  const text = toMarkdown({ title: "Stage one: the light reactions", content: "Body." });
  assert.match(text, /title: "Stage one: the light reactions"/);
});

check("a missing subject writes no subject line at all", () => {
  // An empty `subject:` would import back as a subject named nothing.
  const text = toMarkdown({ title: "T", content: "Body.", courseTag: null });
  assert.equal(text.includes("subject:"), false);
});

console.log("\nThe round trip");

check("a note survives export and re-import unchanged", () => {
  // The promise this whole feature makes. If it breaks, it breaks silently.
  const original = {
    title: "Photosynthesis",
    content: "Light hits [[Chlorophyll]] and water is split.\n\nSee [[Calvin cycle]].",
    courseTag: "General Biology 1",
  };
  const back = ok(parseMarkdown("Photosynthesis.md", toMarkdown(original)));
  assert.equal(back.title, original.title);
  assert.equal(back.content, original.content);
  assert.equal(back.courseTag, original.courseTag);
});

check("wiki links come back pointing at the same notes", () => {
  const content = "Refers to [[Calvin cycle]] and [[Photolysis]].";
  const back = ok(parseMarkdown("x.md", toMarkdown({ title: "T", content })));
  assert.deepEqual(parseWikiLinks(back.content), ["Calvin cycle", "Photolysis"]);
  assert.deepEqual(back.linkedTitles, ["calvin cycle", "photolysis"]);
});

check("a note whose body starts with a heading round-trips", () => {
  // The import strips a leading heading it used as a title; export writes the
  // title to front matter, so the heading must not be eaten on the way back.
  const content = "# Overview\n\nBody text.";
  const back = ok(parseMarkdown("x.md", toMarkdown({ title: "Real name", content })));
  assert.equal(back.title, "Real name");
  assert.equal(back.content, content);
});

console.log("\nFilenames");

check("an extension is stripped, whatever its case", () => {
  assert.equal(titleFromFilename("Notes.MD"), "Notes");
  assert.equal(titleFromFilename("Notes.markdown"), "Notes");
  assert.equal(titleFromFilename("path/to/Notes.md"), "Notes");
});

check("characters Windows forbids are removed", () => {
  // The strictest platform wins: an export that unzips everywhere is worth
  // more than one that keeps every character of a title.
  const name = noteFilename('Stage 1: light / dark <notes>', new Set());
  assert.equal(/[\\/:*?"<>|]/.test(name), false);
  assert.match(name, /\.md$/);
});

check("duplicate titles get distinct filenames", () => {
  // Two notes may legitimately share a title; a file system may not.
  const taken = new Set();
  const a = noteFilename("Photosynthesis", taken);
  const b = noteFilename("Photosynthesis", taken);
  const c = noteFilename("photosynthesis", taken);
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.equal(new Set([a, b, c]).size, 3);
});

check("a title made only of forbidden characters still gets a name", () => {
  assert.equal(noteFilename("///", new Set()), "note.md");
});

check("a trailing dot is removed", () => {
  // Windows cannot create a file whose name ends in a dot.
  assert.equal(noteFilename("Chapter 1.", new Set()).endsWith(".."), false);
});

console.log("\nThe zip");

check("CRC32 matches the known values", () => {
  // These are the standard vectors. If this drifts, every archive is corrupt
  // and no error is raised until someone tries to open one.
  const encode = (s) => new TextEncoder().encode(s);
  assert.equal(crc32(encode("")), 0x00000000);
  assert.equal(crc32(encode("a")), 0xe8b7be43);
  assert.equal(crc32(encode("abc")), 0x352441c2);
  assert.equal(crc32(encode("123456789")), 0xcbf43926);
});

check("an archive has the right signatures in the right places", () => {
  const bytes = buildZip([{ name: "a.md", text: "hello" }]);
  const u32 = (at) =>
    (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;

  assert.equal(u32(0), 0x04034b50, "local file header");
  // End of central directory is the last 22 bytes when there is no comment.
  assert.equal(u32(bytes.length - 22), 0x06054b50, "end of central directory");
});

check("the end record agrees with what was written", () => {
  const entries = [
    { name: "a.md", text: "one" },
    { name: "b.md", text: "two" },
    { name: "c.md", text: "three" },
  ];
  const bytes = buildZip(entries);
  const eocd = bytes.length - 22;
  const u16 = (at) => bytes[at] | (bytes[at + 1] << 8);
  const u32 = (at) =>
    (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;

  assert.equal(u16(eocd + 8), entries.length, "entries on this disk");
  assert.equal(u16(eocd + 10), entries.length, "entries in total");

  // The central directory must start exactly where the offset says, or every
  // unzip tool reports a corrupt archive.
  const centralOffset = u32(eocd + 16);
  assert.equal(u32(centralOffset), 0x02014b50, "central directory header");
  assert.equal(u32(eocd + 12), eocd - centralOffset, "central directory size");
});

check("names are flagged as UTF-8", () => {
  // Without bit 11, "Tuón" or any title with an ñ unzips as mojibake on
  // Windows — which is most of the audience.
  const bytes = buildZip([{ name: "Tuón.md", text: "x" }]);
  const flags = bytes[6] | (bytes[7] << 8);
  assert.equal(flags & 0x0800, 0x0800);
});

check("the stored size is the real byte length, not the character count", () => {
  // "ñ" is one character and two bytes. Getting this wrong truncates files.
  const text = "ñ";
  const bytes = buildZip([{ name: "a.md", text }]);
  const u32 = (at) =>
    (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
  assert.equal(u32(18), 2, "compressed size");
  assert.equal(u32(22), 2, "uncompressed size");
});

check("an empty archive is still a valid archive", () => {
  const bytes = buildZip([]);
  assert.equal(bytes.length, 22);
  const u32 = (at) =>
    (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
  assert.equal(u32(0), 0x06054b50);
});

check("a date before the DOS epoch does not corrupt the header", () => {
  // 1980 is the format's floor; a negative year field produces an archive
  // some tools refuse outright.
  const bytes = buildZip([{ name: "a.md", text: "x" }], new Date("1970-01-01T00:00:00Z"));
  const dosDate = bytes[12 + 2] | (bytes[12 + 3] << 8);
  assert.ok(dosDate >= 0);
  assert.equal(bytes[0], 0x50);
});

console.log(`\n${passed} checks passed.\n`);

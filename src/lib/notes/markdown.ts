/**
 * Markdown in and out.
 *
 * The request behind this was "local files, like Obsidian". A web page cannot
 * watch a folder — the File System Access API is Chrome-only, needs permission
 * re-granted every session, and does not exist on iOS Safari at all, which is
 * a large share of Philippine students. What is achievable is the part that
 * actually matters: a real door in and a real door out. Drop a folder of
 * Markdown in and get notes; take the whole library out as Markdown and
 * nothing is trapped here.
 *
 * `[[wiki links]]` need no special handling in either direction — Tuón already
 * stores them in the note body and resolves them by title, which is exactly
 * what Obsidian does. They survive a round trip untouched, which is the single
 * most important property of this module.
 *
 * Pure. No React, no Firestore, no DOM.
 */

import { parseWikiLinks } from "@/lib/notes/links";

/** Mirrors the ceilings in firestore.rules. */
export const MAX_TITLE_CHARS = 140;
export const MAX_CONTENT_CHARS = 120_000;

export interface ParsedNote {
  title: string;
  content: string;
  courseTag: string | null;
  /** Titles this note links to, for the graph. */
  linkedTitles: string[];
}

export interface ParseProblem {
  filename: string;
  reason: string;
}

/**
 * YAML front matter, as much of it as is worth reading.
 *
 * Deliberately not a YAML parser. Obsidian front matter in practice is a flat
 * list of `key: value` lines, and pulling in a parser to read three of them
 * would add a dependency that has to be trusted with arbitrary user files.
 * Anything it does not understand is left alone rather than guessed at.
 */
function splitFrontMatter(text: string): { meta: Map<string, string>; body: string } {
  const meta = new Map<string, string>();

  // Must be the very first thing in the file, as in the spec everyone follows.
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { meta, body: text };

  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    const value = pair[2].trim().replace(/^["']|["']$/g, "");
    if (value) meta.set(pair[1].toLowerCase(), value);
  }

  return { meta, body: text.slice(match[0].length) };
}

/** "Photosynthesis notes.md" -> "Photosynthesis notes". */
export function titleFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  return base.replace(/\.(md|markdown|txt)$/i, "").trim();
}

/**
 * The first `# Heading`, if the file opens with one.
 *
 * Only the first line or two: a heading further down is a section, not the
 * note's name, and taking it would title the note after its second paragraph.
 */
function leadingHeading(body: string): string | null {
  const match = /^\s*#\s+(.+)$/m.exec(body.split(/\r?\n/).slice(0, 3).join("\n"));
  return match ? match[1].trim() : null;
}

/**
 * Turns one file into a note.
 *
 * Title comes from front matter, then a leading heading, then the filename —
 * the order of how deliberate each one is. Returns a problem rather than
 * throwing, because an import of forty files should not fail on one of them.
 */
export function parseMarkdown(
  filename: string,
  text: string,
): { note: ParsedNote } | { problem: ParseProblem } {
  const { meta, body } = splitFrontMatter(text);

  const heading = leadingHeading(body);
  const rawTitle = meta.get("title") ?? heading ?? titleFromFilename(filename);
  const title = rawTitle.trim().slice(0, MAX_TITLE_CHARS);

  if (!title) {
    return { problem: { filename, reason: "No title could be worked out" } };
  }

  // If the title came from a leading heading, drop that heading from the body:
  // keeping it means every imported note opens by repeating its own name.
  let content = body;
  if (heading && rawTitle === heading) {
    content = body.replace(/^\s*#\s+.+(\r?\n)?/, "");
  }
  content = content.replace(/^\s+/, "").replace(/\s+$/, "");

  if (!content) {
    return { problem: { filename, reason: "The file is empty" } };
  }
  if (content.length > MAX_CONTENT_CHARS) {
    return {
      problem: {
        filename,
        reason: `Too long — ${content.length.toLocaleString()} characters, limit is ${MAX_CONTENT_CHARS.toLocaleString()}`,
      },
    };
  }

  const subject = meta.get("subject") ?? meta.get("course") ?? meta.get("tags") ?? null;

  return {
    note: {
      title,
      content,
      // A `tags: a, b` line is a list; only the first is a subject here, and
      // inventing multi-subject support from a comma would be a guess.
      courseTag: subject ? subject.split(",")[0].trim().slice(0, 80) || null : null,
      linkedTitles: parseWikiLinks(content).map((t) => t.trim().toLowerCase()),
    },
  };
}

export interface ExportableNote {
  title: string;
  content: string;
  courseTag?: string | null;
  createdAt?: { toDate: () => Date } | null;
}

/**
 * One note as a Markdown file.
 *
 * Front matter carries what Markdown itself cannot: the subject, and when it
 * was written. The body is the note exactly as stored, `[[links]]` and all,
 * so re-importing the file rebuilds the same note and the same graph.
 */
export function toMarkdown(note: ExportableNote): string {
  const lines = ["---", `title: ${escapeYaml(note.title)}`];

  if (note.courseTag) lines.push(`subject: ${escapeYaml(note.courseTag)}`);

  const created = note.createdAt?.toDate?.();
  if (created instanceof Date && !Number.isNaN(created.getTime())) {
    lines.push(`created: ${created.toISOString().slice(0, 10)}`);
  }

  lines.push("---", "", note.content.trim(), "");
  return lines.join("\n");
}

/**
 * Quotes only when the value would otherwise break the block.
 *
 * A colon or a leading bracket turns a plain scalar into something a YAML
 * reader misparses, and an unquoted `#` starts a comment.
 */
function escapeYaml(value: string): string {
  const flat = value.replace(/\r?\n/g, " ").trim();
  return /[:#[\]{}"']/.test(flat) ? `"${flat.replace(/"/g, '\\"')}"` : flat;
}

/**
 * A filename that will not collide or break on any of the three big platforms.
 *
 * Windows reserves more characters than the others and forbids a trailing dot,
 * so the strictest rules win — an export that unzips cleanly everywhere is
 * worth more than one that keeps every character of a title.
 */
export function noteFilename(title: string, taken: Set<string>): string {
  const stem =
    title
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.+$/, "")
      .slice(0, 80) || "note";

  let candidate = `${stem}.md`;
  let n = 2;
  // Two notes may legitimately share a title; the file system may not.
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${stem} (${n}).md`;
    n += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

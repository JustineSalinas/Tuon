import type { Note } from "@/lib/types";

/**
 * Obsidian-style `[[wiki links]]` between notes.
 *
 * Links are resolved by *title*, not by id, so a link keeps working while the
 * student is still typing the note it points at — and a link to a note that
 * does not exist yet is a feature (it becomes a "create this" affordance),
 * not an error.
 *
 * Resolution happens on the client from the already-loaded notes list. That
 * costs nothing extra up to the low thousands of notes; past that this should
 * move to a stored `linkedTitles` array with an array-contains query.
 */

/** Matches [[Title]] but not [[ ]] or nested brackets. */
const WIKI_LINK = /\[\[([^[\]\n]+)]]/g;

/** Titles are matched case- and whitespace-insensitively. */
export function normaliseTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Every distinct title referenced by this content, in order of appearance. */
export function parseWikiLinks(content: string): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const match of content.matchAll(WIKI_LINK)) {
    const raw = match[1].trim();
    if (!raw) continue;
    const key = normaliseTitle(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(raw);
  }
  return titles;
}

export interface ResolvedLink {
  /** The title as written inside the brackets. */
  title: string;
  /** The note it resolves to, or null when no note has that title yet. */
  note: Note | null;
}

export function resolveLinks(content: string, allNotes: Note[]): ResolvedLink[] {
  const byTitle = titleIndex(allNotes);
  return parseWikiLinks(content).map((title) => ({
    title,
    note: byTitle.get(normaliseTitle(title)) ?? null,
  }));
}

/** Notes that link *to* the given note. */
export function findBacklinks(target: Note, allNotes: Note[]): Note[] {
  const key = normaliseTitle(target.title);
  if (!key) return [];

  return allNotes.filter((note) => {
    if (note.id === target.id) return false;
    return parseWikiLinks(note.content).some((t) => normaliseTitle(t) === key);
  });
}

export function titleIndex(notes: Note[]): Map<string, Note> {
  const map = new Map<string, Note>();
  for (const note of notes) {
    const key = normaliseTitle(note.title);
    // First writer wins, so a duplicate title does not shadow the original.
    if (key && !map.has(key)) map.set(key, note);
  }
  return map;
}

export interface GraphData {
  nodes: { id: string; title: string; degree: number; courseTag: string | null }[];
  edges: { source: string; target: string }[];
}

/** The whole link graph, for the graph view. Unresolved links are omitted. */
export function buildGraph(notes: Note[]): GraphData {
  const byTitle = titleIndex(notes);
  const degree = new Map<string, number>();
  const edges: { source: string; target: string }[] = [];
  const seenEdge = new Set<string>();

  for (const note of notes) {
    for (const title of parseWikiLinks(note.content)) {
      const target = byTitle.get(normaliseTitle(title));
      if (!target || target.id === note.id) continue;

      // Collapse A->B and B->A into one undirected edge.
      const key = [note.id, target.id].sort().join("|");
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);

      edges.push({ source: note.id, target: target.id });
      degree.set(note.id, (degree.get(note.id) ?? 0) + 1);
      degree.set(target.id, (degree.get(target.id) ?? 0) + 1);
    }
  }

  return {
    nodes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      degree: degree.get(note.id) ?? 0,
      courseTag: note.courseTag,
    })),
    edges,
  };
}

/**
 * If the caret sits inside an unclosed `[[`, returns what has been typed so
 * far plus where it starts — this is what drives the autocomplete popover.
 */
export function activeLinkQuery(
  content: string,
  caret: number,
): { query: string; start: number } | null {
  const before = content.slice(0, caret);
  const open = before.lastIndexOf("[[");
  if (open === -1) return null;

  const between = before.slice(open + 2);
  // Already closed, or ran onto another line — not an active link.
  if (between.includes("]]") || between.includes("\n")) return null;

  return { query: between, start: open };
}

/** Replaces the in-progress `[[query` at `start` with a completed link. */
export function completeLink(
  content: string,
  start: number,
  caret: number,
  title: string,
): { content: string; caret: number } {
  const inserted = `[[${title}]]`;
  return {
    content: content.slice(0, start) + inserted + content.slice(caret),
    caret: start + inserted.length,
  };
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, CornerUpLeft, FileText, Link2, Plus } from "lucide-react";

import { findBacklinks, resolveLinks } from "@/lib/notes/links";
import type { Note } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

/**
 * Outgoing links and backlinks for the current note.
 *
 * Backlinks are the half that makes linking worth doing — seeing "3 notes
 * point here" is what turns a pile of notes into a connected reviewer.
 */
export function NoteLinksPanel({
  note,
  content,
  allNotes,
}: {
  /** Null while a brand-new note has not been saved yet. */
  note: Note | null;
  /** Live editor content, so links appear as they are typed. */
  content: string;
  allNotes: Note[];
}) {
  const outgoing = useMemo(() => resolveLinks(content, allNotes), [content, allNotes]);
  const backlinks = useMemo(
    () => (note ? findBacklinks({ ...note, title: note.title }, allNotes) : []),
    [note, allNotes],
  );

  if (outgoing.length === 0 && backlinks.length === 0) {
    return (
      <section className="mt-8 border-t pt-6">
        <div className="text-muted-foreground flex items-start gap-2.5 text-sm">
          <Link2 className="mt-0.5 size-4 shrink-0" />
          <p className="leading-relaxed">
            Type <code className="bg-muted rounded px-1 py-0.5 text-xs">[[</code> to
            link another note. Linked notes show up here, along with anything that
            links back.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6 border-t pt-6">
      {outgoing.length > 0 ? (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ArrowUpRight className="text-muted-foreground size-3.5" />
            Links from this note
            <Badge variant="secondary" className="tabular-nums">
              {outgoing.length}
            </Badge>
          </h2>
          <ul className="mt-3 grid gap-1.5">
            {outgoing.map((link) => (
              <li key={link.title}>
                {link.note ? (
                  <Link
                    href={`/app/notes/${link.note.id}`}
                    className="hover:border-primary/40 hover:bg-accent/30 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors"
                  >
                    <FileText className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">{link.note.title}</span>
                  </Link>
                ) : (
                  <Link
                    href={`/app/notes/new?title=${encodeURIComponent(link.title)}`}
                    className="text-muted-foreground hover:border-primary/40 hover:text-foreground flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors"
                  >
                    <Plus className="size-3.5 shrink-0" />
                    <span className="truncate">{link.title}</span>
                    <span className="ml-auto shrink-0 text-xs">not created yet</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {backlinks.length > 0 ? (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <CornerUpLeft className="text-muted-foreground size-3.5" />
            Linked from
            <Badge variant="secondary" className="tabular-nums">
              {backlinks.length}
            </Badge>
          </h2>
          <ul className="mt-3 grid gap-1.5">
            {backlinks.map((source) => (
              <li key={source.id}>
                <Link
                  href={`/app/notes/${source.id}`}
                  className="hover:border-primary/40 hover:bg-accent/30 block rounded-lg border px-3 py-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-sm">
                    <FileText className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate font-medium">{source.title}</span>
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-1 pl-6 text-xs">
                    {excerptAround(source.content, note?.title ?? "")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** A short window of text around the mention, so backlinks carry context. */
function excerptAround(content: string, title: string): string {
  if (!title) return content.slice(0, 120);
  const index = content.toLowerCase().indexOf(`[[${title.toLowerCase()}`);
  if (index === -1) return content.slice(0, 120);
  const start = Math.max(0, index - 60);
  return `${start > 0 ? "…" : ""}${content.slice(start, index + title.length + 60).trim()}`;
}

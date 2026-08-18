"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FileText, Plus, Search, Sparkles } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { usePagedNotes } from "@/lib/hooks/use-firestore";
import { LoadMore } from "@/components/app/load-more";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotesPage() {
  const { user } = useAuth();
  const { data: notes, loading, hasMore, loadMore } = usePagedNotes(user?.uid);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(term) ||
        note.courseTag?.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term),
    );
  }, [notes, search]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Notes</h1>
        <Button render={<Link href="/app/notes/new" />}>
            <Plus />
            New note
          </Button>
      </header>

      {notes.length > 0 ? (
        <div className="relative mt-6">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your notes"
            className="pl-9"
          />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyNotes />
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center text-sm">
          No notes match “{search}”.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {filtered.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
            >
              <Link
                href={`/app/notes/${note.id}`}
                className="hover:border-primary/40 hover:bg-accent/30 block rounded-xl border p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium">{note.title}</h2>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
                      {note.content.slice(0, 220) || "Empty note"}
                    </p>
                  </div>
                  {note.courseTag ? (
                    <Badge variant="secondary" className="shrink-0">
                      {note.courseTag}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-muted-foreground mt-2.5 flex items-center gap-3 text-xs">
                  <span className="tabular-nums">
                    {note.content.trim().length.toLocaleString()} characters
                  </span>
                  <span>{formatDate(note.createdAt?.toDate?.())}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && notes.length > 0 ? (
        <LoadMore
          hasMore={hasMore}
          loadMore={loadMore}
          loadedCount={notes.length}
          searching={search.trim().length > 0}
          noun="notes"
        />
      ) : null}
    </main>
  );
}

function EmptyNotes() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed py-14 text-center">
      <div className="bg-secondary mx-auto grid size-12 place-items-center rounded-full">
        <FileText className="text-muted-foreground size-5" />
      </div>
      <h2 className="font-display mt-4 text-lg font-semibold tracking-tight">
        No notes yet
      </h2>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm leading-relaxed">
        Paste in your lecture notes or a reviewer, and Tuón will turn them into
        flashcards and a quiz.
      </p>
      <Button className="mt-6" render={<Link href="/app/notes/new" />}>
          <Sparkles />
          Create your first note
        </Button>
    </div>
  );
}

function formatDate(date: Date | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

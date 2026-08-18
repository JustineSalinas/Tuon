"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Layers, Plus, Search, Sparkles } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { usePagedStudySets, useReviewLogs } from "@/lib/hooks/use-firestore";
import { LoadMore } from "@/components/app/load-more";
import { useNow } from "@/lib/hooks/use-now";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudySetsPage() {
  const { user } = useAuth();
  const { data: sets, loading, hasMore, loadMore } = usePagedStudySets(user?.uid);
  const { logs } = useReviewLogs(user?.uid);
  const [search, setSearch] = useState("");
  const now = useNow(60_000);

  const withStats = useMemo(() => {
    const bySet = new Map<string, { due: number; reviewed: number }>();
    for (const log of logs) {
      const entry = bySet.get(log.studySetId) ?? { due: 0, reviewed: 0 };
      entry.reviewed += 1;
      if ((log.nextReviewAt?.toDate?.().getTime() ?? 0) <= now) entry.due += 1;
      bySet.set(log.studySetId, entry);
    }

    const term = search.trim().toLowerCase();
    return sets
      .filter(
        (set) =>
          !term ||
          set.title.toLowerCase().includes(term) ||
          set.courseTag?.toLowerCase().includes(term),
      )
      .map((set) => {
        const entry = bySet.get(set.id) ?? { due: 0, reviewed: 0 };
        return {
          set,
          due: entry.due,
          fresh: Math.max(0, (set.flashcardCount ?? 0) - entry.reviewed),
        };
      });
  }, [sets, logs, search, now]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Study sets</h1>
        <Button render={<Link href="/app/notes/new" />}>
            <Plus />
            New note
          </Button>
      </header>

      {sets.length > 0 ? (
        <div className="relative mt-6">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search study sets"
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
      ) : sets.length === 0 ? (
        <EmptySets />
      ) : withStats.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-center text-sm">
          No study sets match “{search}”.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {withStats.map(({ set, due, fresh }, index) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
            >
              <Link
                href={`/app/sets/${set.id}`}
                className="hover:border-primary/40 hover:bg-accent/30 flex items-center gap-3 rounded-xl border p-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-medium">{set.title}</h2>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                    {set.courseTag ? <span>{set.courseTag}</span> : null}
                    <span>{set.flashcardCount} cards</span>
                    <span>·</span>
                    <span>{set.quizQuestionCount} questions</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {due > 0 ? (
                    <Badge className="bg-primary/15 text-primary border-transparent tabular-nums">
                      {due} due
                    </Badge>
                  ) : null}
                  {fresh > 0 ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {fresh} new
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && sets.length > 0 ? (
        <LoadMore
          hasMore={hasMore}
          loadMore={loadMore}
          loadedCount={sets.length}
          searching={search.trim().length > 0}
          noun="study sets"
        />
      ) : null}
    </main>
  );
}

function EmptySets() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed py-14 text-center">
      <div className="bg-secondary mx-auto grid size-12 place-items-center rounded-full">
        <Layers className="text-muted-foreground size-5" />
      </div>
      <h2 className="font-display mt-4 text-lg font-semibold tracking-tight">
        No study sets yet
      </h2>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm leading-relaxed">
        Write a note, then hit Generate study set. Your flashcards and quiz will
        show up here.
      </p>
      <Button className="mt-6" render={<Link href="/app/notes/new" />}>
          <Sparkles />
          Start a note
        </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Link2, Network } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useNotes } from "@/lib/hooks/use-firestore";
import { LinkGraph } from "@/components/notes/link-graph";
import { buildGraph } from "@/lib/notes/links";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function GraphPage() {
  const { user } = useAuth();
  const { data: notes, loading } = useNotes(user?.uid);

  const graph = buildGraph(notes);
  const linkedCount = new Set(graph.edges.flatMap((e) => [e.source, e.target])).size;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Graph</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {linkedCount > 0
            ? `${linkedCount} connected ${linkedCount === 1 ? "note" : "notes"} · ${
                graph.edges.length
              } ${graph.edges.length === 1 ? "link" : "links"}`
            : "How your notes connect to each other."}
        </p>
      </header>

      {loading ? (
        <Skeleton className="mt-6 h-[62vh] w-full rounded-2xl" />
      ) : graph.edges.length === 0 ? (
        <EmptyGraph hasNotes={notes.length > 0} />
      ) : (
        <div className="bg-card mt-6 overflow-hidden rounded-2xl border">
          <LinkGraph notes={notes} />
        </div>
      )}
    </main>
  );
}

function EmptyGraph({ hasNotes }: { hasNotes: boolean }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed py-16 text-center">
      <div className="bg-secondary mx-auto grid size-12 place-items-center rounded-full">
        <Network className="text-muted-foreground size-5" />
      </div>
      <h2 className="font-display mt-4 text-lg font-semibold tracking-tight">
        Nothing linked yet
      </h2>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm leading-relaxed">
        Type <code className="bg-muted rounded px-1 py-0.5 text-xs">[[</code> inside a
        note to link it to another one. Concepts that connect across subjects show up
        here as a map.
      </p>
      <Button className="mt-6" render={<Link href={hasNotes ? "/app/notes" : "/app/notes/new"} />}>
        <Link2 />
        {hasNotes ? "Open your notes" : "Write your first note"}
      </Button>
    </div>
  );
}

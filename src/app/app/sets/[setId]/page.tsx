"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Layers,
  ListChecks,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { deleteStudySetDeep } from "@/lib/firebase/delete-set";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useFlashcards,
  useQuizQuestions,
  useReviewLogs,
  useStudySet,
} from "@/lib/hooks/use-firestore";
import { ExportMenu } from "@/components/study/export-menu";
import { ShareButton } from "@/components/study/share-button";
import { useNow } from "@/lib/hooks/use-now";
import { formatInterval } from "@/lib/srs/sm2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function StudySetPage() {
  const params = useParams<{ setId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: studySet, loading, notFound } = useStudySet(user?.uid, params.setId);
  const { data: cards, loading: cardsLoading } = useFlashcards(user?.uid, params.setId);
  const { data: quizQuestions } = useQuizQuestions(user?.uid, params.setId);
  const { byFlashcardId } = useReviewLogs(user?.uid);
  const [deleting, setDeleting] = useState(false);
  const now = useNow(60_000);

  const stats = useMemo(() => {
    let due = 0;
    let fresh = 0;
    let scheduled = 0;

    for (const card of cards) {
      const log = byFlashcardId.get(card.id);
      if (!log) fresh += 1;
      else if ((log.nextReviewAt?.toDate?.().getTime() ?? 0) <= now) due += 1;
      else scheduled += 1;
    }
    return { due, fresh, scheduled, pending: due + fresh };
  }, [cards, byFlashcardId, now]);

  async function handleDelete() {
    if (!user || !studySet) return;
    setDeleting(true);
    try {
      await deleteStudySetDeep(user.uid, studySet.id);
      toast.success("Study set deleted.");
      router.replace("/app/sets");
    } catch {
      toast.error("Could not delete that study set.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="mt-4 h-24 w-full rounded-xl" />
      </main>
    );
  }

  if (notFound || !studySet) {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Study set not found
          </h1>
          <Button className="mt-6" render={<Link href="/app/sets" />}>Back to study sets</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/app/sets" />}>
            <ArrowLeft />
            Study sets
          </Button>

        <div className="ml-auto flex items-center gap-2">
          <ExportMenu
            payload={
              studySet ? { studySet, flashcards: cards, quizQuestions } : null
            }
          />
          <ShareButton studySet={studySet} />
        </div>

        <Dialog>
          <DialogTrigger render={<Button variant="ghost" size="icon" className="ml-auto" aria-label="Delete set" />}>
              <Trash2 className="text-muted-foreground size-4" />
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this study set?</DialogTitle>
              <DialogDescription>
                Its flashcards, quiz, and review history will no longer be reachable.
                The note it came from stays.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete set
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3"
      >
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
          {studySet.title}
        </h1>
        <div className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-2 text-sm">
          {studySet.courseTag ? (
            <Badge variant="secondary">{studySet.courseTag}</Badge>
          ) : null}
          <span>{studySet.flashcardCount} flashcards</span>
          <span>·</span>
          <span>{studySet.quizQuestionCount} quiz questions</span>
          {studySet.noteId ? (
            <>
              <span>·</span>
              <Link
                href={`/app/notes/${studySet.noteId}`}
                className="hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4"
              >
                <FileText className="size-3" />
                source note
              </Link>
            </>
          ) : null}
        </div>
      </motion.header>

      {/* Primary actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/app/sets/${studySet.id}/review`}
          className="border-primary/30 bg-accent/40 hover:border-primary/60 group rounded-2xl border p-5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <BookOpen className="text-primary size-5" />
            {stats.pending > 0 ? (
              <Badge className="bg-primary text-primary-foreground border-transparent tabular-nums">
                {stats.pending}
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 font-medium">Review flashcards</div>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {stats.pending > 0
              ? `${stats.due} due, ${stats.fresh} new`
              : "All caught up for now"}
          </p>
        </Link>

        <Link
          href={`/app/sets/${studySet.id}/quiz`}
          className="hover:border-primary/40 hover:bg-accent/20 group rounded-2xl border p-5 transition-colors"
        >
          <ListChecks className="text-muted-foreground size-5" />
          <div className="mt-3 font-medium">Take the quiz</div>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {studySet.quizQuestionCount} multiple-choice questions
          </p>
        </Link>
      </div>

      {/* Progress */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatTile label="Due now" value={stats.due} />
        <StatTile label="Never seen" value={stats.fresh} />
        <StatTile label="Scheduled" value={stats.scheduled} />
      </div>

      {/* Card list */}
      <Tabs defaultValue="cards" className="mt-10">
        <TabsList>
          <TabsTrigger value="cards">
            <Layers className="size-3.5" />
            Flashcards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {cardsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="divide-y rounded-xl border">
              {cards.map((card) => {
                const log = byFlashcardId.get(card.id);
                return (
                  <div key={card.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{card.front}</p>
                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                          {card.back}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {log ? formatInterval(log.intervalDays) : "New"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3.5 text-center">
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-0.5 text-xs">{label}</div>
    </div>
  );
}

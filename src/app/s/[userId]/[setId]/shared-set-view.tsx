"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { BookOpen, Loader2, Lock, Plus } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Wordmark } from "@/components/brand/logo";
import { PaperCreature } from "@/components/brand/paper-creature";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Flashcard, QuizQuestion, StudySet } from "@/lib/types";

export interface SharedSet {
  studySet: Omit<StudySet, "createdAt">;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

/**
 * Public, read-only view of a shared study set.
 *
 * Deliberately outside /app: no auth gate, because the whole point is that a
 * blockmate without an account can open the link. Access was already decided
 * on the server (see lib/firebase/shared-set.ts); `null` means "not available"
 * and never distinguishes a revoked link from one that never existed.
 *
 * Nothing about the owner is shown beyond the set itself.
 */
export function SharedSetView({ data }: { data: SharedSet | null }) {
  const router = useRouter();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);

  async function saveCopy() {
    if (!user || !data) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const copyRef = doc(collection(db, "users", user.uid, "studySets"));

      batch.set(copyRef, {
        noteId: null,
        title: data.studySet.title,
        courseTag: data.studySet.courseTag ?? null,
        flashcardCount: data.flashcards.length,
        quizQuestionCount: data.quizQuestions.length,
        source: "manual",
        isShared: false,
        createdAt: serverTimestamp(),
      });

      data.flashcards.forEach((card, index) => {
        batch.set(doc(collection(copyRef, "flashcards")), {
          front: card.front,
          back: card.back,
          order: index,
          // Must be the *copier*, not the original author — this card now
          // belongs to their queue.
          ownerId: user.uid,
        });
      });
      data.quizQuestions.forEach((question, index) => {
        batch.set(doc(collection(copyRef, "quizQuestions")), {
          question: question.question,
          choices: question.choices,
          correctIndex: question.correctIndex,
          order: index,
        });
      });

      await batch.commit();
      toast.success("Saved to your study sets.");
      router.push(`/app/sets/${copyRef.id}`);
    } catch {
      toast.error("Could not save a copy. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3.5 md:px-8">
        <Link href="/">
          <Wordmark />
        </Link>
        {user ? (
          <Button variant="ghost" size="sm" render={<Link href="/app" />}>
            My sets
          </Button>
        ) : (
          <Button size="sm" render={<Link href="/signup" />}>
            Get Tuón free
          </Button>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-8 md:py-12">
        {!data ? (
          <Unavailable />
        ) : (
          <>
            <motion.header
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Badge variant="secondary" className="gap-1.5">
                <BookOpen className="size-3" />
                Shared study set
              </Badge>
              <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {data.studySet.title}
              </h1>
              <p className="text-muted-foreground mt-2.5 text-sm">
                {[
                  data.studySet.courseTag,
                  `${data.flashcards.length} flashcards`,
                  data.quizQuestions.length
                    ? `${data.quizQuestions.length} quiz questions`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              <div className="mt-6">
                {user ? (
                  <Button size="lg" onClick={saveCopy} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Plus />}
                    Save to my sets
                  </Button>
                ) : (
                  <Button size="lg" render={<Link href="/signup" />}>
                    <Plus />
                    Sign up free to save this
                  </Button>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  You get your own copy — your reviews stay yours.
                </p>
              </div>
            </motion.header>

            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Flashcards
              </h2>
              <div className="mt-3 divide-y rounded-xl border">
                {data.flashcards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                    className="p-4"
                  >
                    <p className="font-medium">{card.front}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {card.back}
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="py-16 text-center">
      <PaperCreature state="asleep" className="mx-auto size-28" />
      <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
        This link is not available
      </h1>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        It may have been unshared by its owner, or the address might be
        mistyped.
      </p>
      <Button className="mt-7" render={<Link href="/" />}>
        <Lock />
        Go to Tuón
      </Button>
    </div>
  );
}

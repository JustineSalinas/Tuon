"use client";

/**
 * "My sets", as cards rather than the list the /app/sets page already owns.
 *
 * The dashboard shows the handful most worth opening right now — due first,
 * then the rest — capped, with the full list one tap away. No cover photos:
 * a flashcard set has no image of its own, and a stock photo standing in for
 * one would be describing nothing. A flat tile in the brand's own colour,
 * cycling through the terracotta ramp so a row of cards still reads as
 * several things rather than one repeated block, does the same job honestly.
 */

import Link from "next/link";
import { BookOpen } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import type { StudySet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** The brand's own light -> dark ramp (globals.css), cycled per card. */
const TILE_COLORS = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)"];

export interface SetCardData {
  set: StudySet;
  due: number;
  fresh: number;
  reviewed: number;
}

/** How many cards the dashboard shows before pointing at the full list. */
const MAX_CARDS = 6;

export function SetCards({ sets }: { sets: SetCardData[] }) {
  const { t } = useI18n();

  // Due work first — that is the question "what should I open" is actually
  // asking — then the rest in whatever order they arrived in.
  const ordered = [...sets].sort((a, b) => b.due - a.due).slice(0, MAX_CARDS);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map(({ set, due, reviewed }, index) => {
        const total = set.flashcardCount || 1;
        const done = Math.min(reviewed, set.flashcardCount);
        const pct = Math.round((done / total) * 100);
        const color = TILE_COLORS[index % TILE_COLORS.length];

        return (
          <div
            key={set.id}
            className="bg-card flex flex-col overflow-hidden rounded-2xl border"
          >
            <Link
              href={`/app/sets/${set.id}`}
              className="relative flex h-28 flex-col justify-between p-4"
              style={{ backgroundColor: color }}
            >
              <BookOpen
                className="text-background/70 size-5"
                aria-hidden="true"
              />
              <span className="text-background line-clamp-2 text-sm leading-snug font-semibold">
                {set.title}
              </span>
            </Link>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate text-xs">
                  {set.courseTag ?? t.dashboard.mySets}
                </span>
                {due > 0 ? (
                  <span className="text-primary shrink-0 text-xs font-medium tabular-nums">
                    {t.sets.due(due)}
                  </span>
                ) : null}
              </div>

              <div>
                <Progress value={pct} className="h-1.5" />
                <p className="text-muted-foreground mt-1.5 text-xs tabular-nums">
                  {t.dashboard.setProgress(done, set.flashcardCount)}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="mt-auto w-full"
                render={<Link href={`/app/sets/${set.id}/review`} />}
              >
                {t.dashboard.continueSet}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

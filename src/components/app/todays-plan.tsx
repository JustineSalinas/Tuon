"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Timer } from "lucide-react";

import type { StudyPlan } from "@/lib/stats/plan";
import { cn } from "@/lib/utils";

/**
 * Today's plan.
 *
 * The numbering is not decoration — it encodes a real sequence. Step one is
 * the subject the student is least ready for, which is the whole point: left
 * to choose from a grid of decks they pick the one they already know, and both
 * Anki and Quizlet hand them exactly that choice.
 *
 * It stops at the daily goal and says plainly what it held back. A backlog
 * presented as a wall is the moment people quit; the same reasoning already
 * governs the review queue's cap.
 */
export function TodaysPlan({ plan }: { plan: StudyPlan }) {
  if (plan.steps.length === 0) return null;

  return (
    <div>
      <div className="grid gap-2">
        {plan.steps.map((step, index) => (
          <motion.div
            key={`${step.kind}-${step.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            // A grid item's min-width is `auto`, so this refused to shrink
            // below the width of the longest step title and the whole card
            // grew past its column. Every ancestor of a `truncate` has to opt
            // out of that, which is why it appears again on the row inside.
            className="min-w-0"
          >
            <Link
              href={step.href}
              className="hover:border-primary/40 hover:bg-accent/30 group flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                {/* min-w-0 again: without it the icon+title row refuses to
                    shrink, `truncate` never engages, and a long set title
                    spills out of the card and over the column beside it. */}
                <div className="flex min-w-0 items-center gap-1.5">
                  {step.kind === "generate" ? (
                    <Sparkles className="text-primary size-3.5 shrink-0" />
                  ) : step.kind === "test" ? (
                    <Timer className="text-primary size-3.5 shrink-0" />
                  ) : null}
                  <span className="truncate text-sm font-medium">
                    {step.kind === "generate"
                      ? `Turn “${step.title}” into cards`
                      : step.kind === "test"
                        ? `Test yourself on ${step.title}`
                        : step.title}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                  {step.subject ? <span>{step.subject}</span> : null}
                  {step.cards > 0 ? (
                    <span className="tabular-nums">
                      {step.cards} {step.cards === 1 ? "card" : "cards"}
                    </span>
                  ) : null}
                  <span className="text-primary/80">{step.reason}</span>
                </div>
              </div>

              <ArrowRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>

      {plan.heldBack > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">
          <span className="tabular-nums">{plan.heldBack}</span> more are waiting
          when you finish. Your daily goal is{" "}
          <span className="tabular-nums">{plan.goal}</span> cards — change it in
          settings.
        </p>
      ) : null}
    </div>
  );
}

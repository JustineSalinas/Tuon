"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { GENERATION_EXPLAINER, PLANS } from "@/lib/ai/config";
import { cn } from "@/lib/utils";

/**
 * The questions a student actually has before signing up.
 *
 * Written to answer them, not to reassure. Where the honest answer is a
 * limitation (offline, AI mistakes) it says so; a FAQ that only says yes is
 * marketing copy with a chevron on it, and students spot that immediately.
 *
 * One numbered list rather than a two-column card grid: a number, the
 * question and answer in one left-aligned stack, and a show/hide label on
 * the trailing edge, all on one row above the breakpoint and stacked
 * (number and label on top, question below) under it. A spring on the
 * expand rather than a tween, so it settles rather than stopping dead.
 *
 * The words live in the message catalogue. Two of the answers carry numbers
 * that come from the plan config rather than from prose, and three carry a
 * link, so an answer is a template with `{count}`, `{explainer}` and `{link}`
 * placeholders rather than a finished string. A placeholder rather than
 * before/after fragments because word order moves between languages, and the
 * link has to be free to move with it.
 */

const SPRING = { type: "spring" as const, stiffness: 280, damping: 30, mass: 0.9 };

function renderAnswer(
  answer: string,
  link: { href: string; label: string } | null,
  values: { count: number; explainer: string },
): React.ReactNode {
  const filled = answer
    .replace("{count}", String(values.count))
    .replace("{explainer}", values.explainer);

  const [before, after] = filled.split("{link}");
  if (after === undefined || !link) return filled;

  return (
    <>
      {before}
      <Link href={link.href} className="text-primary underline underline-offset-4">
        {link.label}
      </Link>
      {after}
    </>
  );
}

/** The widened catalogue type, not `en`'s literals — a component reads
    whichever locale is active, and those are different strings. */
type FaqEntry = Messages["marketing"]["faq"]["items"][number];

function FaqRow({
  index,
  item,
  expanded,
  onToggle,
  values,
}: {
  index: number;
  item: FaqEntry;
  expanded: boolean;
  onToggle: () => void;
  values: { count: number; explainer: string };
}) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : SPRING;
  const { t } = useI18n();
  const number = String(index + 1).padStart(2, "0");

  const answer = (
    <p className="text-muted-foreground max-w-2xl pt-2 text-[15px] leading-relaxed">
      {renderAnswer(
        item.a,
        "linkHref" in item && item.linkHref
          ? { href: item.linkHref, label: item.linkLabel }
          : null,
        values,
      )}
    </p>
  );

  return (
    <div className="py-5 sm:py-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="focus-visible:ring-ring group flex w-full flex-col gap-2 text-left focus-visible:ring-[3px] focus-visible:outline-none sm:flex-row sm:items-start sm:gap-5"
      >
        {/* Mobile: number and the show/hide label share a row above the
            question. Desktop: the number moves to the row's leading edge
            and the label to its trailing edge, with the question between. */}
        <span className="flex items-center justify-between sm:contents">
          <span
            className={cn(
              "font-display text-lg font-semibold tabular-nums transition-colors sm:w-8 sm:shrink-0 sm:pt-0.5",
              expanded ? "text-primary" : "text-muted-foreground/50",
            )}
          >
            {number}
          </span>

          <span
            className={cn(
              "order-last flex shrink-0 items-center gap-1.5 text-xs font-medium tracking-widest uppercase transition-colors sm:pt-1",
              expanded ? "text-primary" : "text-muted-foreground",
            )}
          >
            {expanded ? t.marketing.faq.hide : t.marketing.faq.show}
            <Plus
              className={cn(
                "size-3.5 transition-transform duration-200",
                expanded && "rotate-45",
              )}
            />
          </span>
        </span>

        <span className="flex-1">
          <span
            className={cn(
              "block leading-snug font-medium transition-colors",
              expanded ? "text-foreground" : "text-foreground/90 group-hover:text-foreground",
            )}
          >
            {item.q}
          </span>

          {/* Desktop: the answer sits directly under the question in the
              same column, rather than spanning full width under the
              number. Mobile keeps the same stack, just narrower. */}
          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={transition}
                className="overflow-hidden"
              >
                {answer}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </span>
      </button>
    </div>
  );
}

export function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  const values = {
    count: PLANS.free.monthlyGenerations,
    explainer: GENERATION_EXPLAINER,
  };

  return (
    <div className="border-border bg-card mx-auto mt-12 max-w-3xl divide-y rounded-2xl border px-6 sm:px-8">
      {t.marketing.faq.items.map((item, index) => (
        <FaqRow
          key={item.q}
          index={index}
          item={item}
          expanded={open.has(index)}
          onToggle={() => toggle(index)}
          values={values}
        />
      ))}
    </div>
  );
}

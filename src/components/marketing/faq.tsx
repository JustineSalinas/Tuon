"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { GENERATION_EXPLAINER, PLANS } from "@/lib/ai/config";
import { cn } from "@/lib/utils";

/**
 * The questions a student actually has before signing up.
 *
 * Written to answer them, not to reassure. Where the honest answer is a
 * limitation — offline, AI mistakes — it says so; a FAQ that only says yes is
 * marketing copy with a chevron on it, and students spot that immediately.
 *
 * The words live in the message catalogue. Two of the answers carry numbers
 * that come from the plan config rather than from prose, and three carry a
 * link, so an answer is a template with `{count}`, `{explainer}` and `{link}`
 * placeholders rather than a finished string. A placeholder rather than
 * before/after fragments because word order moves between languages, and the
 * link has to be free to move with it.
 */
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

function FaqItem({
  item,
  expanded,
  onToggle,
  values,
}: {
  item: FaqEntry;
  expanded: boolean;
  onToggle: () => void;
  values: { count: number; explainer: string };
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors",
        expanded ? "border-primary/40 bg-accent/20" : "bg-card",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-accent/30 focus-visible:ring-ring flex w-full items-start gap-4 px-6 py-5 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <span className="flex-1 leading-snug font-medium">{item.q}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-muted-foreground px-6 pb-6 text-[15px] leading-relaxed">
              {renderAnswer(
                item.a,
                "linkHref" in item && item.linkHref
                  ? { href: item.linkHref, label: item.linkLabel }
                  : null,
                values,
              )}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const { t } = useI18n();
  // A set rather than one index: in two columns, making someone close a
  // question on the left to read one on the right is a rule with no reason.
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
    <div className="mx-auto mt-12 grid max-w-4xl items-start gap-3 md:grid-cols-2 md:gap-4">
      {[0, 1].map((column) => (
        <div key={column} className="flex flex-col gap-3 md:gap-4">
          {t.marketing.faq.items
            .map((item, index) => ({ item, index }))
            .filter(({ index }) => index % 2 === column)
            .map(({ item, index }) => (
              <FaqItem
                key={item.q}
                item={item}
                expanded={open.has(index)}
                onToggle={() => toggle(index)}
                values={values}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

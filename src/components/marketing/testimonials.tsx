"use client";

import { useI18n } from "@/components/providers/i18n-provider";
import { TESTIMONIALS, type Testimonial } from "@/lib/marketing/testimonials";
import { cn } from "@/lib/utils";

/** Cards per row before the loop repeats — enough that a slow reader never catches the seam. */
const ROW_LENGTH = 7;

/**
 * Two rows of student testimonials, scrolling opposite directions — or,
 * until there are any, two rows of honest placeholders in the exact shape a
 * real one will take. See `lib/marketing/testimonials.ts` for why this
 * starts empty rather than seeded with invented quotes, names, or the
 * engagement numbers a screenshot of a real comment wall would carry.
 */
export function Testimonials() {
  const real = TESTIMONIALS;

  // Split real entries between the two rows once there are any; while empty,
  // both rows are the same honest placeholder.
  const rowA = real.length > 0 ? real.filter((_, i) => i % 2 === 0) : [];
  const rowB = real.length > 0 ? real.filter((_, i) => i % 2 === 1) : [];

  return (
    <div className="marquee-track -mx-4 space-y-4 overflow-hidden md:-mx-8">
      <Row entries={rowA} length={ROW_LENGTH} reverse={false} />
      <Row entries={rowB} length={ROW_LENGTH} reverse />
    </div>
  );
}

function Row({
  entries,
  length,
  reverse,
}: {
  entries: Testimonial[];
  length: number;
  reverse: boolean;
}) {
  const slideCount = entries.length > 0 ? entries.length : length;
  const base = Array.from({ length: slideCount }, (_, i) => entries[i] ?? null);
  // Duplicated once so the marquee's -50% translation loops seamlessly.
  const doubled = [...base, ...base];

  return (
    <div className="overflow-x-auto md:overflow-x-visible">
      <div
        className={cn(
          "flex w-max gap-4 px-4 md:px-8",
          reverse ? "marquee-row-reverse" : "marquee-row",
        )}
      >
        {doubled.map((testimonial, i) =>
          testimonial ? (
            <TestimonialCard key={`${testimonial.name}-${i}`} testimonial={testimonial} />
          ) : (
            <PlaceholderCard key={`placeholder-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

function CardShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-64 shrink-0 rounded-2xl p-5 sm:w-72", className)}>
      {children}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initial = testimonial.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <CardShell className="neu-raised-sm">
      <div className="flex items-center gap-2.5">
        <span className="bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{testimonial.name}</p>
          <p className="text-muted-foreground truncate text-xs">{testimonial.detail}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{testimonial.quote}</p>
    </CardShell>
  );
}

/** The same shape as a real card, drawn in outline so it reads as reserved rather than broken. */
function PlaceholderCard() {
  const { t } = useI18n();

  return (
    <CardShell className="border-muted-foreground/25 border border-dashed">
      <div className="flex items-center gap-2.5">
        <span className="border-muted-foreground/30 grid size-8 shrink-0 place-items-center rounded-full border border-dashed" />
        <p className="text-muted-foreground text-xs">
          {t.marketing.testimonials.placeholderName}
        </p>
      </div>
      <p className="text-muted-foreground mt-3 text-sm italic leading-relaxed">
        {t.marketing.testimonials.placeholderQuote}
      </p>
    </CardShell>
  );
}

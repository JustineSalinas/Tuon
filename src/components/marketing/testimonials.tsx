"use client";

import { Quote } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { TESTIMONIALS } from "@/lib/marketing/testimonials";
import { cn } from "@/lib/utils";

/** Enough slides that the row still reads as a carousel, not a gap. */
const PLACEHOLDER_COUNT = 5;

/**
 * A row of student testimonials — or, until there are any, a row of honest
 * placeholders in the exact shape a real one will take. See
 * `lib/marketing/testimonials.ts` for why this starts empty rather than
 * seeded with invented quotes.
 */
export function Testimonials() {
  const real = TESTIMONIALS;
  const slideCount = real.length > 0 ? real.length : PLACEHOLDER_COUNT;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8">
      <div className="flex w-max snap-x snap-mandatory gap-4">
        {Array.from({ length: slideCount }, (_, i) =>
          real[i] ? (
            <TestimonialCard key={real[i].name} testimonial={real[i]} />
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
    <div
      className={cn(
        "w-72 shrink-0 snap-center rounded-2xl p-6 sm:w-80",
        className,
      )}
    >
      {children}
    </div>
  );
}

function TestimonialCard({
  testimonial,
}: {
  testimonial: { quote: string; name: string; detail: string };
}) {
  const initial = testimonial.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <CardShell className="neu-raised-sm">
      <Quote className="text-primary/60 size-5" aria-hidden="true" />
      <p className="mt-4 text-sm leading-relaxed">{testimonial.quote}</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-full text-sm font-medium">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{testimonial.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {testimonial.detail}
          </p>
        </div>
      </div>
    </CardShell>
  );
}

/** The same shape as a real card, drawn in outline so it reads as reserved rather than broken. */
function PlaceholderCard() {
  const { t } = useI18n();

  return (
    <CardShell className="border-muted-foreground/25 border border-dashed">
      <Quote className="text-muted-foreground/40 size-5" aria-hidden="true" />
      <p className="text-muted-foreground mt-4 text-sm italic leading-relaxed">
        {t.marketing.testimonials.placeholderQuote}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="border-muted-foreground/30 grid size-9 shrink-0 place-items-center rounded-full border border-dashed" />
        <p className="text-muted-foreground text-xs">
          {t.marketing.testimonials.placeholderName}
        </p>
      </div>
    </CardShell>
  );
}

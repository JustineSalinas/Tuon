import { BOOK_PATH } from "@/components/brand/book-mark";
import { cn } from "@/lib/utils";

/**
 * The Tuón mark: an open book.
 *
 * Drawn as one solid shape rather than as outlines or plies. Strokes and fine
 * internal lines go to mush below about 20px; mass survives, which is why this
 * still reads in a browser tab. It is also why the mark carries one colour,
 * `currentColor`, and needs no second asset for dark mode.
 *
 * Not the owl. Tala is the companion — the character who talks to the student
 * and turns up across the app — and the logo is the book. Two different jobs,
 * and trying to make one shape do both cost the mark its legibility at 16px.
 */
export function TuonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <path d={BOOK_PATH} fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TuonMark className={cn("text-primary", markClassName)} />
      <span className="font-display text-xl font-semibold tracking-tight">Tuón</span>
    </span>
  );
}

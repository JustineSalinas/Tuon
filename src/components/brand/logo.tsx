import { cn } from "@/lib/utils";

/**
 * The Tuón mark: a filled circle with a ring around it — a point of focus.
 * Doubles as the review-progress motif used on the study screens.
 */
export function TuonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="60 22"
        opacity="0.45"
      />
      <circle cx="16" cy="16" r="5.5" fill="currentColor" />
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

import { cn } from "@/lib/utils";

/**
 * The Tuón mark: an owl whose eyes are the original focus motif.
 *
 * The mark used to be a single ring with a filled centre — "a point of
 * attention", which is what tuón means. That idea is kept rather than thrown
 * away: the owl has two of them, as eyes. So the logo now carries the meaning
 * AND is a character that can appear beside a sentence, which an abstract ring
 * never could.
 *
 * Built from circles and two straight lines on a 32-unit grid so it survives
 * being rendered at 16px in a browser tab. Everything inherits `currentColor`,
 * so it is correct in dark mode for free and needs no second asset.
 */
export function TuonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      {/* Head. The open gap at the top is where the original ring's gap was —
          attention arriving rather than a closed circle. */}
      <path
        d="M4.5 17.5 A11.5 11.5 0 0 1 27.5 17.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Body */}
      <path
        d="M4.5 17.5 A11.5 11.5 0 0 0 27.5 17.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Ear tufts — what makes it read as an owl rather than a bird. */}
      <path
        d="M8.5 8.5 L6.5 4.5 M23.5 8.5 L25.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* The eyes: the old mark, twice. */}
      <circle cx="12" cy="15" r="3.6" fill="currentColor" />
      <circle cx="20" cy="15" r="3.6" fill="currentColor" />

      {/* Beak */}
      <path
        d="M16 19.5 L14.6 21.8 H17.4 Z"
        fill="currentColor"
        opacity="0.55"
      />
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

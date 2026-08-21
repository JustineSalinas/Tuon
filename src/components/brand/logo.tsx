import { cn } from "@/lib/utils";

/**
 * The Tuón mark: a small round owl, face-on.
 *
 * The mark used to be a single ring with a filled centre — "a point of
 * attention", which is what tuón means. That idea survives rather than being
 * thrown away: the owl has two of them, as eyes, and each is still literally a
 * ring around a filled dot.
 *
 * Built as a SILHOUETTE with the eyes punched out (`fill-rule="evenodd"`)
 * rather than as outlines. That matters more than it sounds: strokes go to mush
 * below about 20px, whereas mass survives, so this is the version that still
 * reads in a browser tab. It is also why the mark carries one colour —
 * `currentColor` — and needs no second asset for dark mode.
 */
export function TuonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      {/* Ear tufts. Drawn first and in the same colour, so they simply weld
          onto the head below rather than needing to be part of its path. */}
      <path
        d="M10.6 8.6 L6.4 2.6 L15.2 6.6 Z M21.4 8.6 L25.6 2.6 L16.8 6.6 Z"
        fill="currentColor"
        strokeLinejoin="round"
      />

      {/* Head and body in one shape, with the eyes and beak as holes. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 6.2 C 21.4 6.2 25.2 8.8 26.6 12.4 C 27.8 15.4 27.8 19.8 26.4 22.8
           C 24.4 27 20.6 29.4 16 29.4 C 11.4 29.4 7.6 27 5.6 22.8
           C 4.2 19.8 4.2 15.4 5.4 12.4 C 6.8 8.8 10.6 6.2 16 6.2 Z
           M15.6 15.6 A4.4 4.4 0 1 0 6.8 15.6 A4.4 4.4 0 1 0 15.6 15.6 Z
           M25.2 15.6 A4.4 4.4 0 1 0 16.4 15.6 A4.4 4.4 0 1 0 25.2 15.6 Z
           M16 20.2 L13.9 23.4 H18.1 Z"
        fill="currentColor"
      />

      {/* The pupils: the original mark, twice, sitting inside its own ring. */}
      <circle cx="11.2" cy="15.7" r="2.5" fill="currentColor" />
      <circle cx="20.8" cy="15.7" r="2.5" fill="currentColor" />
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

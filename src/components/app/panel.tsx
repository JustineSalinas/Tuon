import { cn } from "@/lib/utils";

/**
 * The shell every "your time" surface wears.
 *
 * Three cards answer the same question across the dashboard and the calendar
 * — the week, the deadlines, the year — and they had three different shells:
 * a hairline box with no ground and a 12px radius, a bare stack of separately
 * bordered pills, and a filled card at 16px. Side by side they read as three
 * widgets that happened to land on the same page rather than as one answer to
 * "how am I doing", and the mismatch is most of what made those screens feel
 * unstructured.
 *
 * One radius, one ground, one border. `p-0` is the deliberate exception for a
 * panel whose content is a list of full-bleed rows.
 */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-card rounded-2xl border p-5", className)}>
      {children}
    </div>
  );
}

/**
 * A panel's own heading row, for the figure a panel leads with.
 *
 * Kept separate from the page's `<h2>`: the page says what the panel is, and
 * the panel says what it currently reads. Putting both in the panel is what
 * produced two "Your year" headings stacked on the calendar.
 */
export function PanelLede({
  value,
  aside,
}: {
  value: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className="font-display text-2xl font-semibold tracking-tight">
        {value}
      </p>
      {aside}
    </div>
  );
}

import { AnimatedMark } from "@/components/brand/animated-mark";
import { TuonMark } from "@/components/brand/logo";
import {
  PaperCreature,
  type CreatureState,
} from "@/components/brand/paper-creature";

/**
 * Every state of Tala, and the mark at the sizes that actually matter, on one
 * page.
 *
 * This exists because the character is animated and theme-dependent, so the
 * only honest way to check a change is to look at all of it at once — in both
 * modes, at tab size as well as hero size. Kept out of the sitemap and out of
 * search; it is a workbench, not a page.
 */

export const metadata = {
  title: "Tala — dev reference",
  robots: { index: false, follow: false },
};

const STATES: CreatureState[] = [
  "idle",
  "thinking",
  "correct",
  "wrong",
  "asleep",
  "overdue",
  "celebrating",
];

/** The sizes the mark has to survive: browser tab, chip, avatar, hero. */
const MARK_SIZES: [className: string, label: string][] = [
  ["size-4", "16"],
  ["size-6", "24"],
  ["size-8", "32"],
  ["size-16", "64"],
];

export default function DevCreature() {
  return (
    <div className="mx-auto max-w-5xl p-10">
      <h1 className="font-display text-3xl font-semibold">Tala — every state</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Dev reference. Everything here is animated — the idle loop runs seven
        seconds, so give it a moment before judging it. Switch your OS theme to
        check dark mode.
      </p>

      <h2 className="text-muted-foreground mt-8 text-xs font-medium tracking-wide uppercase">
        The mark, at size
      </h2>
      <div className="mt-3 flex items-end gap-6">
        {MARK_SIZES.map(([className, label]) => (
          <div key={label} className="text-center">
            <TuonMark className={"text-primary " + className} />
            <p className="text-muted-foreground mt-2 text-xs">{label}px</p>
          </div>
        ))}
        <div className="text-center">
          <AnimatedMark motion="focusing" className="text-primary size-16" />
          <p className="text-muted-foreground mt-2 text-xs">focusing</p>
        </div>
        <div className="text-center">
          <AnimatedMark motion="draw" className="text-primary size-16" />
          <p className="text-muted-foreground mt-2 text-xs">draw</p>
        </div>
      </div>

      <h2 className="text-muted-foreground mt-10 text-xs font-medium tracking-wide uppercase">
        Tala, idle — head-snaps and a wave, no book
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATES.map((state) => (
          <div
            key={state}
            className="border-border bg-card rounded-2xl border p-6 text-center"
          >
            <PaperCreature state={state} className="mx-auto size-32" />
            <p className="text-muted-foreground mt-3 text-xs">{state}</p>
          </div>
        ))}
      </div>

      <h2 className="text-muted-foreground mt-10 text-xs font-medium tracking-wide uppercase">
        Tala, mid-session — same states, book out
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATES.map((state) => (
          <div
            key={state}
            className="border-border bg-card rounded-2xl border p-6 text-center"
          >
            <PaperCreature state={state} studying className="mx-auto size-32" />
            <p className="text-muted-foreground mt-3 text-xs">{state}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

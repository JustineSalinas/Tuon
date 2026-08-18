import { TuonMark } from "@/components/brand/logo";

/**
 * The right-hand panel on auth screens. Desktop only — on mobile the form
 * should own the whole viewport rather than making students scroll past
 * decoration to reach the password field.
 */
export function AuthAside() {
  return (
    <aside className="bg-secondary/60 paper-grain relative hidden items-center justify-center overflow-hidden border-l px-12 lg:flex">
      <div className="relative z-10 max-w-md">
        <TuonMark className="text-primary size-10" />

        <p className="font-display mt-8 text-3xl leading-snug font-semibold tracking-tight text-balance">
          &ldquo;Tuón&rdquo; means to study — to give something your full
          attention.
        </p>

        <p className="text-muted-foreground mt-6 leading-relaxed">
          Paste your notes from class. Get flashcards and a practice quiz back in
          seconds, then review them on a schedule that puts each card in front of
          you right before you would have forgotten it.
        </p>

        <dl className="mt-12 grid grid-cols-3 gap-6 border-t pt-8">
          <div>
            <dt className="font-display text-2xl font-semibold">8–15</dt>
            <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
              flashcards per note
            </dd>
          </div>
          <div>
            <dt className="font-display text-2xl font-semibold">SM-2</dt>
            <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
              spaced repetition
            </dd>
          </div>
          <div>
            <dt className="font-display text-2xl font-semibold">K-12</dt>
            <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
              SHS strands built in
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

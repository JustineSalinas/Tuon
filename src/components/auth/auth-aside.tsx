"use client";

import { TuonMark } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";

/**
 * The right-hand panel on auth screens. Desktop only — on mobile the form
 * should own the whole viewport rather than making students scroll past
 * decoration to reach the password field.
 */
export function AuthAside() {
  const { t } = useI18n();

  return (
    <aside className="bg-secondary/60 paper-grain relative hidden items-center justify-center overflow-hidden border-l px-12 lg:flex">
      <div className="relative z-10 max-w-md">
        <TuonMark className="text-primary size-10" />

        <p className="font-display mt-8 text-3xl leading-snug font-semibold tracking-tight text-balance">
          {t.auth.aside.meaning}
        </p>

        <p className="text-muted-foreground mt-6 leading-relaxed">
          {t.auth.aside.body}
        </p>

        <dl className="mt-12 grid grid-cols-3 gap-6 border-t pt-8">
          <div>
            <dt className="font-display text-2xl font-semibold">8–15</dt>
            <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t.auth.aside.cardsPerNote}
            </dd>
          </div>
          <div>
            <dt className="font-display text-2xl font-semibold">SM-2</dt>
            <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t.auth.aside.spacedRepetition}
            </dd>
          </div>
          <div>
            <dt className="font-display text-2xl font-semibold">K-12</dt>
            <dd className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t.auth.aside.strandsBuiltIn}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

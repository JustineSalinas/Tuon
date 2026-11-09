"use client";

/**
 * The dashboard's greeting.
 *
 * Earlier version of this was a flat gradient banner with a fake search bar
 * and four identical icon chips — the generic AI-dashboard furniture a lot of
 * SaaS templates ship, and none of it was actually Tuón's: the "ask
 * anything" bar duplicated the real entry point at /app/tala instead of
 * being it, and the four chips just restated the sidebar nav one scroll up.
 * This keeps the quiet, plain-background header the rest of the app uses and
 * adds exactly one thing that is actually Tuón's own: Tala, beside the
 * greeting, the same way she shows up everywhere else in the product.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { CREATURE_NAME, CREATURE_ROLE } from "@/lib/brand";
import { PaperCreature } from "@/components/brand/paper-creature";

export function DashboardHero({
  greeting,
  firstName,
  subhead,
}: {
  greeting: string;
  firstName: string;
  /** Rendered under the greeting — an exam countdown, or nothing. */
  subhead?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="flex items-start gap-4">
      <PaperCreature
        state="idle"
        className="size-14 shrink-0 sm:size-16"
        title={CREATURE_ROLE}
      />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        {subhead ?? (
          <p className="text-muted-foreground mt-1 text-sm">
            {t.dashboard.heroSubtitle(CREATURE_NAME)}
          </p>
        )}

        <Link
          href="/app/tala"
          className="text-primary group mt-2 inline-flex items-center gap-1 text-sm font-medium"
        >
          {t.dashboard.quickAsk(CREATURE_NAME)}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

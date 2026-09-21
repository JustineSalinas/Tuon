"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { useNow } from "@/lib/hooks/use-now";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useReviewCards } from "@/lib/hooks/use-review-cards";
import { PLANS, UPGRADE_TARGET, planCan } from "@/lib/ai/config";
import { RetentionReport } from "@/components/app/retention-report";
import { Button } from "@/components/ui/button";

/**
 * Retention.
 *
 * The page is now the gate and the data; the report itself lives in
 * `components/app/retention-report` so it can be rendered from a fixture. It
 * was 200 lines inline here, and seeing it required an account, a paid plan
 * and a review history all at once — which is no way to check the most
 * chart-dense screen in the product.
 */
export default function StatsPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { cards, loading } = useReviewCards(user?.uid);
  const { timeZone } = usePreferences();
  const now = useNow(60_000);

  // Every hook above the gate: an early return that skips hooks changes their
  // count between renders the moment the profile lands.
  const allowed = planCan(profile?.plan ?? "free", "canSeeStats");
  if (!allowed) return <Upsell t={t} />;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.stats.title}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {t.stats.subtitle}
        </p>
      </header>

      <RetentionReport
        cards={cards}
        loading={loading}
        now={now}
        timeZone={timeZone}
      />
    </main>
  );
}

function Upsell({ t }: { t: Messages }) {
  const upgrade = PLANS[UPGRADE_TARGET];
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center px-6 text-center">
      <div>
        <div className="bg-secondary mx-auto grid size-12 place-items-center rounded-full">
          <Lock className="text-muted-foreground size-5" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
          {t.stats.lockedTitle(upgrade.name)}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t.stats.lockedBody(upgrade.phpMonthly)}
        </p>
        <Button className="mt-6" render={<Link href="/app/settings" />}>
          {t.stats.seePlans}
        </Button>
      </div>
    </main>
  );
}

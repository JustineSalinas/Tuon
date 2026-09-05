"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarPlus, Flag } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { usePlanItems } from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { describeDueDate, upcomingDeadlines } from "@/lib/organiser/plan-items";
import { renderDueDate } from "@/lib/i18n/format";
import { Panel } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * What is coming, beside what you did.
 *
 * The week card answers "have I been studying"; this answers "for what". They
 * belong at the same height because a student deciding whether tonight matters
 * needs both, and neither is much use alone — an empty week is only alarming
 * next to a deadline, and a deadline is only reassuring next to a week of
 * work.
 *
 * Overdue work sorts to the top, which is `upcomingDeadlines`' own rule: a
 * missed deadline is the thing most worth seeing, and burying it under next
 * week's reading is how an organiser becomes something people stop opening.
 */

/** Four fits the card beside a seven-bar week without either scrolling. */
const SHOWN = 4;

export function Upcoming() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { timeZone } = usePreferences();
  const { items, loading } = usePlanItems(user?.uid);

  const today = dayKey(new Date(), timeZone);
  const deadlines = useMemo(
    () => upcomingDeadlines(items, today).slice(0, SHOWN),
    [items, today],
  );

  if (loading) return <Skeleton className="h-52 w-full rounded-2xl" />;

  if (deadlines.length === 0) {
    return (
      <Link
        href="/app/calendar"
        className="hover:border-primary/40 hover:bg-accent/30 bg-card flex h-full min-h-52 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center transition-colors"
      >
        <CalendarPlus className="text-muted-foreground size-5" />
        <span className="text-sm font-medium">{t.dashboard.nothingDue}</span>
        <span className="text-muted-foreground text-xs">
          {t.dashboard.addDeadline}
        </span>
      </Link>
    );
  }

  return (
    <Panel className="overflow-hidden p-0">
      <ul className="divide-y">
        {deadlines.map((item) => {
          const label = describeDueDate(item.dueDate!, today);
          const overdue =
            label.kind === "yesterday" || label.kind === "daysAgo";

          return (
            <li key={item.id}>
              <Link
                href="/app/calendar"
                className="hover:bg-accent/30 flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <Flag
                  className={cn(
                    "size-4 shrink-0",
                    overdue ? "text-destructive" : "text-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {item.title}
                  </div>
                  {item.courseTag ? (
                    <div className="text-muted-foreground truncate text-xs">
                      {item.courseTag}
                    </div>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    overdue
                      ? "text-destructive font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {renderDueDate(label, t)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

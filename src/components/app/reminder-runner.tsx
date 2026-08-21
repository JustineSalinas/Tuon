"use client";

import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { bucketByDue, useReviewCards } from "@/lib/hooks/use-review-cards";
import {
  lastReminderShown,
  markReminderShown,
  reminderEnabled,
  reminderIsDue,
  reminderMessage,
  reminderTime,
} from "@/lib/reminders";

/** How often to re-check. A minute is plenty for a once-a-day nudge. */
const CHECK_INTERVAL_MS = 60_000;

/**
 * Fires the daily reminder while the app is open.
 *
 * Mounted in the app shell rather than on the review screen: someone already
 * reviewing does not need telling, and the point is to catch a student who
 * opened Tuón for something else and would otherwise leave their cards.
 *
 * Reuses the review queue the shell already loads, so this costs no extra
 * reads.
 */
export function ReminderRunner() {
  const { user } = useAuth();
  const { cards } = useReviewCards(user?.uid);

  useEffect(() => {
    if (!user || cards.length === 0) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!reminderEnabled() || Notification.permission !== "granted") return;

    function check() {
      const now = new Date();
      const { due, fresh } = bucketByDue(cards, now.getTime());
      const dueCount = due.length + fresh.length;

      if (
        !reminderIsDue({
          now,
          time: reminderTime(),
          lastShown: lastReminderShown(),
          enabled: reminderEnabled(),
          dueCount,
        })
      ) {
        return;
      }

      try {
        new Notification("Tuón", {
          body: reminderMessage(dueCount),
          icon: "/icon",
          tag: "tuon-daily-review",
        });
        markReminderShown(now);
      } catch {
        // Some browsers refuse constructor notifications outside a service
        // worker. Nothing to recover, and nothing worth telling the student.
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, cards]);

  return null;
}

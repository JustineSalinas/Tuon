"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import {
  DEFAULT_REMINDER_TIME,
  reminderEnabled,
  reminderPermission,
  reminderTime,
  setReminderEnabled,
  setReminderTime,
} from "@/lib/reminders";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

/**
 * Opt-in daily reminder.
 *
 * States the limitation rather than hiding it: this fires from the device
 * while the app is open, so it cannot reach a student who does not open Tuón
 * at all that day. Pretending otherwise would be the kind of small lie that
 * costs trust the first time someone notices.
 */
export function DailyReminder() {
  // Read once on mount rather than during render — localStorage is not
  // available on the server and would break hydration.
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined" ? false : reminderEnabled(),
  );
  const [time, setTime] = useState(() =>
    typeof window === "undefined" ? DEFAULT_REMINDER_TIME : reminderTime(),
  );

  const permission = typeof window === "undefined" ? "unsupported" : reminderPermission();

  async function toggle(next: boolean) {
    if (!next) {
      setEnabled(false);
      setReminderEnabled(false);
      return;
    }

    if (permission === "unsupported") {
      toast.error("This browser cannot show reminders.");
      return;
    }

    // Ask only when they actually want it. A permission prompt on page load is
    // the fastest way to get denied permanently.
    let granted = permission === "granted";
    if (!granted) {
      granted = (await Notification.requestPermission()) === "granted";
    }
    if (!granted) {
      toast.error(
        "Your browser blocked notifications. You can allow them in site settings.",
      );
      return;
    }

    setEnabled(true);
    setReminderEnabled(true);
    toast.success(`Reminder set for ${time}.`);
  }

  function changeTime(next: string) {
    setTime(next);
    setReminderTime(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor="reminder" className="flex items-center gap-2">
            <Bell className="text-muted-foreground size-4" />
            Daily reminder
          </Label>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            One nudge a day when you have cards due. It counts cards, not days
            in a row — missing a day during exams is not a failure.
          </p>
        </div>
        <Switch
          id="reminder"
          checked={enabled}
          onCheckedChange={(next) => void toggle(next === true)}
        />
      </div>

      {enabled ? (
        <div className="flex items-center gap-3">
          <Label htmlFor="reminder-time" className="text-sm font-normal">
            Remind me at
          </Label>
          <Input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => changeTime(e.target.value)}
            className="w-32"
          />
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs leading-relaxed">
        The reminder comes from this device, so it can only appear on a day you
        open Tuón. Installing it to your home screen makes that far more
        likely.
      </p>
    </div>
  );
}

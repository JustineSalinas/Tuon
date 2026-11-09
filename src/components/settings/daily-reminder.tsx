"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import {
  DEFAULT_REMINDER_TIME,
  dndEnabled as readDndEnabled,
  dndEnd as readDndEnd,
  dndStart as readDndStart,
  reminderEnabled,
  reminderPermission,
  reminderTime,
  setDndEnabled,
  setDndEnd,
  setDndStart,
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
  const { t } = useI18n();

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
      toast.error(t.reminder.unsupported);
      return;
    }

    // Ask only when they actually want it. A permission prompt on page load is
    // the fastest way to get denied permanently.
    let granted = permission === "granted";
    if (!granted) {
      granted = (await Notification.requestPermission()) === "granted";
    }
    if (!granted) {
      toast.error(t.reminder.blocked);
      return;
    }

    setEnabled(true);
    setReminderEnabled(true);
    toast.success(t.reminder.set(time));
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
            {t.reminder.title}
          </Label>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {t.reminder.hint}
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
            {t.reminder.remindMeAt}
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
        {t.reminder.deviceNote}
      </p>

      <DoNotDisturbRow />
    </div>
  );
}

/**
 * Quiet hours for the daily reminder — on the same device-local storage as
 * the reminder itself, since one has no meaning without the other.
 */
function DoNotDisturbRow() {
  const { t } = useI18n();

  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined" ? false : readDndEnabled(),
  );
  const [start, setStart] = useState(() =>
    typeof window === "undefined" ? "22:00" : readDndStart(),
  );
  const [end, setEnd] = useState(() =>
    typeof window === "undefined" ? "07:00" : readDndEnd(),
  );

  function toggle(next: boolean) {
    setEnabled(next);
    setDndEnabled(next);
  }

  function changeStart(next: string) {
    setStart(next);
    setDndStart(next);
  }

  function changeEnd(next: string) {
    setEnd(next);
    setDndEnd(next);
  }

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor="dnd-enabled">{t.reminder.dndTitle}</Label>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {t.reminder.dndHint}
          </p>
        </div>
        <Switch
          id="dnd-enabled"
          checked={enabled}
          onCheckedChange={(next) => toggle(next === true)}
        />
      </div>

      {enabled ? (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="dnd-start" className="text-sm font-normal">
              {t.reminder.dndFrom}
            </Label>
            <Input
              id="dnd-start"
              type="time"
              value={start}
              onChange={(e) => changeStart(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="dnd-end" className="text-sm font-normal">
              {t.reminder.dndTo}
            </Label>
            <Input
              id="dnd-end"
              type="time"
              value={end}
              onChange={(e) => changeEnd(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

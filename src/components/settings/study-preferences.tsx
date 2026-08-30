"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Check, Keyboard, Loader2, Monitor, Moon, Sun, Timer, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import {
  MAX_DAILY_CARD_GOAL,
  MIN_DAILY_CARD_GOAL,
  clampGoal,
  usePreferences,
} from "@/lib/hooks/use-preferences";
import {
  MAX_PHASE_MINUTES,
  MIN_PHASE_MINUTES,
  clampPhaseMinutes,
} from "@/lib/organiser/pomodoro";
import {
  TIME_ZONES,
  detectTimeZone,
  normaliseTimeZone,
  offsetLabel,
} from "@/lib/time-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DailyReminder } from "@/components/settings/daily-reminder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function StudyPreferences() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">Studying</h2>

      <div className="mt-4 space-y-6">
        <ThemeRow />
        <Separator />
        <TimeZoneRow />
        <Separator />
        <DailyGoalRow />
        <Separator />
        <TypedRecallRow />
        <Separator />
        <TimerRow />
        <Separator />
        <DailyReminder />
      </div>
    </section>
  );
}

function ThemeRow() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p className="text-sm font-medium">Appearance</p>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Dark is warm rather than black — it is meant for reviewing at 1am
        without the screen shouting at you.
      </p>

      <div className="mt-3 grid max-w-md grid-cols-3 gap-2">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={theme === value}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm transition-colors",
              "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
              theme === value
                ? "border-primary bg-accent/60"
                : "border-border hover:border-primary/50 hover:bg-accent/30",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeZoneRow() {
  const { user } = useAuth();
  const { timeZone } = usePreferences();
  const [saving, setSaving] = useState(false);

  const detected = detectTimeZone();
  const mismatched = detected !== null && normaliseTimeZone(detected) !== timeZone;

  // A zone the browser reports but that is not in our short list still needs
  // to be selectable, or "use my current location" would silently do nothing.
  const options = TIME_ZONES.some((z) => z.value === timeZone)
    ? TIME_ZONES
    : [{ value: timeZone, label: timeZone }, ...TIME_ZONES];

  async function save(next: string) {
    if (!user || next === timeZone) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        timeZone: normaliseTimeZone(next),
        updatedAt: serverTimestamp(),
      });
      toast.success("Time zone updated. Your due dates follow it from now on.");
    } catch {
      toast.error("Could not save your time zone.");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">Time zone</p>
        {saving ? <Loader2 className="text-muted-foreground size-3.5 animate-spin" /> : null}
      </div>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Decides when a card counts as due today. Getting this wrong shifts every
        review date, and nothing on screen would look wrong.
      </p>

      <div className="mt-3 flex max-w-md flex-wrap items-center gap-2">
        <Select
          value={timeZone}
          onValueChange={(next) => void save(next ?? timeZone)}
          disabled={saving}
        >
          <SelectTrigger className="min-w-56 flex-1">
            {/* Same Base UI formatter requirement as the subject picker:
                without it this reads "Asia/Manila" rather than its label. */}
            <SelectValue>
              {(value: string | null) =>
                options.find((z) => z.value === value)?.label ?? value ?? ""
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((zone) => (
              <SelectItem key={zone.value} value={zone.value}>
                {zone.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm tabular-nums">
          {offsetLabel(timeZone)}
        </span>
      </div>

      {mismatched ? (
        <div className="border-warning/40 bg-warning/10 mt-3 flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <p className="min-w-0 flex-1 text-sm">
            This device says you are in <strong>{detected}</strong>, which is not
            what your reviews are scheduled against.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => save(detected)}
            disabled={saving}
          >
            <Wand2 />
            Use this device
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The Pomodoro phase lengths.
 *
 * Classic 25/5/15 is a default, not a law. Twenty-five minutes is far too long
 * for some people — a student with ADHD, or one working the twelve-minute gaps
 * between classes — and forcing the textbook number on them just means they
 * stop using the timer, which takes the study log down with it.
 */
function TimerRow() {
  const { user } = useAuth();
  const { pomodoro } = usePreferences();
  const [focus, setFocus] = useState(String(pomodoro.focus));
  const [shortBreak, setShortBreak] = useState(String(pomodoro.shortBreak));
  const [longBreak, setLongBreak] = useState(String(pomodoro.longBreak));
  const [saving, setSaving] = useState(false);

  const next = {
    focus: clampPhaseMinutes(Number(focus), pomodoro.focus),
    shortBreak: clampPhaseMinutes(Number(shortBreak), pomodoro.shortBreak),
    longBreak: clampPhaseMinutes(Number(longBreak), pomodoro.longBreak),
  };
  const dirty =
    next.focus !== pomodoro.focus ||
    next.shortBreak !== pomodoro.shortBreak ||
    next.longBreak !== pomodoro.longBreak;

  async function save() {
    if (!user || !dirty) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        pomodoroFocus: next.focus,
        pomodoroShortBreak: next.shortBreak,
        pomodoroLongBreak: next.longBreak,
        updatedAt: serverTimestamp(),
      });
      setFocus(String(next.focus));
      setShortBreak(String(next.shortBreak));
      setLongBreak(String(next.longBreak));
      toast.success("Timer updated.");
    } catch {
      toast.error("Could not save those lengths.");
    }
    setSaving(false);
  }

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    fallback: number,
  ) => (
    <div>
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={MIN_PHASE_MINUTES}
        max={MAX_PHASE_MINUTES}
        value={value}
        onChange={(e) => set(e.target.value)}
        onBlur={() => set(String(clampPhaseMinutes(Number(value), fallback)))}
        className="mt-1 w-20 tabular-nums"
      />
    </div>
  );

  return (
    <div id="timer" className="scroll-mt-20">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Timer className="text-muted-foreground size-4" />
        Focus timer
      </p>
      <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
        The timer in the sidebar. Twenty-five minutes is the classic block and
        suits plenty of people; if it does not suit you, a shorter one you
        actually finish is worth more than a long one you abandon.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {field("pomo-focus", "Focus", focus, setFocus, pomodoro.focus)}
        {field("pomo-short", "Short break", shortBreak, setShortBreak, pomodoro.shortBreak)}
        {field("pomo-long", "Long break", longBreak, setLongBreak, pomodoro.longBreak)}
        <span className="text-muted-foreground pb-2.5 text-sm">minutes</span>
        <Button size="sm" className="mb-0.5" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          Save
        </Button>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        The long break comes after every fourth focus block.
      </p>
    </div>
  );
}

function TypedRecallRow() {
  const { user } = useAuth();
  const { typedRecall } = usePreferences();
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        typedRecall: next,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error("Could not save that setting.");
    }
    setSaving(false);
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor="typed-recall" className="flex items-center gap-2">
          <Keyboard className="text-muted-foreground size-4" />
          Type the answer first
        </Label>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Reading the back and thinking &ldquo;yeah, I knew that&rdquo; is not
          the same as remembering it. Typing settles the question before you
          see it. Only on answers short enough to type, and spelling, word
          order and accents are all forgiven.
        </p>
      </div>
      <Switch
        id="typed-recall"
        checked={typedRecall}
        disabled={saving}
        onCheckedChange={(next) => void toggle(next === true)}
      />
    </div>
  );
}

function DailyGoalRow() {
  const { user } = useAuth();
  const { dailyCardGoal } = usePreferences();
  const [value, setValue] = useState(String(dailyCardGoal));
  const [saving, setSaving] = useState(false);

  const parsed = clampGoal(Number(value));
  const dirty = parsed !== dailyCardGoal;

  async function save() {
    if (!user || !dirty) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        dailyCardGoal: parsed,
        updatedAt: serverTimestamp(),
      });
      setValue(String(parsed));
      toast.success("Daily goal updated.");
    } catch {
      toast.error("Could not save your daily goal.");
    }
    setSaving(false);
  }

  return (
    <div>
      <Label htmlFor="daily-goal" className="text-sm font-medium">
        Daily card goal
      </Label>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Turns &ldquo;review everything&rdquo; into a session you can actually
        finish. Cards past this still wait for you — nothing is skipped.
      </p>

      <div className="mt-3 flex max-w-xs items-center gap-2">
        <Input
          id="daily-goal"
          type="number"
          inputMode="numeric"
          min={MIN_DAILY_CARD_GOAL}
          max={MAX_DAILY_CARD_GOAL}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setValue(String(clampGoal(Number(value))))}
          className="w-28 tabular-nums"
        />
        <span className="text-muted-foreground text-sm">cards</span>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          Save
        </Button>
      </div>
    </div>
  );
}
